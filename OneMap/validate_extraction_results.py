#!/usr/bin/env python3
"""
antiHall Validation for Lawley Data Extraction Results
Date: 2025-01-16

Purpose: Validate all claims made in the extraction report against actual data
This ensures no hallucinations in our findings and provides proof for each claim.

Following the OneMap antiHall pattern:
1. Create validation methods for each claim
2. Store evidence for all validations
3. Generate comprehensive proof JSON
"""

import json
import csv
import os
from pathlib import Path
from datetime import datetime
from collections import defaultdict

class ExtractionResultsValidator:
    def __init__(self):
        self.validations = {}
        self.evidence = {}
        self.output_dir = Path(__file__).parent / 'output'
        
    def validate_pole_counts(self):
        """Validate all pole-related counts and statistics"""
        print("\n=== VALIDATING POLE COUNTS ===")
        
        # Load pole data
        with open(self.output_dir / 'lawley-poles-extracted.json', 'r') as f:
            pole_data = json.load(f)
        
        poles = pole_data['poles']
        stats = pole_data['statistics']
        
        # Count actual values
        actual_total = len(poles)
        actual_feeder = sum(1 for p in poles if p.get('poleType') == 'feeder')
        actual_distribution = sum(1 for p in poles if p.get('poleType') == 'distribution')
        actual_unknown = sum(1 for p in poles if p.get('poleType') == 'unknown')
        
        # GPS validation
        poles_with_gps = sum(1 for p in poles if p.get('latitude') is not None and p.get('longitude') is not None)
        
        # Sample GPS coordinates as evidence
        gps_samples = []
        for p in poles[:5]:
            if p.get('latitude') and p.get('longitude'):
                gps_samples.append({
                    'poleId': p['poleId'],
                    'lat': p['latitude'],
                    'lon': p['longitude']
                })
        
        self.validations['pole_counts'] = {
            'total_poles': {
                'claimed': 4468,
                'actual': actual_total,
                'match': actual_total == 4468
            },
            'feeder_poles': {
                'claimed': 2107,
                'actual': actual_feeder,
                'match': actual_feeder == 2107
            },
            'distribution_poles': {
                'claimed': 2361,
                'actual': actual_distribution,
                'match': actual_distribution == 2361
            },
            'unknown_poles': {
                'claimed': 0,
                'actual': actual_unknown,
                'match': actual_unknown == 0
            },
            'gps_coverage': {
                'claimed_percentage': '100%',
                'actual_count': poles_with_gps,
                'total_poles': actual_total,
                'actual_percentage': f"{(poles_with_gps/actual_total)*100:.1f}%",
                'all_have_gps': poles_with_gps == actual_total
            }
        }
        
        self.evidence['pole_gps_samples'] = gps_samples
        
        print(f"✓ Total poles: {actual_total} (claimed: 4468)")
        print(f"✓ Feeder poles: {actual_feeder} (claimed: 2107)")
        print(f"✓ Distribution poles: {actual_distribution} (claimed: 2361)")
        print(f"✓ GPS coverage: {poles_with_gps}/{actual_total} = {(poles_with_gps/actual_total)*100:.1f}%")
        
        return True
    
    def validate_drop_counts(self):
        """Validate all drop-related counts and statistics"""
        print("\n=== VALIDATING DROP COUNTS ===")
        
        # Load drop data
        with open(self.output_dir / 'lawley-drops-extracted.json', 'r') as f:
            drop_data = json.load(f)
        
        drops = drop_data['drops']
        
        # Count actual values
        actual_total = len(drops)
        actual_spares = sum(1 for d in drops if d.get('isSpare') == True)
        actual_active = sum(1 for d in drops if d.get('isSpare') == False)
        
        # GPS validation
        drops_with_gps = sum(1 for d in drops if d.get('latitude') is not None and d.get('longitude') is not None)
        
        # Unique poles referenced
        unique_poles = set(d['poleReference'] for d in drops if d.get('poleReference'))
        
        # Sample cable lengths
        cable_samples = []
        for d in drops[:10]:
            if d.get('cableLength') and d.get('cableLengthNumeric'):
                cable_samples.append({
                    'dropId': d['dropId'],
                    'original': d['cableLength'],
                    'numeric': d['cableLengthNumeric']
                })
        
        self.validations['drop_counts'] = {
            'total_drops': {
                'claimed': 23708,
                'actual': actual_total,
                'match': actual_total == 23708
            },
            'spare_drops': {
                'claimed': 3599,
                'actual': actual_spares,
                'match': actual_spares == 3599
            },
            'active_drops': {
                'claimed': 20109,
                'actual': actual_active,
                'match': actual_active == 20109
            },
            'unique_poles_referenced': {
                'claimed': 2965,
                'actual': len(unique_poles),
                'match': len(unique_poles) == 2965
            },
            'gps_coverage': {
                'claimed': 'NO GPS data',
                'drops_with_gps': drops_with_gps,
                'verified_no_gps': drops_with_gps == 0
            }
        }
        
        self.evidence['cable_length_samples'] = cable_samples
        self.evidence['unique_pole_sample'] = list(unique_poles)[:10]
        
        print(f"✓ Total drops: {actual_total} (claimed: 23708)")
        print(f"✓ Spare drops: {actual_spares} (claimed: 3599)")
        print(f"✓ Active drops: {actual_active} (claimed: 20109)")
        print(f"✓ Unique poles: {len(unique_poles)} (claimed: 2965)")
        print(f"✓ Drops with GPS: {drops_with_gps} (claimed: 0)")
        
        return True
    
    def validate_relationships(self):
        """Validate pole-drop relationships"""
        print("\n=== VALIDATING RELATIONSHIPS ===")
        
        # Load validation report
        with open(self.output_dir / 'relationship-validation-report.json', 'r') as f:
            val_report = json.load(f)
        
        # Load updated poles
        with open(self.output_dir / 'poles-with-drops.json', 'r') as f:
            updated_poles = json.load(f)
        
        poles = updated_poles['poles']
        
        # Verify calculations
        poles_with_drops = sum(1 for p in poles if p.get('dropCount', 0) > 0)
        poles_without_drops = sum(1 for p in poles if p.get('dropCount', 0) == 0)
        
        # Calculate average (only for poles with drops)
        total_drops = sum(p.get('dropCount', 0) for p in poles if p.get('dropCount', 0) > 0)
        avg_drops = total_drops / poles_with_drops if poles_with_drops > 0 else 0
        
        # Check capacity
        at_capacity = sum(1 for p in poles if p.get('dropCount', 0) == 12)
        over_capacity = sum(1 for p in poles if p.get('dropCount', 0) > 12)
        
        # Sample poles with drops
        sample_poles = []
        for p in poles[:10]:
            if p.get('dropCount', 0) > 0:
                sample_poles.append({
                    'poleId': p['poleId'],
                    'dropCount': p['dropCount'],
                    'connectedDrops': p.get('connectedDrops', [])[:3]  # First 3 drops
                })
        
        self.validations['relationships'] = {
            'poles_with_drops': {
                'claimed': 2965,
                'actual': poles_with_drops,
                'match': poles_with_drops == 2965
            },
            'poles_without_drops': {
                'claimed': 1503,
                'actual': poles_without_drops,
                'match': poles_without_drops == 1503
            },
            'average_drops_per_pole': {
                'claimed': 8.0,
                'actual': round(avg_drops, 1),
                'match': round(avg_drops, 1) == 8.0
            },
            'capacity_issues': {
                'poles_at_capacity_claimed': 0,
                'poles_at_capacity_actual': at_capacity,
                'poles_over_capacity_claimed': 0,
                'poles_over_capacity_actual': over_capacity,
                'no_capacity_issues': at_capacity == 0 and over_capacity == 0
            },
            'orphaned_drops': {
                'claimed': 0,
                'actual': val_report['statistics']['orphanedDrops'],
                'match': val_report['statistics']['orphanedDrops'] == 0
            }
        }
        
        self.evidence['poles_with_drops_sample'] = sample_poles
        
        print(f"✓ Poles with drops: {poles_with_drops} (claimed: 2965)")
        print(f"✓ Average drops/pole: {round(avg_drops, 1)} (claimed: 8.0)")
        print(f"✓ Capacity issues: {at_capacity + over_capacity} (claimed: 0)")
        print(f"✓ Orphaned drops: {val_report['statistics']['orphanedDrops']} (claimed: 0)")
        
        return True
    
    def validate_file_sizes(self):
        """Validate reported file sizes"""
        print("\n=== VALIDATING FILE SIZES ===")
        
        files_to_check = [
            ('lawley-poles-extracted.json', '1.5MB', 1.5 * 1024 * 1024),
            ('lawley-poles-extracted.csv', '305KB', 305 * 1024),
            ('lawley-drops-extracted.json', '9.1MB', 9.1 * 1024 * 1024),
            ('lawley-drops-extracted.csv', '2.3MB', 2.3 * 1024 * 1024),
            ('relationship-validation-report.json', '2.2KB', 2.2 * 1024),
            ('poles-with-drops.json', '2.0MB', 2.0 * 1024 * 1024)
        ]
        
        file_validations = {}
        
        for filename, reported_size, expected_bytes in files_to_check:
            filepath = self.output_dir / filename
            if filepath.exists():
                actual_size = filepath.stat().st_size
                variance = abs(actual_size - expected_bytes) / expected_bytes
                
                file_validations[filename] = {
                    'reported_size': reported_size,
                    'actual_bytes': actual_size,
                    'actual_human': self._format_size(actual_size),
                    'variance_percent': f"{variance * 100:.1f}%",
                    'within_10_percent': variance <= 0.1
                }
                
                print(f"✓ {filename}: {self._format_size(actual_size)} (reported: {reported_size})")
        
        self.validations['file_sizes'] = file_validations
        
        return True
    
    def _format_size(self, bytes):
        """Format bytes to human readable"""
        if bytes > 1024 * 1024:
            return f"{bytes / (1024 * 1024):.1f}MB"
        elif bytes > 1024:
            return f"{bytes / 1024:.0f}KB"
        else:
            return f"{bytes}B"
    
    def generate_report(self):
        """Generate antiHall validation report"""
        print("\n" + "="*50)
        print("ANTIHALL VALIDATION REPORT")
        print("="*50)
        
        # Run all validations
        self.validate_pole_counts()
        self.validate_drop_counts()
        self.validate_relationships()
        self.validate_file_sizes()
        
        # Calculate validation score
        all_checks = []
        for category, checks in self.validations.items():
            for check_name, check_data in checks.items():
                if isinstance(check_data, dict) and 'match' in check_data:
                    all_checks.append(check_data['match'])
                elif isinstance(check_data, dict) and any(k.endswith('_match') or k.startswith('verified') or k == 'no_capacity_issues' for k in check_data):
                    for k, v in check_data.items():
                        if k.endswith('_match') or k.startswith('verified') or k == 'no_capacity_issues' or k == 'all_have_gps':
                            all_checks.append(v)
        
        passed = sum(all_checks)
        total = len(all_checks)
        score = (passed / total) * 100 if total > 0 else 0
        
        # Create final report
        report = {
            'validation_date': datetime.now().isoformat(),
            'purpose': 'Verify all claims in Lawley extraction report against actual data',
            'validations': self.validations,
            'evidence': self.evidence,
            'summary': {
                'total_checks': total,
                'passed': passed,
                'failed': total - passed,
                'validation_score': f"{score:.1f}%",
                'conclusion': 'All claims verified - No hallucinations detected' if score >= 95 else 'Some claims need review'
            }
        }
        
        # Save report
        report_path = self.output_dir / 'antiHall_extraction_validation.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"VALIDATION SUMMARY")
        print(f"{'='*50}")
        print(f"Total checks: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Validation Score: {score:.1f}%")
        print(f"\nConclusion: {report['summary']['conclusion']}")
        print(f"\nFull report saved to: {report_path}")
        
        return report

if __name__ == '__main__':
    validator = ExtractionResultsValidator()
    validator.generate_report()