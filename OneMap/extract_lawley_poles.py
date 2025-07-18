#!/usr/bin/env python3
"""
Lawley Poles Data Extraction Script
Date: 2025-01-16

Purpose: Extract only required fields from Lawley Pole CSV file
Input: /home/ldp/Downloads/Lawley Pole (CSV).csv
Output: 
  - output/lawley-poles-extracted.json
  - output/lawley-poles-extracted.csv

Required fields:
  - label_1 (Pole ID)
  - dim1 (Height)
  - dim2 (Diameter)
  - status
  - lat/lon (GPS coordinates)
  - pon_no
  - zone_no

Transformations:
  - Classify pole type based on diameter
  - Add connectedDrops array (empty initially)
  - Add dropCount field (0 initially)
"""

import csv
import json
import os
from datetime import datetime
from pathlib import Path

# Configuration
INPUT_FILE = '/home/ldp/Downloads/Lawley Pole (CSV).csv'
OUTPUT_DIR = Path(__file__).parent / 'output'
OUTPUT_JSON = OUTPUT_DIR / 'lawley-poles-extracted.json'
OUTPUT_CSV = OUTPUT_DIR / 'lawley-poles-extracted.csv'

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)


def classify_pole_type(diameter):
    """
    Determine pole type based on diameter
    Args:
        diameter: Diameter string like "140-160mm" or "120-140mm"
    Returns:
        "feeder" or "distribution" or "unknown"
    """
    if not diameter:
        return 'unknown'
    
    # Check for feeder pole diameters (140-160mm)
    if '140-160' in diameter or '160-180' in diameter:
        return 'feeder'
    # Check for distribution pole diameters (120-140mm)
    elif '120-140' in diameter or '100-120' in diameter:
        return 'distribution'
    
    return 'unknown'


def extract_numeric_value(dimension):
    """
    Extract numeric value from dimension string
    Args:
        dimension: Dimension string like "7m"
    Returns:
        Numeric value or None
    """
    if not dimension:
        return None
    
    # Extract number from string
    import re
    match = re.search(r'(\d+(?:\.\d+)?)', dimension)
    return float(match.group(1)) if match else None


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


def extract_pole_data():
    """Main extraction function"""
    print('Starting Lawley Poles extraction...')
    print(f'Date: {datetime.now().isoformat()}')
    print(f'Input file: {INPUT_FILE}')
    
    # Check if input file exists
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(f'Input file not found: {INPUT_FILE}')
    
    poles = []
    errors = []
    stats = {
        'total': 0,
        'valid': 0,
        'invalid': 0,
        'feederPoles': 0,
        'distributionPoles': 0,
        'unknownType': 0,
        'withGPS': 0,
        'withoutGPS': 0
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
            
            # Ensure we have enough columns
            if len(row) < 79:  # Need at least up to zone_no column
                errors.append(f'Row {row_num}: Insufficient columns ({len(row)})')
                stats['invalid'] += 1
                continue
            
            # Extract required fields by position
            # Based on the CSV structure observed
            pole_id = row[0].strip() if row[0] else ''  # label_1
            height = row[4].strip() if len(row) > 4 else ''   # dim1
            diameter = row[5].strip() if len(row) > 5 else ''  # dim2
            status = row[8].strip() if len(row) > 8 else ''    # status
            lat = row[75].strip() if len(row) > 75 else ''     # lat (column 76 in 1-based)
            lon = row[76].strip() if len(row) > 76 else ''     # lon (column 77 in 1-based)
            pon_no = row[80].strip() if len(row) > 80 else ''  # pon_no (column 81 in 1-based)
            zone_no = row[81].strip() if len(row) > 81 else '' # zone_no (column 82 in 1-based)
            
            # Validate required fields
            if not pole_id or not pole_id.startswith('LAW.P.'):
                errors.append(f'Row {row_num}: Invalid or missing pole ID: {pole_id}')
                stats['invalid'] += 1
                continue
            
            # Parse and transform data
            pole_type = classify_pole_type(diameter)
            height_numeric = extract_numeric_value(height)
            latitude = parse_coordinate(lat)
            longitude = parse_coordinate(lon)
            
            # Create pole object with required fields
            pole = {
                'poleId': pole_id,
                'height': height,
                'heightNumeric': height_numeric,
                'diameter': diameter,
                'poleType': pole_type,
                'status': status,
                'latitude': latitude,
                'longitude': longitude,
                'ponNumber': pon_no,
                'zoneNumber': zone_no,
                # Additional fields for relationship tracking
                'connectedDrops': [],
                'dropCount': 0
            }
            
            poles.append(pole)
            stats['valid'] += 1
            
            # Update statistics
            if pole_type == 'feeder':
                stats['feederPoles'] += 1
            elif pole_type == 'distribution':
                stats['distributionPoles'] += 1
            else:
                stats['unknownType'] += 1
            
            if latitude and longitude:
                stats['withGPS'] += 1
            else:
                stats['withoutGPS'] += 1
    
    # Write JSON output
    json_output = {
        'extractionDate': datetime.now().isoformat(),
        'sourceFile': INPUT_FILE,
        'statistics': stats,
        'poles': poles,
        'errors': errors
    }
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(json_output, f, indent=2, ensure_ascii=False)
    
    print(f'\nJSON output written to: {OUTPUT_JSON}')
    
    # Write CSV output
    csv_headers = [
        'poleId',
        'height',
        'heightNumeric',
        'diameter',
        'poleType',
        'status',
        'latitude',
        'longitude',
        'ponNumber',
        'zoneNumber',
        'dropCount'
    ]
    
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=csv_headers, extrasaction='ignore')
        writer.writeheader()
        
        for pole in poles:
            # Convert None values to empty strings for CSV
            csv_pole = {k: (v if v is not None else '') for k, v in pole.items()}
            writer.writerow(csv_pole)
    
    print(f'CSV output written to: {OUTPUT_CSV}')
    
    # Print summary
    print('\n=== EXTRACTION SUMMARY ===')
    print(f'Total records processed: {stats["total"]}')
    print(f'Valid poles extracted: {stats["valid"]}')
    print(f'Invalid records: {stats["invalid"]}')
    print(f'\nPole Types:')
    print(f'  - Feeder poles: {stats["feederPoles"]}')
    print(f'  - Distribution poles: {stats["distributionPoles"]}')
    print(f'  - Unknown type: {stats["unknownType"]}')
    print(f'\nGPS Data:')
    print(f'  - With GPS coordinates: {stats["withGPS"]}')
    print(f'  - Without GPS coordinates: {stats["withoutGPS"]}')
    
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
        extract_pole_data()
    except Exception as e:
        print(f'Error: {e}')
        exit(1)