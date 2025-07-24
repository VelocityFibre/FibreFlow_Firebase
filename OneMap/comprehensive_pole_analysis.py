#!/usr/bin/env python3
"""
Comprehensive Pole Analysis Script
Date: 2025-07-23

Purpose: Reproduce the exact calculations from the pole_status_analysis_2025-07-23.md report
to understand how "drops per pole" is calculated and identify any discrepancies.
"""

import csv
from collections import defaultdict

def analyze_pole_data():
    """Analyze pole data and generate comprehensive statistics"""
    
    # Data structures
    pole_drops = defaultdict(set)  # pole -> set of unique drop numbers
    drop_poles = defaultdict(set)  # drop -> set of poles it appears with
    status_counts = defaultdict(int)
    total_records = 0
    records_with_poles = 0
    records_with_drops = 0
    
    filename = '/home/ldp/VF/Apps/FibreFlow/OneMap/split_data/2025-07-21/Lawley July Week 4 21072025_pole_records.csv'
    
    print("=== ANALYZING CSV FILE ===")
    print(f"File: {filename}")
    
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter=';')
        header = next(reader)
        
        print(f"CSV Columns: {len(header)}")
        if len(header) > 17:
            print(f"Pole Number column (16): {header[16]}")
            print(f"Drop Number column (17): {header[17]}")
        
        for row in reader:
            total_records += 1
            
            if len(row) > 17:
                pole = row[16].strip()  # Column 17 (0-indexed)
                drop = row[17].strip()  # Column 18 (0-indexed)  
                status = row[3].strip() # Status column
                
                # Count status
                status_counts[status] += 1
                
                # Track records with pole numbers
                if pole and pole != 'empty' and pole != '':
                    records_with_poles += 1
                    
                # Track records with drop numbers  
                if drop and drop != 'empty' and drop != '' and drop != 'no drop allocated':
                    records_with_drops += 1
                
                # For pole-drop relationship analysis
                if pole and drop and pole != 'empty' and drop != 'empty' and drop != 'no drop allocated':
                    pole_drops[pole].add(drop)
                    drop_poles[drop].add(pole)
    
    print(f"\n=== BASIC STATISTICS ===")
    print(f"Total records: {total_records}")
    print(f"Records with pole numbers: {records_with_poles}")
    print(f"Records with drop numbers: {records_with_drops}")
    print(f"Unique poles: {len(pole_drops)}")
    
    # Calculate drops per pole
    total_drops_assigned = sum(len(drops) for drops in pole_drops.values())
    if len(pole_drops) > 0:
        avg_drops_per_pole = total_drops_assigned / len(pole_drops)
        print(f"Total drops assigned: {total_drops_assigned}")
        print(f"Average drops per pole: {avg_drops_per_pole:.2f}")
    
    print(f"\n=== POLE CAPACITY DISTRIBUTION ===")
    capacity_distribution = defaultdict(int)
    for pole, drops in pole_drops.items():
        drop_count = len(drops)
        capacity_distribution[drop_count] += 1
    
    for drop_count in sorted(capacity_distribution.keys()):
        pole_count = capacity_distribution[drop_count]
        percentage = (pole_count / len(pole_drops)) * 100 if len(pole_drops) > 0 else 0
        print(f"{drop_count} drop{'s' if drop_count != 1 else ''}: {pole_count} poles ({percentage:.1f}%)")
    
    print(f"\n=== TOP 20 POLES BY DROP COUNT ===")
    sorted_poles = sorted(pole_drops.items(), key=lambda x: len(x[1]), reverse=True)[:20]
    for i, (pole, drops) in enumerate(sorted_poles, 1):
        print(f"{i:2d}. {pole}: {len(drops)} unique drops")
        if len(drops) > 12:
            print(f"    ⚠️  OVER CAPACITY: {sorted(list(drops))}")
    
    print(f"\n=== OVER-CAPACITY ANALYSIS ===")
    over_capacity_poles = [pole for pole, drops in pole_drops.items() if len(drops) > 12]
    print(f"Poles exceeding 12-drop capacity: {len(over_capacity_poles)}")
    
    if over_capacity_poles:
        for pole in over_capacity_poles:
            drops = pole_drops[pole]
            print(f"  {pole}: {len(drops)} drops - {sorted(list(drops))}")
    
    print(f"\n=== DROP UNIQUENESS ANALYSIS ===")
    duplicate_drops = 0
    multi_pole_drops = []
    
    for drop, poles in drop_poles.items():
        if len(poles) > 1:
            duplicate_drops += 1
            if drop != 'no drop allocated':  # Skip the obvious non-unique ones
                multi_pole_drops.append((drop, list(poles)))
    
    print(f"Drop numbers appearing with multiple poles: {duplicate_drops}")
    if duplicate_drops == 0:
        print("✅ All drop numbers are unique to their poles")
    else:
        print(f"❌ Found {duplicate_drops} drop numbers that appear with multiple poles")
        
        # Show first 20 examples (excluding 'no drop allocated')
        real_duplicates = [item for item in multi_pole_drops if item[0] != 'no drop allocated'][:20]
        if real_duplicates:
            print(f"\nFirst 20 examples of drop duplication:")
            for drop, poles in real_duplicates:
                print(f"  {drop}: appears with {len(poles)} poles - {sorted(poles)}")
    
    print(f"\n=== STATUS BREAKDOWN ===")
    for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_records) * 100 if total_records > 0 else 0
        print(f"{status}: {count} records ({percentage:.1f}%)")
    
    print(f"\n=== REPORT COMPARISON ===")
    print("Comparing with pole_status_analysis_2025-07-23.md:")
    print(f"  Report claims: 10,352 total records")
    print(f"  Actual count: {total_records}")
    print(f"  Report claims: 3,771 unique poles")  
    print(f"  Actual count: {len(pole_drops)}")
    print(f"  Report claims: 2.74 average drops per pole")
    if len(pole_drops) > 0:
        print(f"  Actual average: {avg_drops_per_pole:.2f}")
    
    # Look for the specific poles mentioned in report
    print(f"\n=== CHECKING SPECIFIC POLES FROM REPORT ===")
    report_poles = {
        'LAW.P.A788': 16,
        'LAW.P.D766': 13, 
        'LAW.P.C546': 13,
        'LAW.P.C130': 13,
        'LAW.P.A757': 13,
        'LAW.P.A013': 13
    }
    
    for pole, expected_drops in report_poles.items():
        if pole in pole_drops:
            actual_drops = len(pole_drops[pole])
            print(f"  {pole}: Report says {expected_drops} drops, actual: {actual_drops}")
            if actual_drops != expected_drops:
                print(f"    ❌ DISCREPANCY! Expected {expected_drops}, got {actual_drops}")
            else:
                print(f"    ✅ Match")
        else:
            print(f"  {pole}: Not found in data")

if __name__ == "__main__":
    analyze_pole_data()