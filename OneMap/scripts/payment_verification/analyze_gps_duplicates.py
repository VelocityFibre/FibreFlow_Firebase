#!/usr/bin/env python3
"""
GPS-Based Duplicate Pole Permission Analysis
Purpose: Identify duplicate payment claims using GPS coordinates
Context: High-density informal settlements where addresses are unreliable
"""

import csv
import json
from collections import defaultdict
from datetime import datetime
import math

class GPSDuplicateAnalyzer:
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.pole_permissions = defaultdict(list)
        self.analysis_results = {
            'timestamp': datetime.now().isoformat(),
            'purpose': 'GPS-based duplicate pole permission analysis for payment verification',
            'context': 'High-density informal settlements - addresses unreliable, GPS is truth'
        }
        
    def load_pole_permissions(self):
        """Load only pole permission records"""
        total_records = 0
        permission_records = 0
        missing_gps = 0
        missing_agent = 0
        
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                total_records += 1
                
                # Only process pole permissions
                if 'Pole Permission: Approved' in row.get('Status', ''):
                    permission_records += 1
                    
                    pole = row.get('Pole Number', '').strip()
                    if not pole:
                        continue
                    
                    # Extract data
                    lat = row.get('Latitude', '').strip()
                    lon = row.get('Longitude', '').strip()
                    agent = row.get('Field Agent Name (pole permission)', '').strip()
                    
                    if not lat or not lon:
                        missing_gps += 1
                    if not agent:
                        missing_agent += 1
                    
                    permission_data = {
                        'property_id': row.get('Property ID', '').strip(),
                        'agent': agent,
                        'date': row.get('Survey Date', '').strip(),
                        'latitude': lat,
                        'longitude': lon,
                        'address': row.get('Location Address', '').strip()[:100],  # Keep for reference
                        'has_gps': bool(lat and lon),
                        'has_agent': bool(agent)
                    }
                    
                    self.pole_permissions[pole].append(permission_data)
        
        print(f"✓ Loaded {permission_records} pole permissions from {total_records} total records")
        print(f"  - Records missing GPS: {missing_gps} ({missing_gps/permission_records*100:.1f}%)")
        print(f"  - Records missing agent: {missing_agent} ({missing_agent/permission_records*100:.1f}%)")
        
        self.analysis_results['data_quality'] = {
            'total_records': total_records,
            'permission_records': permission_records,
            'missing_gps': missing_gps,
            'missing_agent': missing_agent
        }
        
    def calculate_gps_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two GPS points in meters"""
        try:
            # Convert to float
            lat1, lon1 = float(lat1), float(lon1)
            lat2, lon2 = float(lat2), float(lon2)
            
            # Haversine formula
            R = 6371000  # Earth radius in meters
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            delta_phi = math.radians(lat2 - lat1)
            delta_lambda = math.radians(lon2 - lon1)
            
            a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            return R * c
        except:
            return None
    
    def analyze_duplicates(self):
        """Analyze duplicate pole permissions"""
        print("\n=== ANALYZING DUPLICATE POLE PERMISSIONS ===")
        
        duplicate_analysis = []
        
        for pole, permissions in self.pole_permissions.items():
            if len(permissions) > 1:
                # Extract unique agents
                agents = [p['agent'] for p in permissions if p['agent']]
                unique_agents = list(set(agents))
                
                # Check GPS consistency
                gps_locations = [(p['latitude'], p['longitude']) for p in permissions if p['has_gps']]
                unique_gps = list(set(gps_locations))
                
                # Calculate max GPS distance if multiple GPS points
                max_distance = 0
                if len(unique_gps) > 1:
                    for i in range(len(unique_gps)):
                        for j in range(i+1, len(unique_gps)):
                            dist = self.calculate_gps_distance(
                                unique_gps[i][0], unique_gps[i][1],
                                unique_gps[j][0], unique_gps[j][1]
                            )
                            if dist and dist > max_distance:
                                max_distance = dist
                
                # Determine risk level
                risk = 'LOW'
                if len(unique_agents) > 1:
                    risk = 'HIGH'
                elif len(unique_agents) == 1 and len(permissions) > 2:
                    risk = 'MEDIUM'
                elif not agents:
                    risk = 'NO_AGENT'
                
                duplicate_analysis.append({
                    'pole': pole,
                    'permission_count': len(permissions),
                    'unique_agents': unique_agents,
                    'agent_count': len(unique_agents),
                    'gps_location_count': len(unique_gps),
                    'max_gps_distance': round(max_distance, 2),
                    'risk': risk,
                    'permissions': permissions
                })
        
        # Sort by risk and agent count
        duplicate_analysis.sort(key=lambda x: (
            x['risk'] == 'HIGH',
            x['agent_count'],
            x['permission_count']
        ), reverse=True)
        
        self.analysis_results['duplicate_summary'] = {
            'total_poles_with_duplicates': len(duplicate_analysis),
            'high_risk_count': sum(1 for d in duplicate_analysis if d['risk'] == 'HIGH'),
            'medium_risk_count': sum(1 for d in duplicate_analysis if d['risk'] == 'MEDIUM'),
            'no_agent_count': sum(1 for d in duplicate_analysis if d['risk'] == 'NO_AGENT')
        }
        
        return duplicate_analysis
    
    def generate_reports(self, duplicate_analysis):
        """Generate payment verification reports"""
        print("\n=== GENERATING REPORTS ===")
        
        # 1. High Risk Payment Conflicts (Multiple Agents)
        high_risk = [d for d in duplicate_analysis if d['risk'] == 'HIGH']
        
        print(f"\n🚨 HIGH RISK: {len(high_risk)} poles with multiple agents")
        
        # Create detailed CSV report
        report_date = datetime.now().strftime('%Y-%m-%d')
        with open(f'reports/{report_date}_payment_conflicts_detailed.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Pole Number', 'Agent Name', 'Permission Date', 'Property ID',
                           'Latitude', 'Longitude', 'Address Sample', 'Risk Level',
                           'Total Claims', 'Unique Agents', 'Action Required'])
            
            for dup in duplicate_analysis:
                for perm in dup['permissions']:
                    writer.writerow([
                        dup['pole'],
                        perm['agent'] or 'NO AGENT RECORDED',
                        perm['date'][:10] if perm['date'] else 'NO DATE',
                        perm['property_id'],
                        perm['latitude'] or 'NO GPS',
                        perm['longitude'] or 'NO GPS',
                        perm['address'][:50],
                        dup['risk'],
                        dup['permission_count'],
                        dup['agent_count'],
                        'HOLD PAYMENT - VERIFY' if dup['risk'] == 'HIGH' else 'REVIEW'
                    ])
        
        print(f"✓ Saved: reports/{report_date}_payment_conflicts_detailed.csv")
        
        # 2. High Risk Summary for Management
        high_risk_summary = []
        for hr in high_risk[:50]:  # Top 50
            high_risk_summary.append({
                'pole_number': hr['pole'],
                'agents_involved': hr['unique_agents'],
                'claim_dates': [p['date'][:10] for p in hr['permissions'] if p['date']],
                'gps_locations': hr['gps_location_count'],
                'max_distance_meters': hr['max_gps_distance'],
                'total_claims': hr['permission_count']
            })
        
        with open(f'reports/{report_date}_high_risk_payment_summary.json', 'w') as f:
            json.dump({
                'report_date': datetime.now().isoformat(),
                'high_risk_poles': high_risk_summary,
                'summary': self.analysis_results['duplicate_summary'],
                'recommendations': {
                    'immediate': f"Hold payment for {len(high_risk)} poles pending verification",
                    'contact': "Reach out to agents with multiple conflicting claims",
                    'process': "Require GPS validation for all future pole permissions"
                }
            }, f, indent=2)
        
        print(f"✓ Saved: reports/{report_date}_high_risk_payment_summary.json")
        
        # 3. Agent Conflict Summary
        agent_conflicts = defaultdict(lambda: {
            'poles': [],
            'total_conflicts': 0,
            'high_risk_conflicts': 0
        })
        
        for dup in duplicate_analysis:
            if dup['agent_count'] > 1:
                for agent in dup['unique_agents']:
                    agent_conflicts[agent]['poles'].append(dup['pole'])
                    agent_conflicts[agent]['total_conflicts'] += 1
                    if dup['risk'] == 'HIGH':
                        agent_conflicts[agent]['high_risk_conflicts'] += 1
        
        # Create agent summary CSV
        with open(f'reports/{report_date}_agent_conflict_summary.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Agent Name', 'Total Conflicts', 'High Risk Conflicts', 
                           'Sample Poles', 'Action Required'])
            
            sorted_agents = sorted(agent_conflicts.items(), 
                                 key=lambda x: x[1]['high_risk_conflicts'], 
                                 reverse=True)
            
            for agent, data in sorted_agents[:100]:  # Top 100
                writer.writerow([
                    agent,
                    data['total_conflicts'],
                    data['high_risk_conflicts'],
                    ', '.join(data['poles'][:5]),
                    'URGENT REVIEW' if data['high_risk_conflicts'] > 3 else 'REVIEW'
                ])
        
        print(f"✓ Saved: reports/{report_date}_agent_conflict_summary.csv")
        
        return high_risk_summary
    
    def print_summary(self, duplicate_analysis):
        """Print summary findings"""
        print("\n=== PAYMENT VERIFICATION SUMMARY ===")
        
        high_risk = [d for d in duplicate_analysis if d['risk'] == 'HIGH']
        
        print(f"\n📊 OVERALL FINDINGS:")
        print(f"  - Total poles analyzed: {len(self.pole_permissions)}")
        print(f"  - Poles with duplicate permissions: {len(duplicate_analysis)}")
        print(f"  - HIGH RISK (multiple agents): {len(high_risk)} poles")
        
        print(f"\n🚨 TOP 10 PAYMENT CONFLICTS:")
        for dup in high_risk[:10]:
            print(f"\n  Pole: {dup['pole']}")
            print(f"  Agents claiming payment: {', '.join(dup['unique_agents']) or 'NO AGENTS RECORDED'}")
            print(f"  Number of claims: {dup['permission_count']}")
            if dup['max_gps_distance'] > 0:
                print(f"  GPS variance: {dup['max_gps_distance']}m")
            
            # Show claims
            for perm in dup['permissions']:
                if perm['agent']:
                    date = perm['date'][:10] if perm['date'] else 'Unknown'
                    gps = 'GPS recorded' if perm['has_gps'] else 'NO GPS'
                    print(f"    - {perm['agent']} on {date} ({gps})")
        
        # Payment impact
        total_duplicate_claims = sum(d['permission_count'] - 1 for d in high_risk)
        print(f"\n💰 PAYMENT IMPACT:")
        print(f"  - Potential duplicate payments to prevent: {total_duplicate_claims}")
        print(f"  - Poles requiring verification: {len(high_risk)}")

def main():
    print("=== VELOCITY FIBRE - GPS-BASED PAYMENT VERIFICATION ===")
    print("Context: High-density informal settlements")
    print("Approach: Using GPS coordinates, not addresses\n")
    
    analyzer = GPSDuplicateAnalyzer('/home/ldp/VF/Apps/FibreFlow/OneMap/Lawley_Project_Louis.csv')
    
    # Run analysis
    analyzer.load_pole_permissions()
    duplicate_analysis = analyzer.analyze_duplicates()
    high_risk = analyzer.generate_reports(duplicate_analysis)
    analyzer.print_summary(duplicate_analysis)
    
    # Save complete analysis
    report_date = datetime.now().strftime('%Y-%m-%d')
    with open(f'reports/{report_date}_gps_duplicate_analysis.json', 'w') as f:
        json.dump(analyzer.analysis_results, f, indent=2)
    
    print("\n✓ Analysis complete!")
    print("\n📋 GENERATED REPORTS (in reports/ folder):")
    print(f"  1. {report_date}_payment_conflicts_detailed.csv - Full details for verification")
    print(f"  2. {report_date}_high_risk_payment_summary.json - Management summary")
    print(f"  3. {report_date}_agent_conflict_summary.csv - Agent accountability")
    print(f"  4. {report_date}_gps_duplicate_analysis.json - Complete analysis results")
    
    print("\n🎯 NEXT STEPS:")
    print("  1. Review high_risk_payment_summary.json")
    print("  2. Hold payments for poles listed in reports")
    print("  3. Contact agents in agent_conflict_summary.csv")
    print("  4. Implement GPS validation for future entries")

if __name__ == "__main__":
    main()