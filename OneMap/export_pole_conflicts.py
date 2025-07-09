#!/usr/bin/env python3
"""
Export Pole Conflicts for Field Verification
Identifies poles appearing at multiple physical locations
Part of OneMap MVP - Sprint 1, Day 1-2 Task
"""

import csv
import json
from collections import defaultdict
from datetime import datetime
import os

def load_data(csv_path):
    """Load CSV data and return list of records"""
    records = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records

def identify_pole_conflicts(records):
    """Find poles that appear at multiple physical locations"""
    
    pole_locations = defaultdict(set)  # Pole Number -> set of unique addresses
    pole_details = defaultdict(list)   # Pole Number -> list of all occurrences
    
    for record in records:
        pole_number = record.get('Pole Number', '').strip()
        address = record.get('Location Address', '').strip()
        
        if pole_number and address:
            # Track unique addresses per pole
            pole_locations[pole_number].add(address)
            
            # Keep detailed records for export
            pole_details[pole_number].append({
                'property_id': record.get('Property ID', '').strip(),
                'address': address,
                'status': record.get('Status', '').strip(),
                'survey_date': record.get('Survey Date', '').strip(),
                'field_agent': record.get('Field Agent Name (pole permission)', '').strip(),
                'latitude': record.get('Latitude', '').strip(),
                'longitude': record.get('Longitude', '').strip(),
                'flow_history': record.get('Flow Name Groups', '').strip()
            })
    
    # Filter to only poles with conflicts
    conflicts = {}
    for pole, addresses in pole_locations.items():
        if len(addresses) > 1:
            conflicts[pole] = {
                'addresses': list(addresses),
                'address_count': len(addresses),
                'occurrences': pole_details[pole]
            }
    
    return conflicts

def export_conflicts_csv(conflicts, output_path='pole_conflicts.csv'):
    """Export conflicts to CSV for field team verification"""
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'Pole Number',
            'Conflict Type',
            'Address Count',
            'Address 1',
            'Status at Address 1',
            'Address 2',
            'Status at Address 2', 
            'Address 3',
            'Status at Address 3',
            'All Addresses',
            'GPS Coordinates',
            'Last Updated',
            'Most Recent Status',
            'Field Agents',
            'Action Required'
        ]
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # Sort by number of conflicting addresses (worst first)
        sorted_conflicts = sorted(conflicts.items(), 
                                key=lambda x: x[1]['address_count'], 
                                reverse=True)
        
        for pole_number, data in sorted_conflicts:
            addresses = data['addresses']
            occurrences = data['occurrences']
            
            # Get unique GPS coordinates
            gps_coords = set()
            for occ in occurrences:
                if occ['latitude'] and occ['longitude']:
                    gps_coords.add(f"{occ['latitude']},{occ['longitude']}")
            
            # Get unique field agents
            agents = set()
            for occ in occurrences:
                if occ['field_agent']:
                    agents.add(occ['field_agent'])
            
            # Get most recent update and status
            dates = [occ['survey_date'] for occ in occurrences if occ['survey_date']]
            last_updated = max(dates) if dates else 'Unknown'
            
            # Get most recent status
            most_recent = None
            if dates:
                for occ in occurrences:
                    if occ['survey_date'] == last_updated:
                        most_recent = occ['status']
                        break
            
            # Create status map for each address
            address_status = {}
            for occ in occurrences:
                if occ['address'] not in address_status:
                    address_status[occ['address']] = occ['status']
                else:
                    # Keep the most recent status for each address
                    if occ['survey_date'] > address_status.get(occ['address'] + '_date', ''):
                        address_status[occ['address']] = occ['status']
            
            row = {
                'Pole Number': pole_number,
                'Conflict Type': 'Multiple Locations',
                'Address Count': data['address_count'],
                'All Addresses': ' | '.join(addresses),
                'GPS Coordinates': ' | '.join(gps_coords) if gps_coords else 'Not Available',
                'Last Updated': last_updated,
                'Most Recent Status': most_recent or 'Unknown',
                'Field Agents': ' | '.join(agents) if agents else 'Not Recorded',
                'Action Required': 'Field Verification Needed'
            }
            
            # Add individual addresses with their statuses
            for i, addr in enumerate(addresses[:3], 1):
                row[f'Address {i}'] = addr
                row[f'Status at Address {i}'] = address_status.get(addr, 'Unknown')
            
            writer.writerow(row)
    
    print(f"✓ Exported {len(conflicts)} pole conflicts to {output_path}")

def export_field_checklist(conflicts, output_path='field_verification_checklist.csv'):
    """Create a simplified checklist for field teams"""
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'Pole Number',
            'Primary Address',
            'Conflicting Addresses',
            'GPS Available',
            'Verified Location',
            'Verified GPS',
            'Verified By',
            'Verification Date',
            'Notes'
        ]
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # Sort by pole number for systematic field work
        sorted_conflicts = sorted(conflicts.items())
        
        for pole_number, data in sorted_conflicts:
            addresses = data['addresses']
            occurrences = data['occurrences']
            
            # Check if GPS available
            has_gps = any(occ['latitude'] and occ['longitude'] for occ in occurrences)
            
            row = {
                'Pole Number': pole_number,
                'Primary Address': addresses[0] if addresses else '',
                'Conflicting Addresses': ' | '.join(addresses[1:]) if len(addresses) > 1 else '',
                'GPS Available': 'Yes' if has_gps else 'No',
                'Verified Location': '',  # To be filled by field team
                'Verified GPS': '',       # To be filled by field team
                'Verified By': '',        # To be filled by field team
                'Verification Date': '',  # To be filled by field team
                'Notes': ''              # To be filled by field team
            }
            
            writer.writerow(row)
    
    print(f"✓ Created field checklist with {len(conflicts)} poles to verify")

