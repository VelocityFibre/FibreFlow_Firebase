#!/usr/bin/env python3

"""
Enhanced Agent Follow-up Report Generator
- Shows ALL agents who claimed each pole
- Sorts by date (earliest first)
"""

import csv
import json
from datetime import datetime
from collections import defaultdict

def create_sorted_agent_report():
    """Create comprehensive report with date-sorted agents"""
    
    # Read the GPS duplicates data
    with open('gps_duplicates_analysis.json', 'r') as f:
        data = json.load(f)
    
    high_risk_poles = data['high_risk_poles']
    
    # Create enhanced follow-up report
    output_file = f'reports/{datetime.now().strftime("%Y-%m-%d")}_sorted_agent_followup.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Write header
        writer.writerow([
            'Pole Number',
            'Total Agents', 
            'Agent Names (Date Order)',
            'Submission Dates',
            'Contact Numbers',
            'Address Sample',
            'GPS Variance (m)',
            'Action Required'
        ])
        
        # Process each high-risk pole
        for pole in high_risk_poles:
            pole_num = pole['pole_number']
            agents = pole['agents']
            
            # Sort agents by date (earliest first)
            sorted_agents = sorted(agents, key=lambda x: x['date'])
            
            # Compile sorted agent info
            agent_names = []
            dates = []
            contacts = []
            
            for agent in sorted_agents:
                agent_names.append(agent['name'])
                dates.append(agent['date'])
                contacts.append(agent.get('contact', 'No number'))
            
            writer.writerow([
                pole_num,
                len(agents),
                ' | '.join(agent_names),
                ' | '.join(dates),
                ' | '.join(contacts),
                pole['address_sample'],
                f"{pole['max_gps_distance']:.1f}",
                'VERIFY WITH ALL AGENTS'
            ])
    
    print(f"Sorted agent report saved to: {output_file}")
    
    # Also create a side-by-side report for easier viewing (max 5 agents)
    wide_output = f'reports/{datetime.now().strftime("%Y-%m-%d")}_agent_followup_wide.csv'
    
    with open(wide_output, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Create dynamic headers for up to 5 agents
        headers = ['Pole Number']
        for i in range(1, 6):
            headers.extend([f'Agent {i}', f'Date {i}', f'Contact {i}'])
        headers.extend(['Total Agents', 'Address', 'Action'])
        
        writer.writerow(headers)
        
        # Process each pole
        for pole in high_risk_poles:
            pole_num = pole['pole_number']
            agents = pole['agents']
            
            # Sort agents by date (earliest first)
            sorted_agents = sorted(agents, key=lambda x: x['date'])
            
            row = [pole_num]
            
            # Add up to 5 agents
            for i in range(5):
                if i < len(sorted_agents):
                    agent = sorted_agents[i]
                    row.extend([
                        agent['name'],
                        agent['date'],
                        agent.get('contact', 'No number')
                    ])
                else:
                    row.extend(['', '', ''])
            
            row.extend([
                len(agents),
                pole['address_sample'],
                'VERIFY WITH ALL AGENTS'
            ])
            
            writer.writerow(row)
    
    print(f"Wide format report saved to: {wide_output}")
    
    # Create summary statistics
    summary_file = f'reports/{datetime.now().strftime("%Y-%m-%d")}_agent_conflict_statistics.txt'
    
    with open(summary_file, 'w') as f:
        f.write("AGENT CONFLICT STATISTICS\n")
        f.write("=" * 50 + "\n\n")
        
        # Count poles by number of agents
        agent_counts = defaultdict(int)
        for pole in high_risk_poles:
            agent_counts[len(pole['agents'])] += 1
        
        f.write("Poles by Number of Conflicting Agents:\n")
        for count in sorted(agent_counts.keys()):
            f.write(f"  {count} agents: {agent_counts[count]} poles\n")
        
        f.write(f"\nTotal poles with conflicts: {len(high_risk_poles)}\n")
        f.write(f"Total potential duplicate payments: {sum(len(p['agents']) for p in high_risk_poles)}\n")
        
        # Find worst cases
        f.write("\n\nWorst Cases (Most Agents per Pole):\n")
        f.write("-" * 50 + "\n")
        
        sorted_poles = sorted(high_risk_poles, key=lambda x: len(x['agents']), reverse=True)
        for pole in sorted_poles[:10]:
            f.write(f"\nPole {pole['pole_number']}: {len(pole['agents'])} agents\n")
            sorted_agents = sorted(pole['agents'], key=lambda x: x['date'])
            for i, agent in enumerate(sorted_agents, 1):
                f.write(f"  {i}. {agent['name']} - {agent['date']} - {agent.get('contact', 'No number')}\n")
            f.write(f"  Address: {pole['address_sample']}\n")
    
    print(f"Statistics saved to: {summary_file}")
    
    print("\n✓ All reports generated with date-sorted agents!")
    print("✓ Earliest submissions now appear first")

if __name__ == "__main__":
    create_sorted_agent_report()