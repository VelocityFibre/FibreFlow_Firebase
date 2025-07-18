#!/usr/bin/env python3
"""
Lawley Drops Data Extraction Script
Date: 2025-01-16

Purpose: Extract only required fields from Lawley Drops CSV file
Input: /home/ldp/Downloads/Lawley Drops (CSV).csv
Output: 
  - output/lawley-drops-extracted.json
  - output/lawley-drops-extracted.csv

Required fields:
  - label (Drop ID)
  - strtfeat (Pole reference)
  - endfeat (ONT reference)
  - dim2 (Cable length)
  - pon_no
  - zone_no
  - lat/lon (GPS coordinates)
  - datecrtd
  - crtdby

Transformations:
  - Add isSpare field based on endfeat
  - Extract numeric cable length
  - Parse dates properly
"""

import csv
import json
import os
import re
from datetime import datetime
from pathlib import Path

# Configuration
INPUT_FILE = '/home/ldp/Downloads/Lawley Drops (CSV).csv'
OUTPUT_DIR = Path(__file__).parent / 'output'
OUTPUT_JSON = OUTPUT_DIR / 'lawley-drops-extracted.json'
OUTPUT_CSV = OUTPUT_DIR / 'lawley-drops-extracted.csv'

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)


def is_spare_drop(endfeat):
    """
    Determine if drop is a spare based on endfeat
    Args:
        endfeat: ONT reference field
    Returns:
        True if spare (empty endfeat), False otherwise
    """
    return not endfeat or endfeat.strip() == ''


def extract_numeric_cable_length(cable_length):
    """
    Extract numeric value from cable length string
    Args:
        cable_length: String like "40m" or "30m"
    Returns:
        Numeric value or None
    """
    if not cable_length:
        return None
    
    match = re.search(r'(\d+(?:\.\d+)?)', cable_length)
    return float(match.group(1)) if match else None


def parse_date(date_str):
    """
    Parse date string to ISO format
    Args:
        date_str: Date string in various formats
    Returns:
        ISO date string or original if parsing fails
    """
    if not date_str:
        return None
    
    # Try common date formats
    date_formats = [
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
        '%d/%m/%Y',
        '%m/%d/%Y'
    ]
    
    for fmt in date_formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.isoformat()
        except ValueError:
            continue
    
    # Return original if no format matches
    return date_str


def parse_coordinate(coord):
    """
    Parse latitude/longitude
    Args:
        coord: Coordinate string
    Returns:
        Parsed coordinate or None
    """
    if not coord or coord.strip() == '':
        return None
    try:
        return float(coord)
    except ValueError:
        return None


