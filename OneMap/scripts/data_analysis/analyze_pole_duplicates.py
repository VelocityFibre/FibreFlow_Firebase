#!/usr/bin/env python3
"""
Analyze duplicate pole numbers across the dataset
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

def analyze_pole_duplicates():
    """Find and analyze duplicate pole numbers"""
    
    # Track all pole numbers and their occurrences
    pole_index = defaultdict(list)
    total_records = 0
    records_with_poles = 0
    
    # Read the filtered CSV
    with open('Lawley_Essential.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            total_records += 1
            pole_number = row.get('Pole Number', '').strip()
            
            if pole_number:
                records_with_poles += 1
                pole_index[pole_number].append({
                    'property_id': row.get('Property ID', ''),
                    'address': row.get('Location Address', ''),
                    'status': row.get('Status', ''),
                    'survey_date': row.get('Survey Date', ''),
                    'field_agent': row.get('Field Agent Name (pole permission)', '')
                })
    
    # Find duplicates
    duplicate_poles = {pole: records for pole, records in pole_index.items() if len(records) > 1}
    
    # Generate report
    report = []
    report.append("# Pole Number Duplicate Analysis")
    report.append(f"\nTotal Records: {total_records:,}")
    report.append(f"Records with Pole Numbers: {records_with_poles:,} ({records_with_poles/total_records*100:.1f}%)")
    report.append(f"Unique Pole Numbers: {len(pole_index):,}")
    report.append(f"Duplicate Pole Numbers: {len(duplicate_poles):,}")
    
    if duplicate_poles:
        report.append(f"\n## Duplicate Rate: {len(duplicate_poles)/len(pole_index)*100:.1f}% of poles have duplicates")
        
        # Sort by most duplicates
        sorted_dupes = sorted(duplicate_poles.items(), key=lambda x: len(x[1]), reverse=True)
        
        report.append("\n## Top 20 Most Duplicated Pole Numbers")
        for pole, records in sorted_dupes[:20]:
            report.append(f"\n### Pole: {pole}")
            report.append(f"**Occurrences: {len(records)}**")
            
            # Check if same address or different
            unique_addresses = set(r['address'] for r in records)
            report.append(f"Unique Addresses: {len(unique_addresses)}")
            
            if len(unique_addresses) == 1:
                report.append("⚠️ **SAME ADDRESS** - Potential true duplicate!")
            
            # Show details
            report.append("\nDetails:")
            for i, record in enumerate(records[:5]):  # Show first 5
                report.append(f"{i+1}. Property ID: {record['property_id']}")
                report.append(f"   Address: {record['address'][:60]}...")
                report.append(f"   Status: {record['status']}")
                report.append(f"   Date: {record['survey_date']}")
                report.append(f"   Agent: {record['field_agent']}")
                report.append("")
            
            if len(records) > 5:
                report.append(f"   ... and {len(records)-5} more occurrences")
        
        # Analyze patterns
        report.append("\n## Duplicate Patterns Analysis")
        
        # Same address duplicates
        same_address_dupes = []
        different_address_dupes = []
        
        for pole, records in duplicate_poles.items():
            unique_addrs = set(r['address'] for r in records)
            if len(unique_addrs) == 1:
                same_address_dupes.append((pole, records))
            else:
                different_address_dupes.append((pole, records, unique_addrs))
        
        report.append(f"\n### Same Address Duplicates: {len(same_address_dupes)}")
        report.append("These poles appear multiple times at the SAME address (likely errors):")
        
        for pole, records in same_address_dupes[:10]:
            report.append(f"\n**{pole}** - {len(records)} times at {records[0]['address'][:50]}...")
            # Check if different property IDs
            prop_ids = set(r['property_id'] for r in records)
            if len(prop_ids) > 1:
                report.append(f"  - Different Property IDs: {prop_ids}")
        
        report.append(f"\n### Different Address Duplicates: {len(different_address_dupes)}")
        report.append("These poles appear at DIFFERENT addresses (likely data quality issue):")
        
        for pole, records, addrs in different_address_dupes[:10]:
            report.append(f"\n**{pole}** appears at {len(addrs)} different addresses:")
            for addr in list(addrs)[:3]:
                report.append(f"  - {addr[:60]}...")
    
    else:
        report.append("\n## ✅ NO DUPLICATE POLE NUMBERS FOUND!")
    
    # Save report
    with open('POLE_DUPLICATE_ANALYSIS.md', 'w') as f:
        f.write('\n'.join(report))
    
    # Save JSON data
    json_data = {
        'total_records': total_records,
        'records_with_poles': records_with_poles,
        'unique_poles': len(pole_index),
        'duplicate_poles': len(duplicate_poles),
        'duplicate_details': {
            pole: {
                'count': len(records),
                'unique_addresses': len(set(r['address'] for r in records)),
                'records': records
            }
            for pole, records in list(duplicate_poles.items())[:100]  # Top 100
        }
    }
    
    with open('pole_duplicate_data.json', 'w') as f:
        json.dump(json_data, f, indent=2)
    
    print(f"\nPole Duplicate Analysis Complete!")
    print(f"- Unique Poles: {len(pole_index):,}")
    print(f"- Duplicate Poles: {len(duplicate_poles):,}")
    if duplicate_poles:
        print(f"- Duplicate Rate: {len(duplicate_poles)/len(pole_index)*100:.1f}%")
        print(f"- Same Address Duplicates: {len(same_address_dupes)}")
        print(f"- Different Address Duplicates: {len(different_address_dupes)}")
    print(f"\nReport saved to: POLE_DUPLICATE_ANALYSIS.md")

if __name__ == "__main__":
    analyze_pole_duplicates()