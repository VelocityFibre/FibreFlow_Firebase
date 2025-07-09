#!/usr/bin/env python3
"""
Simple First Principles Duplicate Detection
One pole = One location (regardless of status)
"""

import csv
from collections import defaultdict
from datetime import datetime

def find_true_duplicates(csv_path):
    """
    First principles: A pole can only be at one physical location
    Multiple statuses at same location = OK (workflow)
    Same pole at different locations = PROBLEM
    """
    
    # Track: pole -> set of unique addresses
    pole_locations = defaultdict(set)
    
    # Track: (pole, address) -> list of all status updates
    pole_address_history = defaultdict(list)
    
    print("Reading data...")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            pole = row.get('Pole Number', '').strip()
            address = row.get('Location Address', '').strip()
            status = row.get('Status', '').strip()
            flow_history = row.get('Flow Name Groups', '').strip()
            date = row.get('Survey Date', '').strip()
            
            if pole and address:
                # Track unique locations per pole
                pole_locations[pole].add(address)
                
                # Track history at each pole-address combination
                pole_address_history[(pole, address)].append({
                    'status': status,
                    'flow_history': flow_history,
                    'date': date
                })
    
    # Analyze results
    print("\n=== ANALYSIS RESULTS ===\n")
    
    # 1. Find poles at multiple locations (TRUE DUPLICATES)
    true_duplicates = {pole: locs for pole, locs in pole_locations.items() if len(locs) > 1}
    
    print(f"1. TRUE DUPLICATE POLES (at multiple locations): {len(true_duplicates)}")
    print("   These poles appear at different physical addresses - this is the real problem!\n")
    
    # Show examples
    examples = sorted(true_duplicates.items(), key=lambda x: len(x[1]), reverse=True)[:5]
    for pole, locations in examples:
        print(f"   {pole}: appears at {len(locations)} different addresses:")
        for loc in list(locations)[:3]:
            updates = len(pole_address_history[(pole, loc)])
            print(f"      - {loc} ({updates} status updates)")
    
    # 2. Normal workflow updates (NOT duplicates)
    print(f"\n2. NORMAL WORKFLOW UPDATES (same pole, same location, multiple statuses):")
    
    # Find examples of normal workflow
    workflow_examples = []
    for (pole, address), history in pole_address_history.items():
        if len(history) > 1 and pole not in true_duplicates:
            workflow_examples.append((pole, address, history))
    
    # Show a few examples
    for pole, address, history in workflow_examples[:3]:
        print(f"\n   {pole} at {address}:")
        print(f"   Has {len(history)} status updates (this is normal!):")
        for i, update in enumerate(history[:3], 1):
            print(f"      Update {i}: {update['status']}")
    
    # 3. Summary and recommendations
    print("\n=== SUMMARY ===")
    print(f"Total poles analyzed: {len(pole_locations)}")
    print(f"Poles with location conflicts: {len(true_duplicates)} ← THESE NEED FIXING")
    print(f"Poles with normal workflow updates: {len(pole_locations) - len(true_duplicates)}")
    
    # Export true duplicates
    with open('true_duplicate_poles.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Pole Number', 'Number of Locations', 'Location 1', 'Location 2', 'Location 3', 'Action Needed'])
        
        for pole, locations in sorted(true_duplicates.items()):
            locs = list(locations)
            row = [pole, len(locations)]
            row.extend(locs[:3])  # First 3 locations
            if len(locs) < 3:
                row.extend([''] * (3 - len(locs)))  # Pad empty
            row.append('Verify correct location')
            writer.writerow(row)
    
    print(f"\n✅ Exported {len(true_duplicates)} true duplicate poles to 'true_duplicate_poles.csv'")
    print("\nNEXT STEPS:")
    print("1. Field team verifies which location is correct for each pole")
    print("2. Update incorrect records to show correct location")
    print("3. Add validation to prevent this in future")

if __name__ == "__main__":
    # Use filtered data if available
    import os
    csv_path = "Lawley_Essential.csv" if os.path.exists("Lawley_Essential.csv") else "Lawley_Project_Louis.csv"
    find_true_duplicates(csv_path)