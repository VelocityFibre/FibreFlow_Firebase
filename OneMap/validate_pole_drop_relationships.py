#!/usr/bin/env python3
"""
Pole-Drop Relationship Validation Script
Date: 2025-01-16

Purpose: Validate relationships between poles and drops
Input: 
  - output/lawley-poles-extracted.json
  - output/lawley-drops-extracted.json
Output:
  - output/relationship-validation-report.json
  - output/poles-with-drops.json (updated pole data)

Validations:
  - All drop pole references exist
  - Pole capacity limits (max 12 drops)
  - Update connectedDrops arrays
  - Update dropCount fields
"""

import json
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Configuration
OUTPUT_DIR = Path(__file__).parent / 'output'
POLES_JSON = OUTPUT_DIR / 'lawley-poles-extracted.json'
DROPS_JSON = OUTPUT_DIR / 'lawley-drops-extracted.json'
REPORT_JSON = OUTPUT_DIR / 'relationship-validation-report.json'
UPDATED_POLES_JSON = OUTPUT_DIR / 'poles-with-drops.json'

# Constants
MAX_DROPS_PER_POLE = 12


def load_json_data(filepath):
    """Load JSON data from file"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f'File not found: {filepath}')
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_relationships():
    """Main validation function"""
    print('Starting Pole-Drop Relationship Validation...')
    print(f'Date: {datetime.now().isoformat()}')
    
    # Load data
    print('\nLoading data files...')
    poles_data = load_json_data(POLES_JSON)
    drops_data = load_json_data(DROPS_JSON)
    
    poles = poles_data['poles']
    drops = drops_data['drops']
    
    print(f'Loaded {len(poles)} poles')
    print(f'Loaded {len(drops)} drops')
    
    # Create pole lookup dictionary
    pole_dict = {pole['poleId']: pole for pole in poles}
    
    # Initialize validation report
    report = {
        'validationDate': datetime.now().isoformat(),
        'statistics': {
            'totalPoles': len(poles),
            'totalDrops': len(drops),
            'polesWithDrops': 0,
            'polesWithoutDrops': 0,
            'dropsWithValidPole': 0,
            'orphanedDrops': 0,
            'polesAtCapacity': 0,
            'polesOverCapacity': 0,
            'averageDropsPerPole': 0
        },
        'errors': [],
        'warnings': [],
        'orphanedDrops': [],
        'capacityIssues': []
    }
    
    # Track drop assignments
    pole_drops = defaultdict(list)
    
    # Validate each drop
    print('\nValidating drop-to-pole relationships...')
    for drop in drops:
        drop_id = drop['dropId']
        pole_ref = drop['poleReference']
        
        # Check if pole exists
        if pole_ref in pole_dict:
            pole_drops[pole_ref].append(drop_id)
            report['statistics']['dropsWithValidPole'] += 1
        else:
            report['statistics']['orphanedDrops'] += 1
            report['orphanedDrops'].append({
                'dropId': drop_id,
                'invalidPoleReference': pole_ref,
                'isSpare': drop.get('isSpare', False)
            })
            report['errors'].append(
                f'Drop {drop_id} references non-existent pole {pole_ref}'
            )
    
    # Update pole data with connected drops
    print('\nUpdating pole data with connected drops...')
    total_drops_assigned = 0
    
    for pole in poles:
        pole_id = pole['poleId']
        connected_drops = pole_drops.get(pole_id, [])
        
        # Update pole with connected drops
        pole['connectedDrops'] = connected_drops
        pole['dropCount'] = len(connected_drops)
        
        # Update statistics
        if connected_drops:
            report['statistics']['polesWithDrops'] += 1
            total_drops_assigned += len(connected_drops)
        else:
            report['statistics']['polesWithoutDrops'] += 1
        
        # Check capacity
        drop_count = len(connected_drops)
        if drop_count >= MAX_DROPS_PER_POLE:
            if drop_count == MAX_DROPS_PER_POLE:
                report['statistics']['polesAtCapacity'] += 1
                report['warnings'].append(
                    f'Pole {pole_id} is at capacity with {drop_count} drops'
                )
            else:
                report['statistics']['polesOverCapacity'] += 1
                report['capacityIssues'].append({
                    'poleId': pole_id,
                    'dropCount': drop_count,
                    'overCapacityBy': drop_count - MAX_DROPS_PER_POLE,
                    'connectedDrops': connected_drops
                })
                report['errors'].append(
                    f'Pole {pole_id} exceeds capacity with {drop_count} drops (max: {MAX_DROPS_PER_POLE})'
                )
        elif drop_count >= MAX_DROPS_PER_POLE - 2:
            # Warning when approaching capacity
            report['warnings'].append(
                f'Pole {pole_id} approaching capacity: {drop_count}/{MAX_DROPS_PER_POLE} drops'
            )
    
    # Calculate average drops per pole
    if report['statistics']['polesWithDrops'] > 0:
        report['statistics']['averageDropsPerPole'] = round(
            total_drops_assigned / report['statistics']['polesWithDrops'], 2
        )
    
    # Additional analysis
    print('\nPerforming additional analysis...')
    
    # Find poles with the most drops
    poles_by_drop_count = sorted(poles, key=lambda p: p['dropCount'], reverse=True)
    top_10_poles = poles_by_drop_count[:10]
    
    report['analysis'] = {
        'topPolesbyDropCount': [
            {
                'poleId': p['poleId'],
                'dropCount': p['dropCount'],
                'poleType': p.get('poleType', 'unknown'),
                'status': p.get('status', '')
            }
            for p in top_10_poles
        ]
    }
    
    # Summary by pole type
    pole_type_summary = defaultdict(lambda: {'count': 0, 'totalDrops': 0})
    for pole in poles:
        pole_type = pole.get('poleType', 'unknown')
        pole_type_summary[pole_type]['count'] += 1
        pole_type_summary[pole_type]['totalDrops'] += pole['dropCount']
    
    report['analysis']['poleTypeSummary'] = dict(pole_type_summary)
    
    # Write validation report
    with open(REPORT_JSON, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f'\nValidation report written to: {REPORT_JSON}')
    
    # Write updated poles data
    updated_poles_data = {
        'extractionDate': poles_data['extractionDate'],
        'updateDate': datetime.now().isoformat(),
        'sourceFile': poles_data['sourceFile'],
        'statistics': {
            **poles_data['statistics'],
            'polesWithDrops': report['statistics']['polesWithDrops'],
            'polesWithoutDrops': report['statistics']['polesWithoutDrops'],
            'totalDropsAssigned': total_drops_assigned
        },
        'poles': poles
    }
    
    with open(UPDATED_POLES_JSON, 'w', encoding='utf-8') as f:
        json.dump(updated_poles_data, f, indent=2, ensure_ascii=False)
    
    print(f'Updated poles data written to: {UPDATED_POLES_JSON}')
    
    # Print summary
    print('\n=== VALIDATION SUMMARY ===')
    print(f'Total poles: {report["statistics"]["totalPoles"]}')
    print(f'Total drops: {report["statistics"]["totalDrops"]}')
    print(f'\nPole Status:')
    print(f'  - Poles with drops: {report["statistics"]["polesWithDrops"]}')
    print(f'  - Poles without drops: {report["statistics"]["polesWithoutDrops"]}')
    print(f'  - Average drops per pole: {report["statistics"]["averageDropsPerPole"]}')
    print(f'\nDrop Status:')
    print(f'  - Drops with valid pole: {report["statistics"]["dropsWithValidPole"]}')
    print(f'  - Orphaned drops: {report["statistics"]["orphanedDrops"]}')
    print(f'\nCapacity Status:')
    print(f'  - Poles at capacity: {report["statistics"]["polesAtCapacity"]}')
    print(f'  - Poles over capacity: {report["statistics"]["polesOverCapacity"]}')
    
    if report['errors']:
        print(f'\n⚠️  Found {len(report["errors"])} errors')
        print('First 5 errors:')
        for error in report['errors'][:5]:
            print(f'  - {error}')
    
    if report['warnings']:
        print(f'\n⚠️  Found {len(report["warnings"])} warnings')
        print('First 5 warnings:')
        for warning in report['warnings'][:5]:
            print(f'  - {warning}')
    
    print('\nValidation completed!')
    return report


if __name__ == '__main__':
    try:
        # First check if input files exist
        if not os.path.exists(POLES_JSON):
            print(f'Error: Poles data not found. Please run extract_lawley_poles.py first.')
            exit(1)
        
        if not os.path.exists(DROPS_JSON):
            print(f'Error: Drops data not found. Please run extract_lawley_drops.py first.')
            exit(1)
        
        validate_relationships()
    except Exception as e:
        print(f'Error: {e}')
        exit(1)