def extract_drop_data():
    """Main extraction function"""
    print('Starting Lawley Drops extraction...')
    print(f'Date: {datetime.now().isoformat()}')
    print(f'Input file: {INPUT_FILE}')
    
    # Check if input file exists
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(f'Input file not found: {INPUT_FILE}')
    
    drops = []
    errors = []
    stats = {
        'total': 0,
        'valid': 0,
        'invalid': 0,
        'spareDrops': 0,
        'activeDrops': 0,
        'withGPS': 0,
        'withoutGPS': 0,
        'uniquePoles': set()
    }
    
    # Read CSV file
    with open(INPUT_FILE, 'r', encoding='utf-8') as csvfile:
        # Try to detect delimiter
        sample = csvfile.read(1024)
        csvfile.seek(0)
        dialect = csv.Sniffer().sniff(sample)
        
        reader = csv.reader(csvfile, dialect)
        headers = next(reader)  # Skip header row
        
        print(f'Found {len(headers)} columns in CSV')
        
        # Process data rows
        for row_num, row in enumerate(reader, start=2):
            stats['total'] += 1
            
            # Ensure we have enough columns (at least 28 based on comments field)
            if len(row) < 25:  # Minimum required columns
                errors.append(f'Row {row_num}: Insufficient columns ({len(row)})')
                stats['invalid'] += 1
                continue
            
            # Extract required fields by position
            drop_id = row[0].strip() if row[0] else ''         # label
            strtfeat = row[10].strip() if len(row) > 10 else '' # strtfeat (pole reference)
            endfeat = row[11].strip() if len(row) > 11 else ''  # endfeat (ONT reference)
            dim2 = row[5].strip() if len(row) > 5 else ''       # dim2 (cable length)
            lat = row[12].strip() if len(row) > 12 else ''      # lat
            lon = row[13].strip() if len(row) > 13 else ''      # lon
            pon_no = row[17].strip() if len(row) > 17 else ''   # pon_no
            zone_no = row[18].strip() if len(row) > 18 else ''  # zone_no
            datecrtd = row[23].strip() if len(row) > 23 else '' # datecrtd
            crtdby = row[24].strip() if len(row) > 24 else ''   # crtdby
            
            # Validate required fields
            if not drop_id or not drop_id.startswith('DR'):
                errors.append(f'Row {row_num}: Invalid or missing drop ID: {drop_id}')
                stats['invalid'] += 1
                continue
            
            if not strtfeat:
                errors.append(f'Row {row_num}: Missing pole reference (strtfeat)')
                stats['invalid'] += 1
                continue
            
            # Parse and transform data
            is_spare = is_spare_drop(endfeat)
            cable_length_numeric = extract_numeric_cable_length(dim2)
            latitude = parse_coordinate(lat)
            longitude = parse_coordinate(lon)
            date_created = parse_date(datecrtd)
            
            # Create drop object with required fields
            drop = {
                'dropId': drop_id,
                'poleReference': strtfeat,
                'ontReference': endfeat if endfeat else None,
                'cableLength': dim2,
                'cableLengthNumeric': cable_length_numeric,
                'ponNumber': pon_no,
                'zoneNumber': zone_no,
                'latitude': latitude,
                'longitude': longitude,
                'dateCreated': date_created,
                'createdBy': crtdby,
                # Additional fields
                'isSpare': is_spare
            }
            
            drops.append(drop)
            stats['valid'] += 1
            
            # Update statistics
            if is_spare:
                stats['spareDrops'] += 1
            else:
                stats['activeDrops'] += 1
            
            if latitude and longitude:
                stats['withGPS'] += 1
            else:
                stats['withoutGPS'] += 1
            
            # Track unique poles
            stats['uniquePoles'].add(strtfeat)
    
    # Convert set to count for JSON serialization
    unique_pole_count = len(stats['uniquePoles'])
    stats['uniquePoles'] = unique_pole_count
    
    # Write JSON output
    json_output = {
        'extractionDate': datetime.now().isoformat(),
        'sourceFile': INPUT_FILE,
        'statistics': stats,
        'drops': drops,
        'errors': errors
    }
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(json_output, f, indent=2, ensure_ascii=False)
    
    print(f'\nJSON output written to: {OUTPUT_JSON}')
    
    # Write CSV output
    csv_headers = [
        'dropId',
        'poleReference',
        'ontReference',
        'cableLength',
        'cableLengthNumeric',
        'ponNumber',
        'zoneNumber',
        'latitude',
        'longitude',
        'dateCreated',
        'createdBy',
        'isSpare'
    ]
    
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=csv_headers, extrasaction='ignore')
        writer.writeheader()
        
        for drop in drops:
            # Convert None values to empty strings for CSV
            csv_drop = {k: (v if v is not None else '') for k, v in drop.items()}
            # Convert boolean to string for CSV
            csv_drop['isSpare'] = 'TRUE' if drop['isSpare'] else 'FALSE'
            writer.writerow(csv_drop)
    
    print(f'CSV output written to: {OUTPUT_CSV}')
    
    # Print summary
    print('\n=== EXTRACTION SUMMARY ===')
    print(f'Total records processed: {stats["total"]}')
    print(f'Valid drops extracted: {stats["valid"]}')
    print(f'Invalid records: {stats["invalid"]}')
    print(f'\nDrop Types:')
    print(f'  - Active drops: {stats["activeDrops"]}')
    print(f'  - Spare drops: {stats["spareDrops"]}')
    print(f'\nGPS Data:')
    print(f'  - With GPS coordinates: {stats["withGPS"]}')
    print(f'  - Without GPS coordinates: {stats["withoutGPS"]}')
    print(f'\nPole References:')
    print(f'  - Unique poles referenced: {unique_pole_count}')
    
    if errors:
        print(f'\n=== ERRORS (First 10) ===')
        for error in errors[:10]:
            print(error)
        if len(errors) > 10:
            print(f'... and {len(errors) - 10} more errors')
    
    print('\nExtraction completed successfully!')
    return json_output


if __name__ == '__main__':
    try:
        extract_drop_data()
    except Exception as e:
        print(f'Error: {e}')
        exit(1)