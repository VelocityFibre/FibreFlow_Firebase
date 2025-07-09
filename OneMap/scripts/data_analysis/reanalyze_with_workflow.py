#!/usr/bin/env python3
"""
Re-analyze Lawley data understanding Flow Name Groups as workflow history
"""

import csv
import json
from collections import defaultdict
from datetime import datetime

class WorkflowAnalyzer:
    def __init__(self):
        self.properties = {}  # Property ID -> all records
        self.pole_locations = {}  # Pole -> list of unique locations
        self.workflow_patterns = defaultdict(int)
        self.true_duplicates = []
        self.workflow_updates = []
        
    def analyze_data(self, csv_file):
        """Analyze data with workflow understanding"""
        print("Loading and analyzing data with workflow understanding...")
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                prop_id = row.get('Property ID', '').strip()
                pole = row.get('Pole Number', '').strip()
                address = row.get('Location Address', '').strip()
                flow_history = row.get('Flow Name Groups', '').strip()
                status = row.get('Status', '').strip()
                date = row.get('Survey Date', '').strip()
                agent = row.get('Field Agent Name (pole permission)', '').strip()
                
                # Track property history
                if prop_id:
                    if prop_id not in self.properties:
                        self.properties[prop_id] = []
                    
                    self.properties[prop_id].append({
                        'pole': pole,
                        'address': address,
                        'flow_history': flow_history,
                        'status': status,
                        'date': date,
                        'agent': agent,
                        'workflow_depth': len(flow_history.split(',')) if flow_history else 0
                    })
                
                # Track pole locations
                if pole and address:
                    if pole not in self.pole_locations:
                        self.pole_locations[pole] = set()
                    self.pole_locations[pole].add(address)
                
                # Track workflow patterns
                if flow_history:
                    self.workflow_patterns[flow_history] += 1
        
        print(f"Loaded {len(self.properties)} unique properties")
        self._identify_true_duplicates()
        self._analyze_workflows()
        
    def _identify_true_duplicates(self):
        """Identify REAL duplicates vs workflow updates"""
        
        # 1. Find poles at multiple addresses (impossible)
        multi_location_poles = []
        for pole, addresses in self.pole_locations.items():
            if len(addresses) > 1:
                multi_location_poles.append({
                    'pole': pole,
                    'addresses': list(addresses),
                    'count': len(addresses)
                })
        
        # 2. Find same-second entries (system duplicates)
        time_duplicates = defaultdict(list)
        for prop_id, records in self.properties.items():
            for record in records:
                if record['date']:
                    time_key = f"{record['date']}_{record['address']}"
                    time_duplicates[time_key].append({
                        'property_id': prop_id,
                        'pole': record['pole'],
                        'status': record['status']
                    })
        
        same_second_dupes = []
        for time_key, entries in time_duplicates.items():
            if len(entries) > 3:  # More than 3 entries at exact same time
                same_second_dupes.append({
                    'timestamp': time_key.split('_')[0],
                    'address': time_key.split('_')[1],
                    'count': len(entries),
                    'entries': entries[:5]  # Sample
                })
        
        self.true_duplicates = {
            'multi_location_poles': sorted(multi_location_poles, key=lambda x: x['count'], reverse=True),
            'same_second_entries': sorted(same_second_dupes, key=lambda x: x['count'], reverse=True)
        }
    
    def _analyze_workflows(self):
        """Analyze workflow progressions"""
        
        # Typical workflow progressions
        workflow_stats = {
            'single_update': 0,  # Properties with only one entry
            'normal_progression': 0,  # Following expected workflow
            'complex_workflow': 0,  # Many updates
            'status_regression': 0  # Status went backwards
        }
        
        workflow_depths = defaultdict(int)
        
        for prop_id, records in self.properties.items():
            if len(records) == 1:
                workflow_stats['single_update'] += 1
            else:
                # Sort by date to see progression
                sorted_records = sorted(records, key=lambda x: x['date'] if x['date'] else '')
                
                # Check workflow depth
                max_depth = max(r['workflow_depth'] for r in records)
                workflow_depths[max_depth] += 1
                
                if max_depth > 5:
                    workflow_stats['complex_workflow'] += 1
                else:
                    workflow_stats['normal_progression'] += 1
        
        self.workflow_updates = {
            'stats': workflow_stats,
            'depth_distribution': dict(workflow_depths),
            'total_properties': len(self.properties)
        }
    
    def generate_report(self):
        """Generate comprehensive report with new understanding"""
        report = []
        report.append("# Re-Analysis: Understanding Workflow vs Duplicates")
        report.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Summary
        report.append("\n## Executive Summary")
        report.append(f"- Total Unique Properties: {len(self.properties):,}")
        report.append(f"- Total Unique Poles: {len(self.pole_locations):,}")
        report.append(f"- Properties are tracked through workflow stages, NOT duplicated")
        
        # Workflow Analysis
        report.append("\n## Workflow Analysis")
        report.append(f"- Single Update Properties: {self.workflow_updates['stats']['single_update']:,} ({self.workflow_updates['stats']['single_update']/len(self.properties)*100:.1f}%)")
        report.append(f"- Normal Workflow Progression: {self.workflow_updates['stats']['normal_progression']:,}")
        report.append(f"- Complex Workflows (>5 stages): {self.workflow_updates['stats']['complex_workflow']:,}")
        
        report.append("\n### Workflow Depth Distribution")
        for depth, count in sorted(self.workflow_updates['depth_distribution'].items()):
            report.append(f"- {depth} stages: {count:,} properties")
        
        # TRUE Duplicates
        report.append("\n## TRUE Data Quality Issues")
        
        report.append(f"\n### 1. Poles at Multiple Locations: {len(self.true_duplicates['multi_location_poles'])}")
        report.append("These are physically impossible and need investigation:")
        
        for item in self.true_duplicates['multi_location_poles'][:10]:
            report.append(f"\n**Pole {item['pole']}** appears at {item['count']} locations:")
            for addr in item['addresses'][:3]:
                report.append(f"  - {addr[:60]}...")
        
        report.append(f"\n### 2. Bulk Entry Issues: {len(self.true_duplicates['same_second_entries'])}")
        report.append("Multiple entries at exact same timestamp (likely system issues):")
        
        for item in self.true_duplicates['same_second_entries'][:5]:
            report.append(f"\n**{item['timestamp']}** - {item['count']} entries at {item['address'][:40]}...")
        
        # Address Analysis
        report.append("\n## Address Analysis (Not Duplicates!)")
        
        # Find addresses with most updates
        address_updates = defaultdict(int)
        address_poles = defaultdict(set)
        for prop_id, records in self.properties.items():
            for record in records:
                if record['address']:
                    address_updates[record['address']] += 1
                    if record['pole']:
                        address_poles[record['address']].add(record['pole'])
        
        report.append("\n### Most Active Addresses (High Update Count)")
        sorted_addresses = sorted(address_updates.items(), key=lambda x: x[1], reverse=True)[:10]
        
        for addr, count in sorted_addresses:
            pole_count = len(address_poles[addr])
            report.append(f"\n**{addr[:50]}...**")
            report.append(f"  - Total Updates: {count}")
            report.append(f"  - Unique Poles: {pole_count}")
            report.append(f"  - Type: {'Complex/Multi-unit' if pole_count > 10 else 'Standard'}")
        
        # Recommendations
        report.append("\n## Recommendations")
        report.append("\n### 1. Data Structure")
        report.append("- Keep all records as workflow history (audit trail)")
        report.append("- Create 'current_status' view using latest entry per property")
        report.append("- Flow Name Groups = Complete workflow history")
        
        report.append("\n### 2. True Issues to Fix")
        report.append(f"- Resolve {len(self.true_duplicates['multi_location_poles'])} poles appearing at multiple addresses")
        report.append(f"- Investigate {len(self.true_duplicates['same_second_entries'])} bulk entry anomalies")
        report.append("- Add field agent names to improve data quality")
        
        report.append("\n### 3. Reporting Improvements")
        report.append("- Group by Property ID for current status")
        report.append("- Show workflow progression timeline")
        report.append("- Flag only TRUE duplicates (same pole, different address)")
        
        # Save report
        with open('WORKFLOW_REANALYSIS_REPORT.md', 'w') as f:
            f.write('\n'.join(report))
        
        # Save detailed data
        analysis_data = {
            'summary': {
                'unique_properties': len(self.properties),
                'unique_poles': len(self.pole_locations),
                'workflow_stats': self.workflow_updates['stats']
            },
            'true_duplicates': self.true_duplicates,
            'workflow_patterns': {
                pattern: count for pattern, count in 
                sorted(self.workflow_patterns.items(), key=lambda x: x[1], reverse=True)[:20]
            }
        }
        
        with open('workflow_analysis_data.json', 'w') as f:
            json.dump(analysis_data, f, indent=2)
        
        print("\nReports saved:")
        print("- WORKFLOW_REANALYSIS_REPORT.md")
        print("- workflow_analysis_data.json")

def main():
    analyzer = WorkflowAnalyzer()
    analyzer.analyze_data('Lawley_Essential.csv')
    analyzer.generate_report()
    
    # Quick summary
    print("\n=== KEY FINDINGS ===")
    print(f"✓ Properties tracked through workflow: {len(analyzer.properties):,}")
    print(f"✗ Poles at multiple locations: {len(analyzer.true_duplicates['multi_location_poles'])}")
    print(f"✗ Bulk entry issues: {len(analyzer.true_duplicates['same_second_entries'])}")
    
    # Show that "1 KWENA STREET" is likely legitimate
    kwena_props = sum(1 for p, records in analyzer.properties.items() 
                     if any('1 KWENA STREET' in r['address'] for r in records))
    print(f"\n'1 KWENA STREET' involves {kwena_props} properties - likely a large complex!")

if __name__ == "__main__":
    main()