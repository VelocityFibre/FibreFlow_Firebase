#!/usr/bin/env python3
"""
Agent Payment Analysis for OneMap Module
Analyzes pole permission data to prevent duplicate payment claims
"""

import csv
import json
from collections import defaultdict
from datetime import datetime

class AgentPaymentAnalyzer:
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.records = []
        self.analysis_results = {
            'timestamp': datetime.now().isoformat(),
            'purpose': 'Agent payment analysis for pole permissions',
            'findings': {}
        }
        
    def load_data(self):
        """Load CSV data for analysis"""
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.records.append(row)
        
        print(f"✓ Loaded {len(self.records)} records")
        
    def analyze_pole_permissions(self):
        """Analyze pole permission approvals for payment validation"""
        print("\n=== POLE PERMISSION PAYMENT ANALYSIS ===")
        
        # Track pole permissions by agent
        agent_permissions = defaultdict(list)
        pole_agent_map = defaultdict(set)  # Track which agents claimed which poles
        duplicate_claims = []
        
        for record in self.records:
            if 'Pole Permission: Approved' in record.get('Status', ''):
                agent = record.get('Field Agent Name (pole permission)', '').strip()
                pole = record.get('Pole Number', '').strip()
                property_id = record.get('Property ID', '').strip()
                address = record.get('Location Address', '').strip()
                date = record.get('Survey Date', '').strip()
                
                if agent and pole:  # Only count if agent is named
                    permission_record = {
                        'pole': pole,
                        'property_id': property_id,
                        'address': address,
                        'date': date,
                        'agent': agent
                    }
                    
                    agent_permissions[agent].append(permission_record)
                    
                    # Check if this pole was already claimed by another agent
                    if pole in pole_agent_map and agent not in pole_agent_map[pole]:
                        duplicate_claims.append({
                            'pole': pole,
                            'agents': list(pole_agent_map[pole]) + [agent],
                            'addresses': self.get_pole_addresses(pole)
                        })
                    
                    pole_agent_map[pole].add(agent)
        
        # Analyze results
        total_permissions_with_agents = sum(len(perms) for perms in agent_permissions.values())
        unique_poles_with_agents = len(pole_agent_map)
        
        print(f"\n✓ Total pole permissions with named agents: {total_permissions_with_agents}")
        print(f"✓ Unique poles with agent claims: {unique_poles_with_agents}")
        print(f"✓ Total agents who claimed permissions: {len(agent_permissions)}")
        
        # Find potential duplicate payments
        print(f"\n⚠️  DUPLICATE PAYMENT RISKS: {len(duplicate_claims)} poles claimed by multiple agents")
        
        self.analysis_results['findings']['payment_summary'] = {
            'total_permissions_with_agents': total_permissions_with_agents,
            'unique_poles_with_agents': unique_poles_with_agents,
            'total_agents': len(agent_permissions),
            'duplicate_claim_count': len(duplicate_claims)
        }
        
        # Show top agents by permissions
        print("\n📊 TOP AGENTS BY POLE PERMISSIONS:")
        top_agents = sorted(agent_permissions.items(), key=lambda x: len(x[1]), reverse=True)[:10]
        for agent, permissions in top_agents:
            unique_poles = len(set(p['pole'] for p in permissions))
            print(f"   {agent}: {len(permissions)} permissions ({unique_poles} unique poles)")
            
        self.analysis_results['findings']['top_agents'] = [
            {
                'name': agent,
                'total_permissions': len(permissions),
                'unique_poles': len(set(p['pole'] for p in permissions))
            }
            for agent, permissions in top_agents
        ]
        
        return agent_permissions, duplicate_claims
    
    def get_pole_addresses(self, pole_number):
        """Get all addresses where a pole appears"""
        addresses = set()
        for record in self.records:
            if record.get('Pole Number', '').strip() == pole_number:
                addresses.add(record.get('Location Address', '').strip())
        return list(addresses)
    
    def analyze_missing_agents(self):
        """Analyze records missing agent names"""
        print("\n=== MISSING AGENT ANALYSIS ===")
        
        missing_agent_permissions = []
        total_permissions = 0
        
        for record in self.records:
            if 'Pole Permission: Approved' in record.get('Status', ''):
                total_permissions += 1
                agent = record.get('Field Agent Name (pole permission)', '').strip()
                if not agent:
                    missing_agent_permissions.append({
                        'property_id': record.get('Property ID', ''),
                        'pole': record.get('Pole Number', ''),
                        'address': record.get('Location Address', ''),
                        'date': record.get('Survey Date', '')
                    })
        
        missing_percentage = (len(missing_agent_permissions) / total_permissions * 100) if total_permissions > 0 else 0
        
        print(f"\n✓ Total pole permissions: {total_permissions}")
        print(f"⚠️  Missing agent name: {len(missing_agent_permissions)} ({missing_percentage:.1f}%)")
        
        self.analysis_results['findings']['missing_agents'] = {
            'total_permissions': total_permissions,
            'missing_agent_count': len(missing_agent_permissions),
            'missing_percentage': missing_percentage
        }
        
        return missing_agent_permissions
    
    def analyze_pole_conflicts(self):
        """Analyze poles appearing at multiple addresses"""
        print("\n=== POLE LOCATION CONFLICTS ===")
        
        pole_locations = defaultdict(set)
        pole_agents = defaultdict(set)
        
        for record in self.records:
            pole = record.get('Pole Number', '').strip()
            address = record.get('Location Address', '').strip()
            agent = record.get('Field Agent Name (pole permission)', '').strip()
            
            if pole and address:
                pole_locations[pole].add(address)
                if agent and 'Pole Permission: Approved' in record.get('Status', ''):
                    pole_agents[pole].add(agent)
        
        # Find poles at multiple locations
        conflicted_poles = {pole: list(addrs) for pole, addrs in pole_locations.items() if len(addrs) > 1}
        
        # Analyze payment implications
        payment_conflicts = []
        for pole, addresses in conflicted_poles.items():
            agents = pole_agents.get(pole, set())
            if len(agents) > 0:
                payment_conflicts.append({
                    'pole': pole,
                    'location_count': len(addresses),
                    'addresses': addresses[:3],  # First 3 addresses
                    'agents_involved': list(agents),
                    'payment_risk': 'HIGH' if len(agents) > 1 else 'MEDIUM'
                })
        
        print(f"\n✓ Total unique poles: {len(pole_locations)}")
        print(f"⚠️  Poles at multiple addresses: {len(conflicted_poles)}")
        print(f"🚨 Poles with payment conflicts: {len(payment_conflicts)}")
        
        # Show high-risk examples
        high_risk = [p for p in payment_conflicts if p['payment_risk'] == 'HIGH']
        print(f"\n🚨 HIGH RISK PAYMENT CONFLICTS ({len(high_risk)} poles):")
        for conflict in high_risk[:5]:
            print(f"   Pole {conflict['pole']}: {conflict['location_count']} locations, "
                  f"Agents: {', '.join(conflict['agents_involved'])}")
        
        self.analysis_results['findings']['pole_conflicts'] = {
            'total_poles': len(pole_locations),
            'conflicted_poles': len(conflicted_poles),
            'payment_conflicts': len(payment_conflicts),
            'high_risk_count': len(high_risk)
        }
        
        return payment_conflicts
    
    def analyze_kwena_street(self):
        """Special analysis for 1 KWENA STREET anomaly"""
        print("\n=== 1 KWENA STREET ANALYSIS ===")
        
        kwena_records = []
        kwena_agents = defaultdict(int)
        kwena_poles = set()
        kwena_dates = set()
        
        for record in self.records:
            if '1 KWENA STREET' in record.get('Location Address', ''):
                kwena_records.append(record)
                
                if 'Pole Permission: Approved' in record.get('Status', ''):
                    agent = record.get('Field Agent Name (pole permission)', '').strip()
                    if agent:
                        kwena_agents[agent] += 1
                
                pole = record.get('Pole Number', '').strip()
                if pole:
                    kwena_poles.add(pole)
                
                date = record.get('Survey Date', '').strip()
                if date:
                    kwena_dates.add(date[:10])  # Just the date part
        
        print(f"\n✓ Total 1 KWENA STREET entries: {len(kwena_records)}")
        print(f"✓ Unique poles at this address: {len(kwena_poles)}")
        print(f"✓ Date range: {min(kwena_dates) if kwena_dates else 'N/A'} to {max(kwena_dates) if kwena_dates else 'N/A'}")
        print(f"✓ Agents involved: {len(kwena_agents)}")
        
        print("\n📊 TOP AGENTS AT 1 KWENA STREET:")
        for agent, count in sorted(kwena_agents.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"   {agent}: {count} permissions")
        
        self.analysis_results['findings']['kwena_street'] = {
            'total_entries': len(kwena_records),
            'unique_poles': len(kwena_poles),
            'date_range': f"{min(kwena_dates) if kwena_dates else 'N/A'} to {max(kwena_dates) if kwena_dates else 'N/A'}",
            'agents_involved': len(kwena_agents),
            'top_agents': dict(sorted(kwena_agents.items(), key=lambda x: x[1], reverse=True)[:5])
        }
        
        return kwena_records
    
    def generate_payment_report(self, agent_permissions, duplicate_claims, payment_conflicts):
        """Generate payment validation report"""
        print("\n=== GENERATING PAYMENT REPORTS ===")
        
        # 1. Agent payment summary
        payment_summary = []
        for agent, permissions in agent_permissions.items():
            unique_poles = set(p['pole'] for p in permissions)
            payment_summary.append({
                'agent_name': agent,
                'total_claims': len(permissions),
                'unique_poles': len(unique_poles),
                'duplicate_entries': len(permissions) - len(unique_poles),
                'payment_status': 'REVIEW' if len(permissions) > len(unique_poles) else 'VALID'
            })
        
        # Sort by total claims
        payment_summary.sort(key=lambda x: x['total_claims'], reverse=True)
        
        # Save to CSV
        with open('agent_payment_summary.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['agent_name', 'total_claims', 'unique_poles', 'duplicate_entries', 'payment_status'])
            writer.writeheader()
            writer.writerows(payment_summary)
        print("✓ Saved agent_payment_summary.csv")
        
        # 2. Duplicate claims report
        if duplicate_claims:
            with open('duplicate_payment_claims.json', 'w') as f:
                json.dump(duplicate_claims[:50], f, indent=2)  # Top 50
            print("✓ Saved duplicate_payment_claims.json")
        
        # 3. Field verification list
        verification_needed = []
        for conflict in payment_conflicts:
            if conflict['payment_risk'] == 'HIGH':
                verification_needed.append({
                    'pole_number': conflict['pole'],
                    'locations': conflict['addresses'],
                    'agents_claiming': conflict['agents_involved'],
                    'action_required': 'Field verification needed',
                    'priority': 'HIGH'
                })
        
        if verification_needed:
            df_verify = pd.DataFrame(verification_needed)
            df_verify.to_csv('field_verification_required.csv', index=False)
            print("✓ Saved field_verification_required.csv")
        
        # 4. Save complete analysis
        with open('agent_payment_analysis.json', 'w') as f:
            json.dump(self.analysis_results, f, indent=2)
        print("✓ Saved agent_payment_analysis.json")
        
        return payment_summary

def main():
    analyzer = AgentPaymentAnalyzer('/home/ldp/VF/Apps/FibreFlow/OneMap/Lawley_Project_Louis.csv')
    
    print("=== VELOCITY FIBRE - AGENT PAYMENT ANALYSIS ===")
    print("Analyzing pole permission data for payment validation...\n")
    
    analyzer.load_data()
    
    # Run analyses
    agent_permissions, duplicate_claims = analyzer.analyze_pole_permissions()
    missing_agents = analyzer.analyze_missing_agents()
    payment_conflicts = analyzer.analyze_pole_conflicts()
    kwena_records = analyzer.analyze_kwena_street()
    
    # Generate reports
    payment_summary = analyzer.generate_payment_report(agent_permissions, duplicate_claims, payment_conflicts)
    
    print("\n=== RECOMMENDATIONS ===")
    print("1. IMMEDIATE: Review high-risk payment conflicts in field_verification_required.csv")
    print("2. URGENT: Investigate agents with duplicate pole claims in agent_payment_summary.csv")
    print("3. IMPORTANT: Verify '1 KWENA STREET' - is it a complex or data entry location?")
    print("4. PROCESS: Require agent names for all pole permissions going forward")
    print("5. SYSTEM: Implement pole location validation to prevent future conflicts")
    
    print("\n=== KEY QUESTIONS FOR CLIENT ===")
    print("1. How do you currently verify pole permissions before payment?")
    print("2. What is the payment rate per pole permission?")
    print("3. Should agents be paid for multiple permissions at the same pole?")
    print("4. Who should we contact to verify 1 KWENA STREET situation?")
    print("5. Do you have GPS coordinates for poles to resolve location conflicts?")

if __name__ == "__main__":
    main()