def export_detailed_json(conflicts, output_path='pole_conflicts_detailed.json'):
    """Export detailed conflict data for further analysis"""
    
    export_data = {
        'generated': datetime.now().isoformat(),
        'summary': {
            'total_conflicts': len(conflicts),
            'poles_affected': list(conflicts.keys())[:100],  # First 100 for preview
            'worst_conflicts': []
        },
        'conflicts': conflicts
    }
    
    # Identify worst conflicts
    sorted_conflicts = sorted(conflicts.items(), 
                            key=lambda x: x[1]['address_count'], 
                            reverse=True)
    
    for pole, data in sorted_conflicts[:10]:
        export_data['summary']['worst_conflicts'].append({
            'pole': pole,
            'locations': data['address_count'],
            'addresses': data['addresses'][:3]  # First 3 addresses
        })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"✓ Exported detailed JSON to {output_path}")

def generate_summary_report(conflicts):
    """Generate summary report of conflicts"""
    
    report = []
    report.append("# Pole Location Conflicts - Export Summary")
    report.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"\n## Overview")
    report.append(f"- Total poles with conflicts: {len(conflicts)}")
    
    # Analyze conflict severity
    severity_counts = defaultdict(int)
    for pole, data in conflicts.items():
        count = data['address_count']
        if count >= 5:
            severity_counts['Critical (5+ locations)'] += 1
        elif count >= 3:
            severity_counts['High (3-4 locations)'] += 1
        else:
            severity_counts['Medium (2 locations)'] += 1
    
    report.append(f"\n## Conflict Severity")
    for severity, count in sorted(severity_counts.items()):
        report.append(f"- {severity}: {count} poles")
    
    # Top conflicts
    report.append(f"\n## Top 10 Conflicts")
    sorted_conflicts = sorted(conflicts.items(), 
                            key=lambda x: x[1]['address_count'], 
                            reverse=True)
    
    for pole, data in sorted_conflicts[:10]:
        report.append(f"\n**{pole}**: {data['address_count']} locations")
        for i, addr in enumerate(data['addresses'][:3], 1):
            report.append(f"  {i}. {addr}")
        if data['address_count'] > 3:
            report.append(f"  ... and {data['address_count'] - 3} more")
    
    report.append(f"\n## Export Files Created")
    report.append("1. `pole_conflicts.csv` - Full conflict details")
    report.append("2. `field_verification_checklist.csv` - Field team checklist")
    report.append("3. `pole_conflicts_detailed.json` - Complete data for analysis")
    report.append("4. `pole_conflicts_summary.md` - This summary report")
    
    report.append(f"\n## Next Steps")
    report.append("1. Share `field_verification_checklist.csv` with field team")
    report.append("2. Verify actual pole locations on-site")
    report.append("3. Update records with verified locations")
    report.append("4. Implement validation to prevent future conflicts")
    
    return "\n".join(report)

def main():
    """Main execution function"""
    
    # Check for data file
    csv_path = "Lawley_Essential.csv"
    if not os.path.exists(csv_path):
        csv_path = "Lawley_Project_Louis.csv"
        if not os.path.exists(csv_path):
            print("❌ Error: No data file found. Please ensure Lawley_Essential.csv or Lawley_Project_Louis.csv exists.")
            return
    
    print(f"Loading data from {csv_path}...")
    records = load_data(csv_path)
    print(f"✓ Loaded {len(records)} records")
    
    # Identify conflicts
    print("\nIdentifying pole location conflicts...")
    conflicts = identify_pole_conflicts(records)
    print(f"✓ Found {len(conflicts)} poles at multiple locations")
    
    # Export in multiple formats
    print("\nExporting conflict data...")
    
    # 1. Main export for analysis
    export_conflicts_csv(conflicts)
    
    # 2. Field team checklist
    export_field_checklist(conflicts)
    
    # 3. Detailed JSON for developers
    export_detailed_json(conflicts)
    
    # 4. Summary report
    summary = generate_summary_report(conflicts)
    with open('pole_conflicts_summary.md', 'w') as f:
        f.write(summary)
    print("✓ Created summary report")
    
    print("\n✅ Export complete! Files created:")
    print("  - pole_conflicts.csv (main export)")
    print("  - field_verification_checklist.csv (for field team)")
    print("  - pole_conflicts_detailed.json (for developers)")
    print("  - pole_conflicts_summary.md (summary report)")
    
    # Quick stats
    if conflicts:
        worst = max(conflicts.items(), key=lambda x: x[1]['address_count'])
        print(f"\n📊 Quick Stats:")
        print(f"  - Worst conflict: {worst[0]} at {worst[1]['address_count']} locations")
        print(f"  - Average locations per conflicted pole: {sum(c['address_count'] for c in conflicts.values()) / len(conflicts):.1f}")

if __name__ == "__main__":
    main()