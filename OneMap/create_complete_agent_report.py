#!/usr/bin/env python3

"""
Complete Agent Follow-up Report Generator
- Shows ALL agents who claimed each pole (not just 2)
- Sorts by date (earliest submission first)
- Includes contact information from agent contact list
"""

import csv
from datetime import datetime
from collections import defaultdict

def create_complete_agent_report():
    """Create comprehensive report with all agents shown and date-sorted"""
    
    # First, load agent contact information
    agent_contacts = {}
    try:
        with open('reports/2025-07-10_agent_contact_list.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['Agent Name']:
                    agent_contacts[row['Agent Name'].lower()] = row['Contact Number']
    except:
        print("Warning: Could not load agent contact list")
    
    # Read the detailed payment conflicts data
    conflicts = defaultdict(list)
    
    with open('reports/2025-07-10_payment_conflicts_detailed.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pole_num = row['Pole Number']
            conflicts[pole_num].append({
                'agent': row['Agent Name'],
                'date': row['Permission Date'],
                'property_id': row['Property ID'],
                'latitude': row['Latitude'],
                'longitude': row['Longitude'],
                'address': row['Address Sample']
            })
    
    # Create the complete agent report
    output_file = f'reports/{datetime.now().strftime("%Y-%m-%d")}_complete_agent_followup.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Write header
        writer.writerow([
            'Pole Number',
            'Total Agents',
            'All Agents (Date Order)',
            'Submission Dates',
            'Contact Numbers',
            'Address',
            'Action Required'
        ])
        
        # Process each pole with conflicts
        for pole_num, records in conflicts.items():
            # Get unique agents for this pole
            unique_agents = {}
            for record in records:
                agent_name = record['agent']
                # Keep the earliest date for each agent
                if agent_name not in unique_agents or record['date'] < unique_agents[agent_name]['date']:
                    unique_agents[agent_name] = record
            
            # Sort agents by date (earliest first)
            sorted_agents = sorted(unique_agents.values(), key=lambda x: x['date'])
            
            # Compile agent information
            agent_names = []
            dates = []
            contacts = []
            
            for agent_record in sorted_agents:
                agent_name = agent_record['agent']
                agent_names.append(agent_name)
                dates.append(agent_record['date'])
                
                # Get contact from lookup or use 'No contact'
                contact = agent_contacts.get(agent_name.lower(), 'No contact')
                contacts.append(contact)
            
            # Use the address from the first record
            address = records[0]['address'] if records else 'Unknown'
            
            writer.writerow([
                pole_num,
                len(sorted_agents),
                ' | '.join(agent_names),
                ' | '.join(dates),
                ' | '.join(contacts),
                address,
                'VERIFY WITH ALL AGENTS'
            ])
    
    print(f"\nComplete agent report saved to: {output_file}")
    
    # Also create a wide format for easier viewing
    wide_output = f'reports/{datetime.now().strftime("%Y-%m-%d")}_agent_followup_expanded.csv'
    
    with open(wide_output, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Determine max number of agents
        max_agents = max(len(set(r['agent'] for r in records)) for records in conflicts.values())
        max_agents = min(max_agents, 8)  # Cap at 8 for readability
        
        # Create headers
        headers = ['Pole Number']
        for i in range(1, max_agents + 1):
            headers.extend([f'Agent {i}', f'Date {i}', f'Contact {i}'])
        headers.extend(['Total Agents', 'Address', 'Action'])
        
        writer.writerow(headers)
        
        # Write data
        for pole_num, records in conflicts.items():
            # Get unique agents
            unique_agents = {}
            for record in records:
                agent_name = record['agent']
                if agent_name not in unique_agents or record['date'] < unique_agents[agent_name]['date']:
                    unique_agents[agent_name] = record
            
            # Sort by date
            sorted_agents = sorted(unique_agents.values(), key=lambda x: x['date'])
            
            row = [pole_num]
            
            # Add agent data
            for i in range(max_agents):
                if i < len(sorted_agents):
                    agent_record = sorted_agents[i]
                    agent_name = agent_record['agent']
                    contact = agent_contacts.get(agent_name.lower(), 'No contact')
                    row.extend([
                        agent_name,
                        agent_record['date'],
                        contact
                    ])
                else:
                    row.extend(['', '', ''])
            
            address = records[0]['address'] if records else 'Unknown'
            row.extend([
                len(sorted_agents),
                address,
                'VERIFY WITH ALL AGENTS'
            ])
            
            writer.writerow(row)
    
    print(f"Expanded format saved to: {wide_output}")
    
    # Create summary statistics
    print("\n=== SUMMARY STATISTICS ===")
    
    # Count poles by number of agents
    agent_counts = defaultdict(int)
    total_conflicts = 0
    
    for pole_num, records in conflicts.items():
        unique_agents = set(r['agent'] for r in records)
        num_agents = len(unique_agents)
        agent_counts[num_agents] += 1
        total_conflicts += num_agents
    
    print(f"\nPoles by number of conflicting agents:")
    for count in sorted(agent_counts.keys()):
        print(f"  {count} agents: {agent_counts[count]} poles")
    
    print(f"\nTotal poles with conflicts: {len(conflicts)}")
    print(f"Total potential duplicate payments: {total_conflicts}")
    
    # Show examples of worst cases
    print("\n=== WORST CASES (Most Agents) ===")
    
    # Find poles with most agents
    pole_agent_counts = []
    for pole_num, records in conflicts.items():
        unique_agents = set(r['agent'] for r in records)
        pole_agent_counts.append((pole_num, len(unique_agents), records))
    
    pole_agent_counts.sort(key=lambda x: x[1], reverse=True)
    
    for pole_num, agent_count, records in pole_agent_counts[:5]:
        print(f"\nPole {pole_num}: {agent_count} different agents")
        
        # Get unique agents with earliest dates
        unique_agents = {}
        for record in records:
            agent_name = record['agent']
            if agent_name not in unique_agents or record['date'] < unique_agents[agent_name]['date']:
                unique_agents[agent_name] = record
        
        sorted_agents = sorted(unique_agents.values(), key=lambda x: x['date'])
        
        for i, agent_record in enumerate(sorted_agents, 1):
            agent_name = agent_record['agent']
            contact = agent_contacts.get(agent_name.lower(), 'No contact')
            print(f"  {i}. {agent_name} - {agent_record['date']} - {contact}")
        print(f"  Address: {records[0]['address']}")

if __name__ == "__main__":
    create_complete_agent_report()