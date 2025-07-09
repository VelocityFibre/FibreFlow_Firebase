#!/usr/bin/env python3

"""
Analyze cases where the same agent submitted multiple times for the same pole
"""

import csv
from collections import defaultdict
from datetime import datetime

def analyze_single_agent_duplicates():
    """Find poles where same agent submitted multiple times"""
    
    # Read the detailed payment conflicts data
    pole_submissions = defaultdict(list)
    
    with open('reports/2025-07-10_payment_conflicts_detailed.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pole_num = row['Pole Number']
            pole_submissions[pole_num].append({
                'agent': row['Agent Name'],
                'date': row['Permission Date'],
                'property_id': row['Property ID'],
                'address': row['Address Sample']
            })
    
    # Find single-agent duplicates
    single_agent_duplicates = []
    
    for pole_num, submissions in pole_submissions.items():
        # Get unique agents for this pole
        unique_agents = set(sub['agent'] for sub in submissions)
        
        # If only one unique agent but multiple submissions
        if len(unique_agents) == 1 and len(submissions) > 1:
            agent_name = list(unique_agents)[0]
            dates = sorted(set(sub['date'] for sub in submissions))
            
            single_agent_duplicates.append({
                'pole': pole_num,
                'agent': agent_name,
                'submission_count': len(submissions),
                'unique_dates': len(dates),
                'dates': dates,
                'address': submissions[0]['address']
            })
    
    # Sort by submission count
    single_agent_duplicates.sort(key=lambda x: x['submission_count'], reverse=True)
    
    # Create report
    output_file = f'reports/{datetime.now().strftime("%Y-%m-%d")}_same_agent_duplicates.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            'Pole Number',
            'Agent Name',
            'Times Submitted',
            'Unique Dates',
            'All Dates',
            'Address',
            'Risk Level',
            'Action'
        ])
        
        for dup in single_agent_duplicates:
            risk = 'MEDIUM' if dup['unique_dates'] > 1 else 'LOW'
            action = 'VERIFY DUPLICATE' if dup['unique_dates'] > 1 else 'SYSTEM DUPLICATE'
            
            writer.writerow([
                dup['pole'],
                dup['agent'],
                dup['submission_count'],
                dup['unique_dates'],
                ' | '.join(dup['dates']),
                dup['address'],
                risk,
                action
            ])
    
    print(f"\nSame-agent duplicate report saved to: {output_file}")
    
    # Print summary
    print("\n=== SAME AGENT DUPLICATE SUMMARY ===")
    print(f"Total poles with same-agent duplicates: {len(single_agent_duplicates)}")
    
    # Count by submission frequency
    submission_counts = defaultdict(int)
    for dup in single_agent_duplicates:
        submission_counts[dup['submission_count']] += 1
    
    print("\nBy submission count:")
    for count in sorted(submission_counts.keys()):
        print(f"  {count} submissions: {submission_counts[count]} poles")
    
    # Show worst cases
    print("\nWorst cases (most submissions by same agent):")
    for dup in single_agent_duplicates[:10]:
        print(f"\nPole {dup['pole']}:")
        print(f"  Agent: {dup['agent']}")
        print(f"  Submitted {dup['submission_count']} times")
        print(f"  Dates: {', '.join(dup['dates'])}")
        print(f"  Address: {dup['address']}")
    
    # Analyze patterns
    print("\n=== PATTERN ANALYSIS ===")
    
    # Same day duplicates
    same_day = [d for d in single_agent_duplicates if d['unique_dates'] == 1]
    print(f"\nSame-day duplicates: {len(same_day)} poles")
    print("  (Likely system/technical duplicates)")
    
    # Different day duplicates  
    diff_day = [d for d in single_agent_duplicates if d['unique_dates'] > 1]
    print(f"\nDifferent-day duplicates: {len(diff_day)} poles")
    print("  (Possible double claims - need verification)")
    
    # Get agent statistics
    agent_stats = defaultdict(int)
    for dup in single_agent_duplicates:
        agent_stats[dup['agent']] += 1
    
    print("\n=== AGENTS WITH MOST SELF-DUPLICATES ===")
    sorted_agents = sorted(agent_stats.items(), key=lambda x: x[1], reverse=True)
    for agent, count in sorted_agents[:10]:
        print(f"  {agent}: {count} poles with duplicates")

if __name__ == "__main__":
    analyze_single_agent_duplicates()