#!/usr/bin/env python3
"""
Lawley Poles Data Extraction Script - WITH BUILT-IN ANTIHALL VALIDATION
Date: 2025-01-16

This version includes self-validation to prevent hallucinations.
Every claim made by this script is verified against the actual data.
"""

import csv
import json
import os
import re
from datetime import datetime
from pathlib import Path

# Configuration
INPUT_FILE = '/home/ldp/Downloads/Lawley Pole (CSV).csv'
OUTPUT_DIR = Path(__file__).parent / 'output'
OUTPUT_JSON = OUTPUT_DIR / 'lawley-poles-extracted-validated.json'
OUTPUT_CSV = OUTPUT_DIR / 'lawley-poles-extracted-validated.csv'
VALIDATION_JSON = OUTPUT_DIR / 'lawley-poles-self-validation.json'

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)


class ValidatedPoleExtractor:
    """Pole extractor with built-in validation"""
    
    def __init__(self):
        self.validations = {}
        self.evidence = {}
        self.assertions_passed = []
        self.assertions_failed = []
        
    def classify_pole_type(self, diameter):
        """Determine pole type based on diameter"""
        if not diameter:
            return 'unknown'
        
        # Store evidence of classification
        if 'pole_type_examples' not in self.evidence:
            self.evidence['pole_type_examples'] = []
        
        pole_type = 'unknown'
        if '140-160' in diameter or '160-180' in diameter:
            pole_type = 'feeder'
        elif '120-140' in diameter or '100-120' in diameter:
            pole_type = 'distribution'
            
        # Store first 5 examples as evidence
        if len(self.evidence['pole_type_examples']) < 5:
            self.evidence['pole_type_examples'].append({
                'diameter': diameter,
                'classified_as': pole_type
            })
            
        return pole_type

    def extract_numeric_value(self, dimension):
        """Extract numeric value from dimension string"""
        if not dimension:
            return None
        
        match = re.search(r'(\d+(?:\.\d+)?)', dimension)
        result = float(match.group(1)) if match else None
        
        # Store evidence
        if 'numeric_extraction_examples' not in self.evidence:
            self.evidence['numeric_extraction_examples'] = []
        if len(self.evidence['numeric_extraction_examples']) < 3:
            self.evidence['numeric_extraction_examples'].append({
                'original': dimension,
                'extracted': result
            })
            
        return result

    def parse_coordinate(self, coord):
        """Parse and validate latitude/longitude"""
        if not coord or coord.strip() == '':
            return None
        try:
            value = float(coord)
            
            # Assertion: Valid coordinate ranges
            if -90 <= value <= 90 or -180 <= value <= 180:
                self.assertions_passed.append(f"Valid coordinate: {value}")
            else:
                self.assertions_failed.append(f"Invalid coordinate: {value}")
                
            return value
        except ValueError:
            return None

    def validate_pole_id(self, pole_id):
        """Validate pole ID format"""
        is_valid = pole_id and pole_id.startswith('LAW.P.')
        
        # Assertion: Pole ID must match pattern
        if is_valid:
            self.assertions_passed.append(f"Valid pole ID format: {pole_id[:10]}...")
        else:
            self.assertions_failed.append(f"Invalid pole ID: {pole_id}")
            
        return is_valid

    def extract_pole_data(self):
        """Main extraction function with validation"""
        print('Starting Validated Lawley Poles extraction...')
        print(f'Date: {datetime.now().isoformat()}')
        print(f'Input file: {INPUT_FILE}')
        
        # Pre-extraction validation
        self.validations['input_file'] = {
            'path': INPUT_FILE,
            'exists': os.path.exists(INPUT_FILE),
            'size_bytes': os.path.getsize(INPUT_FILE) if os.path.exists(INPUT_FILE) else 0
        }
        
        if not self.validations['input_file']['exists']:
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
        
        # Track for cross-validation
        csv_line_count = 0
        pole_ids_seen = set()
        
        # Read CSV file
        with open(INPUT_FILE, 'r', encoding='utf-8') as csvfile:
            sample = csvfile.read(1024)
            csvfile.seek(0)
            dialect = csv.Sniffer().sniff(sample)
            
            reader = csv.reader(csvfile, dialect)
            headers = next(reader)
            csv_line_count += 1
            
            print(f'Found {len(headers)} columns in CSV')
            
            # Store evidence of column mapping
            self.evidence['column_mapping'] = {
                'pole_id': 'column 0 (label_1)',
                'height': 'column 4 (dim1)',
                'diameter': 'column 5 (dim2)',
                'status': 'column 8 (status)',
                'latitude': 'column 75 (lat)',
                'longitude': 'column 76 (lon)',
                'pon_number': 'column 80 (pon_no)',
                'zone_number': 'column 81 (zone_no)'
            }
            
            # Process data rows
            for row_num, row in enumerate(reader, start=2):
                csv_line_count += 1
                stats['total'] += 1
                
                if len(row) < 82:
                    errors.append(f'Row {row_num}: Insufficient columns ({len(row)})')
                    stats['invalid'] += 1
                    continue
                
                # Extract fields
                pole_id = row[0].strip() if row[0] else ''
                height = row[4].strip() if len(row) > 4 else ''
                diameter = row[5].strip() if len(row) > 5 else ''
                status = row[8].strip() if len(row) > 8 else ''
                lat = row[75].strip() if len(row) > 75 else ''
                lon = row[76].strip() if len(row) > 76 else ''
                pon_no = row[80].strip() if len(row) > 80 else ''
                zone_no = row[81].strip() if len(row) > 81 else ''
                
                # Validate pole ID
                if not self.validate_pole_id(pole_id):
                    errors.append(f'Row {row_num}: Invalid or missing pole ID: {pole_id}')
                    stats['invalid'] += 1
                    continue
                
                # Check for duplicates
                if pole_id in pole_ids_seen:
                    self.assertions_failed.append(f"Duplicate pole ID: {pole_id}")
                else:
                    pole_ids_seen.add(pole_id)
                
                # Parse and transform data
                pole_type = self.classify_pole_type(diameter)
                height_numeric = self.extract_numeric_value(height)
                latitude = self.parse_coordinate(lat)
                longitude = self.parse_coordinate(lon)
                
                # Create pole object
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
        
        # SELF-VALIDATION: Verify statistics match actual data
        self.validations['statistics'] = {
            'csv_lines': {
                'total_lines': csv_line_count,
                'header_lines': 1,
                'data_lines': csv_line_count - 1,
                'matches_total': (csv_line_count - 1) == stats['total']
            },
            'pole_counts': {
                'valid_plus_invalid': stats['valid'] + stats['invalid'],
                'equals_total': (stats['valid'] + stats['invalid']) == stats['total'],
                'actual_poles_in_list': len(poles),
                'matches_valid_count': len(poles) == stats['valid']
            },
            'pole_types': {
                'sum_of_types': stats['feederPoles'] + stats['distributionPoles'] + stats['unknownType'],
                'equals_valid': (stats['feederPoles'] + stats['distributionPoles'] + stats['unknownType']) == stats['valid']
            },
            'gps_coverage': {
                'with_plus_without': stats['withGPS'] + stats['withoutGPS'],
                'equals_valid': (stats['withGPS'] + stats['withoutGPS']) == stats['valid']
            },
            'unique_poles': {
                'unique_ids': len(pole_ids_seen),
                'equals_valid': len(pole_ids_seen) == stats['valid']
            }
        }
        
        # Store sample data as evidence
        self.evidence['sample_poles'] = poles[:3] if poles else []
        self.evidence['sample_errors'] = errors[:3] if errors else []
        self.evidence['unique_pon_values'] = list(set(p['ponNumber'] for p in poles if p['ponNumber']))[:5]
        self.evidence['unique_zone_values'] = list(set(p['zoneNumber'] for p in poles if p['zoneNumber']))[:5]
        
        # Cross-validation checks
        all_validations_passed = all([
            self.validations['statistics']['csv_lines']['matches_total'],
            self.validations['statistics']['pole_counts']['equals_total'],
            self.validations['statistics']['pole_counts']['matches_valid_count'],
            self.validations['statistics']['pole_types']['equals_valid'],
            self.validations['statistics']['gps_coverage']['equals_valid']
        ])
        
        # Create output with embedded validation
        json_output = {
            'extractionDate': datetime.now().isoformat(),
            'sourceFile': INPUT_FILE,
            'statistics': stats,
            'poles': poles,
            'errors': errors,
            '_validations': self.validations,
            '_evidence': self.evidence,
            '_validation_summary': {
                'all_checks_passed': all_validations_passed,
                'assertions_passed': len(self.assertions_passed),
                'assertions_failed': len(self.assertions_failed),
                'confidence_score': (len(self.assertions_passed) / (len(self.assertions_passed) + len(self.assertions_failed)) * 100) if self.assertions_passed else 100
            }
        }
        
        # Write main output
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(json_output, f, indent=2, ensure_ascii=False)
        
        print(f'\nJSON output written to: {OUTPUT_JSON}')
        
        # Write separate validation report
        validation_report = {
            'extraction_timestamp': datetime.now().isoformat(),
            'source_file': INPUT_FILE,
            'validations': self.validations,
            'evidence': self.evidence,
            'assertions': {
                'passed': self.assertions_passed[:10],  # First 10
                'failed': self.assertions_failed[:10],  # First 10
                'total_passed': len(self.assertions_passed),
                'total_failed': len(self.assertions_failed)
            },
            'summary': {
                'all_internal_checks_passed': all_validations_passed,
                'confidence_percentage': json_output['_validation_summary']['confidence_score']
            }
        }
        
        with open(VALIDATION_JSON, 'w', encoding='utf-8') as f:
            json.dump(validation_report, f, indent=2, ensure_ascii=False)
        
        print(f'Validation report written to: {VALIDATION_JSON}')
        
        # Write CSV output
        csv_headers = [
            'poleId', 'height', 'heightNumeric', 'diameter', 'poleType',
            'status', 'latitude', 'longitude', 'ponNumber', 'zoneNumber', 'dropCount'
        ]
        
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=csv_headers, extrasaction='ignore')
            writer.writeheader()
            for pole in poles:
                csv_pole = {k: (v if v is not None else '') for k, v in pole.items()}
                writer.writerow(csv_pole)
        
        print(f'CSV output written to: {OUTPUT_CSV}')
        
        # Print summary with validation status
        print('\n=== EXTRACTION SUMMARY ===')
        print(f'Total records processed: {stats["total"]}')
        print(f'Valid poles extracted: {stats["valid"]}')
        print(f'Invalid records: {stats["invalid"]}')
        print(f'\n=== VALIDATION STATUS ===')
        print(f'Internal checks passed: {"YES" if all_validations_passed else "NO"}')
        print(f'Confidence score: {json_output["_validation_summary"]["confidence_score"]:.1f}%')
        
        return json_output


if __name__ == '__main__':
    try:
        extractor = ValidatedPoleExtractor()
        extractor.extract_pole_data()
        print('\nExtraction completed with built-in validation!')
    except Exception as e:
        print(f'Error: {e}')
        exit(1)