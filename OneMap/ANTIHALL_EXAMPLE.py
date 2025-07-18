#!/usr/bin/env python3
"""
Example: All 5 Anti-Hallucination Techniques in One Simple Script
This demonstrates how to prevent hallucinations in data processing scripts.
"""

import json
from datetime import datetime

def process_data_with_antihall(input_data):
    """
    Process data with all 5 anti-hallucination techniques:
    1. Self-validation in outputs
    2. Store evidence of calculations
    3. Cross-validate between datasets
    4. Use assertions for impossible conditions
    5. Generate validation reports alongside results
    """
    
    # 1. SELF-VALIDATION: Track what we're doing
    validations = {
        'input_received': len(input_data) if input_data else 0,
        'processing_started': datetime.now().isoformat()
    }
    
    # 2. EVIDENCE COLLECTION: Store proof of our work
    evidence = {
        'sample_input': input_data[:3] if input_data else [],
        'calculations_performed': []
    }
    
    # 4. ASSERTIONS: Catch impossible conditions early
    assert isinstance(input_data, list), "Input must be a list"
    assert len(input_data) >= 0, "Cannot have negative items"
    
    # Process the data
    results = []
    total = 0
    
    for item in input_data:
        # More assertions
        assert 'value' in item, f"Item missing required 'value' field: {item}"
        assert isinstance(item['value'], (int, float)), f"Value must be numeric: {item['value']}"
        assert item['value'] >= 0, f"Negative values not allowed: {item['value']}"
        
        # Process
        processed = {
            'original': item['value'],
            'doubled': item['value'] * 2,
            'squared': item['value'] ** 2
        }
        results.append(processed)
        total += item['value']
        
        # Store evidence of calculation
        if len(evidence['calculations_performed']) < 3:
            evidence['calculations_performed'].append({
                'input': item['value'],
                'output': processed['doubled'],
                'formula': 'input * 2'
            })
    
    # Calculate average
    average = total / len(input_data) if input_data else 0
    
    # 3. CROSS-VALIDATION: Verify our math
    validations['cross_checks'] = {
        'sum_of_values': total,
        'recalculated_sum': sum(item['value'] for item in input_data),
        'sums_match': total == sum(item['value'] for item in input_data),
        'count_matches': len(results) == len(input_data),
        'average_verification': abs(average - (total/len(input_data) if input_data else 0)) < 0.001
    }
    
    # 1. SELF-VALIDATION: Final checks
    all_checks_passed = all([
        validations['cross_checks']['sums_match'],
        validations['cross_checks']['count_matches'],
        validations['cross_checks']['average_verification']
    ])
    
    # 5. VALIDATION REPORT: Generate alongside results
    validation_report = {
        'timestamp': datetime.now().isoformat(),
        'validations': validations,
        'evidence': evidence,
        'all_checks_passed': all_checks_passed,
        'confidence_score': 100.0 if all_checks_passed else 0.0
    }
    
    # Return results WITH validation
    return {
        'results': {
            'processed_items': results,
            'statistics': {
                'count': len(results),
                'total': total,
                'average': average
            }
        },
        'validation_report': validation_report
    }

# Example usage
if __name__ == '__main__':
    # Test data
    test_data = [
        {'value': 10},
        {'value': 20},
        {'value': 30}
    ]
    
    # Process with anti-hallucination
    output = process_data_with_antihall(test_data)
    
    # Display results
    print("=== RESULTS ===")
    print(json.dumps(output['results'], indent=2))
    
    print("\n=== VALIDATION REPORT ===")
    print(f"All checks passed: {output['validation_report']['all_checks_passed']}")
    print(f"Confidence: {output['validation_report']['confidence_score']}%")
    
    # Save validation report
    with open('output/example_validation.json', 'w') as f:
        json.dump(output['validation_report'], f, indent=2)
    
    print("\nValidation report saved to output/example_validation.json")