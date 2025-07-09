#!/usr/bin/env python3
"""
Workflow and Data Quality Analysis for Lawley Fiber Project
Analyzes workflow progression and identifies data quality issues
Updated to understand workflow tracking vs true duplicates
"""

import csv
import json
from collections import defaultdict
from datetime import datetime

def load_data(csv_path):
    """Load CSV data and return list of records"""
    records = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records

def analyze_workflow_and_issues(records):
    """Analyze records understanding workflow progression and identify real issues"""
    
    # Track workflow progressions
    property_workflows = defaultdict(list)  # Property ID -> list of updates
    pole_locations = defaultdict(set)       # Pole Number -> set of addresses
    address_activity = defaultdict(list)    # Address -> list of records
    
    # Data quality tracking
    missing_field_agents = 0
    missing_status = 0
    bulk_entries = defaultdict(list)
    
    for idx, record in enumerate(records):
        # Skip empty records
        if not record.get('Property ID'):
            continue
            
        prop_id = record.get('Property ID', '').strip()
        address = record.get('Location Address', '').strip()
        pole_number = record.get('Pole Number', '').strip()
        status = record.get('Status', '').strip()
        flow_history = record.get('Flow Name Groups', '').strip()
        field_agent = record.get('Field Agent Name (pole permission)', '').strip()
        survey_date = record.get('Survey Date', '').strip()
        
        # Track property workflow
        if prop_id:
            property_workflows[prop_id].append({
                'index': idx,
                'status': status,
                'flow_history': flow_history,
                'date': survey_date,
                'pole_number': pole_number,
                'address': address,
                'field_agent': field_agent
            })
        
        # Track pole locations (this identifies real issues)
        if pole_number and address:
            pole_locations[pole_number].add(address)
            
        # Track address activity (not duplicates, but workflow)
        if address:
            address_activity[address].append({
                'property_id': prop_id,
                'pole_number': pole_number,
                'status': status,
                'date': survey_date
            })
        
        # Track data quality issues
        if not field_agent:
            missing_field_agents += 1
        if not status:
            missing_status += 1
            
        # Track bulk entries (same timestamp)
        if survey_date:
            bulk_entries[survey_date].append({
                'property_id': prop_id,
                'address': address
            })
    
    # Identify REAL issues
    issues = {
        'pole_conflicts': {},      # Poles at multiple locations
        'bulk_entries': {},        # Same timestamp entries
        'data_quality': {},        # Missing data
        'workflow_summary': {},    # Workflow statistics
        'address_activity': {}     # High activity addresses
    }
    
    # Find poles at multiple locations (real problem)
    for pole, addresses in pole_locations.items():
        if len(addresses) > 1:
            issues['pole_conflicts'][pole] = {
                'locations': list(addresses),
                'count': len(addresses)
            }
    
    # Find bulk entries (potential system issues)
    for timestamp, entries in bulk_entries.items():
        if len(entries) > 3:  # More than 3 at exact same time
            issues['bulk_entries'][timestamp] = {
                'count': len(entries),
                'sample': entries[:5]
            }
    
    # Data quality summary
    issues['data_quality'] = {
        'total_records': len(records),
        'missing_field_agents': missing_field_agents,
        'missing_field_agents_pct': (missing_field_agents / len(records)) * 100 if records else 0,
        'missing_status': missing_status,
        'missing_status_pct': (missing_status / len(records)) * 100 if records else 0
    }
    
    # Workflow summary
    issues['workflow_summary'] = {
        'total_properties': len(property_workflows),
        'properties_with_single_update': sum(1 for p in property_workflows.values() if len(p) == 1),
        'properties_with_multiple_updates': sum(1 for p in property_workflows.values() if len(p) > 1),
        'max_updates_single_property': max(len(p) for p in property_workflows.values()) if property_workflows else 0
    }
    
    # High activity addresses (not duplicates, just busy locations)
    for address, activities in address_activity.items():
        if len(activities) > 10:  # Addresses with significant activity
            unique_poles = set(a['pole_number'] for a in activities if a['pole_number'])
            issues['address_activity'][address] = {
                'total_updates': len(activities),
                'unique_poles': len(unique_poles),
                'pole_list': list(unique_poles)[:10]  # First 10 poles
            }
    
    return issues, property_workflows

