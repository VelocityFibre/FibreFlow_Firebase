#!/usr/bin/env python3
"""
Create focused report for agent follow-up on duplicate pole claims
"""

import csv
from collections import defaultdict
from datetime import datetime

def create_agent_followup_report():
    """Create a simplified report for contacting agents about duplicate claims"""
    
    # Load all pole permissions
    pole_claims = defaultdict(list)
    
    with open('/home/ldp/VF/Apps/FibreFlow/OneMap/Lawley_Project_Louis.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            if 'Pole Permission: Approved' in row.get('Status', ''):
                pole = row.get('Pole Number', '').strip()
                agent = row.get('Field Agent Name (pole permission)', '').strip()
                
                if pole and agent:  # Only include records with both pole and agent
                    pole_claims[pole].append({
                        'agent': agent,
                        'date': row.get('Survey Date', '')[:10],
                        'address': row.get('Location Address', '')[:80],
                        'contact': row.get('Contact Number (e.g.0123456789)', '').strip(),
                        'property_id': row.get('Property ID', '')
                    })
    
    # Find poles with multiple agents
    report_date = datetime.now().strftime('%Y-%m-%d')
    
    with open(f'reports/{report_date}_agent_followup_list.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Pole Number', 'Agent Name 1', 'Date 1', 'Contact 1', 
                        'Agent Name 2', 'Date 2', 'Contact 2',
                        'Total Agents', 'Address', 'Action'])
        
        # Process poles with multiple agents
        conflicts_count = 0
        for pole, claims in pole_claims.items():
            unique_agents = list(set(claim['agent'] for claim in claims))
            
            if len(unique_agents) > 1:
                conflicts_count += 1
                # Get first two different agents for easy comparison
                agent1_claim = next(c for c in claims if c['agent'] == unique_agents[0])
                agent2_claim = next(c for c in claims if c['agent'] == unique_agents[1])
                
                writer.writerow([
                    pole,
                    agent1_claim['agent'],
                    agent1_claim['date'],
                    agent1_claim['contact'] or 'NO CONTACT',
                    agent2_claim['agent'], 
                    agent2_claim['date'],
                    agent2_claim['contact'] or 'NO CONTACT',
                    len(unique_agents),
                    agent1_claim['address'],
                    'VERIFY WITH BOTH AGENTS'
                ])
    
    print(f"✓ Created: reports/{report_date}_agent_followup_list.csv")
    print(f"✓ Found {conflicts_count} poles with multiple agents claiming permission")
    
    # Also create agent contact summary
    agent_contacts = defaultdict(lambda: {'poles': [], 'contact': ''})
    
    for pole, claims in pole_claims.items():
        unique_agents = list(set(claim['agent'] for claim in claims))
        if len(unique_agents) > 1:
            for claim in claims:
                agent_contacts[claim['agent']]['poles'].append(pole)
                if claim['contact'] and not agent_contacts[claim['agent']]['contact']:
                    agent_contacts[claim['agent']]['contact'] = claim['contact']
    
    # Save agent contact list
    with open(f'reports/{report_date}_agent_contact_list.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Agent Name', 'Contact Number', 'Number of Conflicts', 'Sample Poles'])
        
        for agent, data in sorted(agent_contacts.items(), key=lambda x: len(x[1]['poles']), reverse=True):
            unique_poles = list(set(data['poles']))
            writer.writerow([
                agent,
                data['contact'] or 'NO CONTACT',
                len(unique_poles),
                ', '.join(unique_poles[:5])  # First 5 poles
            ])
    
    print(f"✓ Created: reports/{report_date}_agent_contact_list.csv")

if __name__ == "__main__":
    print("Creating agent follow-up reports...")
    create_agent_followup_report()
    print("\nReports created in reports/ folder:")
    print("1. agent_followup_list.csv - Side-by-side comparison of conflicting claims")
    print("2. agent_contact_list.csv - Agent phone numbers for follow-up")