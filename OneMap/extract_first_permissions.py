#!/usr/bin/env python3

"""
Extract only the FIRST (oldest) pole permission for each pole
This gives us the true count of poles with permissions
"""

import csv
from datetime import datetime
from collections import defaultdict

def extract_first_permissions():
    """Extract only the first/oldest permission for each pole"""
    
    # Read all pole permission data
    pole_data = defaultdict(list)
    
    # Read from the original filtered data
    with open('Lawley_Essential.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only process Pole Permission records
            if 'Pole Permission' in row.get('Flow Name Groups', ''):
                pole_num = row.get('Pole Number', '').strip()
                if pole_num:
                    pole_data[pole_num].append({
                        'date': row.get('Last Modified Pole Permissions Date', ''),
                        'agent': row.get('Field Agent Name (pole permission)', '').strip(),
                        'property_id': row.get('Property ID', ''),
                        'latitude': row.get('Latitude', ''),
                        'longitude': row.get('Longitude', ''),
                        'address': row.get('Location Address', ''),
                        'status': row.get('Status', ''),
                        'contact': row.get('Contact Number', '') if 'Contact Number' in row else ''
                    })
    
    # Find the first (oldest) permission for each pole
    first_permissions = {}
    
    for pole_num, permissions in pole_data.items():
        # Sort by date and take the first one
        sorted_perms = sorted(permissions, key=lambda x: x['date'])
        first_permissions[pole_num] = sorted_perms[0]
    
    # Save the first permissions only
    output_file = f'reports/{datetime.now().strftime("%Y-%m-%d")}_first_pole_permissions.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            'Pole Number',
            'First Permission Date',
            'Original Agent',
            'Contact Number',
            'Property ID',
            'Latitude',
            'Longitude',
            'Address',
            'Status'
        ])
        
        # Sort by pole number for easy reading
        for pole_num in sorted(first_permissions.keys()):
            perm = first_permissions[pole_num]
            writer.writerow([
                pole_num,
                perm['date'],
                perm['agent'],
                perm['contact'],
                perm['property_id'],
                perm['latitude'],
                perm['longitude'],
                perm['address'],
                perm['status']
            ])
    
    print(f"\nFirst permissions report saved to: {output_file}")
    
    # Create summary statistics
    summary_file = f'reports/{datetime.now().strftime("%Y-%m-%d")}_pole_permission_summary.txt'
    
    with open(summary_file, 'w') as f:
        f.write("POLE PERMISSION SUMMARY (First Permissions Only)\n")
        f.write("=" * 60 + "\n\n")
        
        f.write(f"Total unique poles with permissions: {len(first_permissions)}\n\n")
        
        # Count by status
        status_counts = defaultdict(int)
        for perm in first_permissions.values():
            status_counts[perm['status']] += 1
        
        f.write("Permissions by Status:\n")
        for status, count in sorted(status_counts.items()):
            f.write(f"  {status}: {count}\n")
        
        # Count by agent (original submitters only)
        agent_counts = defaultdict(int)
        for perm in first_permissions.values():
            if perm['agent']:
                agent_counts[perm['agent']] += 1
        
        f.write("\n\nTop 20 Agents (by first permissions submitted):\n")
        sorted_agents = sorted(agent_counts.items(), key=lambda x: x[1], reverse=True)
        for agent, count in sorted_agents[:20]:
            f.write(f"  {agent}: {count} poles\n")
        
        # Count by month
        month_counts = defaultdict(int)
        for perm in first_permissions.values():
            if perm['date']:
                month = perm['date'][:7]  # YYYY-MM
                month_counts[month] += 1
        
        f.write("\n\nPermissions by Month:\n")
        for month in sorted(month_counts.keys()):
            f.write(f"  {month}: {month_counts[month]}\n")
        
        # Missing data analysis
        missing_agent = sum(1 for p in first_permissions.values() if not p['agent'])
        missing_contact = sum(1 for p in first_permissions.values() if not p['contact'])
        missing_gps = sum(1 for p in first_permissions.values() if not p['latitude'] or not p['longitude'])
        
        f.write("\n\nData Quality:\n")
        f.write(f"  Missing agent name: {missing_agent} ({missing_agent/len(first_permissions)*100:.1f}%)\n")
        f.write(f"  Missing contact: {missing_contact} ({missing_contact/len(first_permissions)*100:.1f}%)\n")
        f.write(f"  Missing GPS: {missing_gps} ({missing_gps/len(first_permissions)*100:.1f}%)\n")
    
    print(f"Summary saved to: {summary_file}")
    
    # Quick comparison with our duplicate analysis
    print("\n=== QUICK COMPARISON ===")
    print(f"Total unique poles with permissions: {len(first_permissions)}")
    
    # Load duplicate data to compare
    duplicates_count = 0
    try:
        with open('reports/2025-07-10_payment_conflicts_detailed.csv', 'r') as f:
            reader = csv.DictReader(f)
            unique_poles = set()
            for row in reader:
                unique_poles.add(row['Pole Number'])
            duplicates_count = len(unique_poles)
    except:
        pass
    
    if duplicates_count > 0:
        print(f"Poles with duplicate claims: {duplicates_count}")
        print(f"Poles with single claim: {len(first_permissions) - duplicates_count}")
        print(f"\nThis means {duplicates_count} poles ({duplicates_count/len(first_permissions)*100:.1f}%) have payment conflicts")

if __name__ == "__main__":
    extract_first_permissions()