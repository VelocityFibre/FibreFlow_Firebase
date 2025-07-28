#!/usr/bin/env python3
"""
Update Ettiene images CSV with extracted GPS data
"""

import csv
from datetime import datetime

# Data extracted from images
EXTRACTED_DATA = {
    # Previously shown as example
    'CCHC6189.JPG': {
        'status': 'EXTRACTED',
        'address': 'Marcoville Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
        'lat': '-26.383869',
        'lon': '27.806789',
        'datetime': '07/24/2025 03:05 PM GMT+02:00',
        'notes': 'GPS Map Camera'
    },
    # New extractions
    'CHXX4480.JPG': {
        'status': 'EXTRACTED', 
        'address': '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
        'lat': '-26.377331',
        'lon': '27.811650',
        'datetime': '07/23/2025 02:00 PM GMT+02:00',
        'notes': 'Captured by GPS Map Camera'
    },
    'CIFN6820.JPG': {
        'status': 'EXTRACTED',
        'address': '3rd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', 
        'lat': '-26.385886',
        'lon': '27.809345',
        'datetime': '07/23/2025 10:20 AM GMT+02:00',
        'notes': 'Captured by GPS Map Camera'
    },
    'CMFB6989.JPG': {
        'status': 'EMPTY',
        'address': '',
        'lat': '',
        'lon': '',
        'datetime': '',
        'notes': '0 bytes file'
    },
    'CNPR3546.JPG': {
        'status': 'EXTRACTED',
        'address': '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
        'lat': '-26.380441', 
        'lon': '27.812265',
        'datetime': '07/23/2025 02:20 PM GMT+02:00',
        'notes': 'Captured by GPS Map Camera'
    }
}

def update_csv():
    """Update the CSV with extracted data"""
    
    input_file = 'reports/ettiene-all-278-images.csv'
    output_file = f'reports/ettiene-updated-{datetime.now().strftime("%Y-%m-%d-%H%M")}.csv'
    
    # Read existing CSV
    rows = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        for row in reader:
            filename = row['File Name']
            
            # Update if we have extracted data
            if filename in EXTRACTED_DATA:
                data = EXTRACTED_DATA[filename]
                row['Status'] = data['status']
                row['Full Address'] = data['address']
                row['Latitude'] = data['lat']
                row['Longitude'] = data['lon']
                row['GPS Coordinates'] = f"{data['lat']}, {data['lon']}" if data['lat'] else ''
                row['Date/Time'] = data['datetime']
                row['Notes'] = data['notes']
                print(f"✅ Updated: {filename}")
            
            rows.append(row)
    
    # Write updated CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n📊 Updated CSV saved to: {output_file}")
    
    # Count statistics
    total = len(rows)
    extracted = sum(1 for r in rows if r['Status'] == 'EXTRACTED')
    pending = sum(1 for r in rows if r['Status'] == 'PENDING')
    empty = sum(1 for r in rows if r['Status'] == 'EMPTY')
    corrupted = sum(1 for r in rows if r['Status'] == 'CORRUPTED')
    
    print(f"\n📈 Statistics:")
    print(f"   Total images: {total}")
    print(f"   Extracted: {extracted} ({extracted/total*100:.1f}%)")
    print(f"   Pending: {pending} ({pending/total*100:.1f}%)")
    print(f"   Empty: {empty} ({empty/total*100:.1f}%)")
    print(f"   Corrupted: {corrupted} ({corrupted/total*100:.1f}%)")

if __name__ == "__main__":
    update_csv()