def generate_report(issues):
    """Generate a report focused on real issues, not workflow updates"""
    report = []
    report.append("# Workflow and Data Quality Analysis for Lawley Fiber Project")
    report.append(f"\nGenerated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("\n**Note**: Multiple entries per address/property are NORMAL workflow updates, not duplicates.")
    
    # Summary
    report.append("\n## Executive Summary")
    report.append(f"- Total Records: {issues['data_quality']['total_records']:,}")
    report.append(f"- Unique Properties Tracked: {issues['workflow_summary']['total_properties']:,}")
    report.append(f"- **CRITICAL**: {len(issues['pole_conflicts'])} poles appear at multiple physical locations")
    
    # Real Issues Section
    report.append("\n## 🚨 Critical Issues Requiring Resolution")
    
    # Pole conflicts
    report.append(f"\n### 1. Pole Location Conflicts ({len(issues['pole_conflicts'])} poles)")
    report.append("These poles appear at multiple addresses, which is physically impossible:")
    
    sorted_conflicts = sorted(issues['pole_conflicts'].items(), 
                            key=lambda x: x[1]['count'], reverse=True)[:20]
    
    for pole, data in sorted_conflicts:
        report.append(f"\n**{pole}**: Appears at {data['count']} locations")
        for loc in data['locations'][:3]:
            report.append(f"  - {loc[:60]}...")
        if data['count'] > 3:
            report.append(f"  - ... and {data['count'] - 3} more locations")
    
    # Bulk entries
    report.append(f"\n### 2. Bulk Entry Anomalies ({len(issues['bulk_entries'])} timestamps)")
    report.append("Multiple entries at exact same timestamp (potential system issues):")
    
    sorted_bulk = sorted(issues['bulk_entries'].items(), 
                        key=lambda x: x[1]['count'], reverse=True)[:10]
    
    for timestamp, data in sorted_bulk:
        report.append(f"\n**{timestamp}**: {data['count']} entries")
        if data['sample']:
            report.append(f"  Sample address: {data['sample'][0]['address'][:50]}...")
    
    # Data quality
    report.append("\n### 3. Data Quality Issues")
    dq = issues['data_quality']
    report.append(f"- Missing Field Agent Names: {dq['missing_field_agents']:,} ({dq['missing_field_agents_pct']:.1f}%)")
    report.append(f"- Missing Status: {dq['missing_status']:,} ({dq['missing_status_pct']:.1f}%)")
    
    # Workflow Information (Not Issues)
    report.append("\n## ℹ️ Workflow Activity (Normal Operation)")
    ws = issues['workflow_summary']
    report.append(f"- Properties with single update: {ws['properties_with_single_update']:,}")
    report.append(f"- Properties with multiple updates: {ws['properties_with_multiple_updates']:,} (This is normal!)")
    report.append(f"- Maximum updates for one property: {ws['max_updates_single_property']}")
    
    # High activity addresses
    report.append("\n### High Activity Addresses")
    report.append("These addresses have many updates (could be complexes or high-density areas):")
    
    sorted_addresses = sorted(issues['address_activity'].items(), 
                            key=lambda x: x[1]['total_updates'], reverse=True)[:10]
    
    for address, data in sorted_addresses:
        report.append(f"\n**{address[:50]}...**")
        report.append(f"  - Total workflow updates: {data['total_updates']}")
        report.append(f"  - Unique poles: {data['unique_poles']}")
        if data['unique_poles'] > 10:
            report.append(f"  - Likely a large complex or development")
    
    # Recommendations
    report.append("\n## 📋 Recommendations")
    report.append("\n1. **Immediate Action Required**:")
    report.append(f"   - Resolve {len(issues['pole_conflicts'])} pole location conflicts")
    report.append("   - Investigate bulk entry timestamps")
    report.append("   - Require field agent names for all entries")
    
    report.append("\n2. **Data Understanding**:")
    report.append("   - Multiple entries per address = Normal workflow progression")
    report.append("   - High pole count addresses = Likely complexes")
    report.append("   - Focus only on pole-location conflicts as true 'duplicates'")
    
    return "\n".join(report)

def main():
    # Load data
    csv_path = "Lawley_Project_Louis.csv"
    
    # Check if filtered version exists
    import os
    if os.path.exists("Lawley_Essential.csv"):
        csv_path = "Lawley_Essential.csv"
        print("Using filtered data (Lawley_Essential.csv)...")
    else:
        print("Using full data (Lawley_Project_Louis.csv)...")
    
    print("Loading data...")
    records = load_data(csv_path)
    print(f"Loaded {len(records)} records")
    
    # Analyze with workflow understanding
    print("Analyzing workflow and data quality...")
    issues, workflows = analyze_workflow_and_issues(records)
    
    # Generate report
    print("Generating report...")
    report = generate_report(issues)
    
    # Save report
    with open("workflow_analysis_report.md", "w") as f:
        f.write(report)
    
    # Save detailed JSON for further analysis
    analysis_data = {
        'issues': issues,
        'summary': {
            'total_records': issues['data_quality']['total_records'],
            'pole_conflicts': len(issues['pole_conflicts']),
            'bulk_entries': len(issues['bulk_entries']),
            'high_activity_addresses': len(issues['address_activity'])
        },
        'generated': datetime.now().isoformat()
    }
    
    with open("workflow_analysis_data.json", "w") as f:
        json.dump(analysis_data, f, indent=2)
    
    print("\nAnalysis complete!")
    print(f"Report saved to: workflow_analysis_report.md")
    print(f"Detailed data saved to: workflow_analysis_data.json")
    
    # Print key findings
    print(f"\n🔑 Key Findings:")
    print(f"- Properties tracked: {issues['workflow_summary']['total_properties']:,}")
    print(f"- ⚠️ Pole conflicts: {len(issues['pole_conflicts'])}")
    print(f"- ⚠️ Missing field agents: {issues['data_quality']['missing_field_agents_pct']:.1f}%")
    print(f"- ℹ️ High activity addresses: {len(issues['address_activity'])}")

if __name__ == "__main__":
    main()