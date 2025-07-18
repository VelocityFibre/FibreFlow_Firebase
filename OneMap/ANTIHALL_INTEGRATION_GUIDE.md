# antiHall Integration Guide for Data Extraction Scripts

## Understanding antiHall in FibreFlow

### Two Types of antiHall Usage:

1. **Code Validation (Main antiHall)**
   - Located in `/antiHall` directory
   - Validates AI-generated code against codebase
   - Prevents hallucinated methods/classes
   - Used during development

2. **Data Validation (OneMap Pattern)**
   - Custom validation classes
   - Validates data claims against actual files
   - Prevents hallucinated statistics
   - Used for reports and analysis

## Why Scripts Are Less Prone to Hallucinations

Scripts that process data files are inherently safer because:
1. They read actual data from files
2. They count/calculate from real records
3. They don't rely on assumptions
4. Results are deterministic

However, hallucinations can still occur in:
- Summary reports
- Interpretation of results
- Claims about the data
- File size estimations

## Building antiHall Validation Into Scripts

### 1. Self-Validating Output Pattern

```python
# In your extraction script
def extract_data():
    # ... extraction logic ...
    
    # Include validation metadata
    output = {
        'extractionDate': datetime.now().isoformat(),
        'sourceFile': INPUT_FILE,
        'statistics': {
            'total': len(records),
            'valid': valid_count,
            # Include verification data
            '_verification': {
                'actualRecordCount': len(records),
                'calculatedTotal': sum([valid_count, invalid_count]),
                'checksumMatch': len(records) == sum([valid_count, invalid_count])
            }
        },
        'data': records
    }
    return output
```

### 2. Built-in Validation Methods

```python
class DataExtractor:
    def __init__(self):
        self.validations = {}
        
    def extract(self):
        # Do extraction
        data = self._process_data()
        
        # Self-validate
        self._validate_extraction(data)
        
        return data
    
    def _validate_extraction(self, data):
        """Internal validation of extraction results"""
        self.validations['record_count'] = {
            'csv_rows': self.csv_row_count,
            'extracted': len(data),
            'match': self.csv_row_count == len(data) + 1  # +1 for header
        }
        
        # Add to output
        data['_validations'] = self.validations
```

### 3. Assertion-Based Validation

```python
def validate_pole_data(poles):
    """Use assertions to catch impossible conditions"""
    assert len(poles) >= 0, "Negative pole count impossible"
    assert all(p.get('poleId') for p in poles), "Missing pole IDs"
    
    # Validate GPS ranges
    for pole in poles:
        if pole.get('latitude'):
            assert -90 <= pole['latitude'] <= 90, f"Invalid latitude: {pole['latitude']}"
        if pole.get('longitude'):
            assert -180 <= pole['longitude'] <= 180, f"Invalid longitude: {pole['longitude']}"
```

### 4. Cross-Validation Pattern

```python
def validate_relationships(poles, drops):
    """Cross-validate between datasets"""
    # Get all pole IDs
    pole_ids = {p['poleId'] for p in poles}
    
    # Check all drops reference valid poles
    orphaned = []
    for drop in drops:
        if drop['poleReference'] not in pole_ids:
            orphaned.append(drop['dropId'])
    
    return {
        'orphanedDrops': orphaned,
        'allDropsValid': len(orphaned) == 0,
        'validationDate': datetime.now().isoformat()
    }
```

### 5. Evidence Collection

```python
class ValidatedExtractor:
    def __init__(self):
        self.evidence = {}
        
    def extract_with_evidence(self, filepath):
        # Store evidence of operations
        self.evidence['file_exists'] = os.path.exists(filepath)
        self.evidence['file_size'] = os.path.getsize(filepath) if self.evidence['file_exists'] else 0
        self.evidence['start_time'] = datetime.now().isoformat()
        
        # Do extraction
        data = self._extract(filepath)
        
        self.evidence['end_time'] = datetime.now().isoformat()
        self.evidence['records_extracted'] = len(data)
        
        return {
            'data': data,
            'evidence': self.evidence
        }
```

## Implementing in Our Scripts

### For `extract_lawley_poles.py`:

```python
# Add at the end of extract_pole_data():
# Self-validation
validation_checks = {
    'total_equals_sum': stats['total'] == stats['valid'] + stats['invalid'],
    'types_equal_valid': stats['feederPoles'] + stats['distributionPoles'] + stats['unknownType'] == stats['valid'],
    'gps_coverage_sum': stats['withGPS'] + stats['withoutGPS'] == stats['valid']
}

json_output['_validation_checks'] = validation_checks
json_output['_all_checks_passed'] = all(validation_checks.values())
```

### For Report Generation:

```python
def generate_report_with_validation(data):
    """Generate report with built-in validation"""
    report = create_report(data)
    
    # Validate all claims
    validator = ReportValidator()
    validation_results = validator.validate_report(report, data)
    
    # Only include validated claims
    validated_report = {
        'report': report,
        'validation': validation_results,
        'verified': validation_results['score'] > 95
    }
    
    return validated_report
```

## Best Practices

1. **Count, Don't Estimate**
   - ❌ "Approximately 4,500 poles"
   - ✅ f"Exactly {len(poles)} poles"

2. **Calculate, Don't Assume**
   - ❌ "Most poles have GPS"
   - ✅ f"{(gps_count/total)*100:.1f}% of poles have GPS"

3. **Verify Cross-References**
   - Always check foreign key relationships
   - Validate totals across datasets

4. **Include Metadata**
   - Source file paths
   - Extraction timestamps
   - Row counts at each stage

5. **Test Edge Cases**
   - Empty files
   - Missing columns
   - Invalid data types

## Example: Self-Validating Script Template

```python
#!/usr/bin/env python3
"""
Self-validating data extraction script
Includes built-in antiHall validation
"""

import json
import csv
from datetime import datetime
from pathlib import Path

class ValidatedExtractor:
    def __init__(self, input_file):
        self.input_file = Path(input_file)
        self.validations = {}
        self.evidence = {}
        
    def extract(self):
        # Pre-extraction validation
        self._validate_input()
        
        # Extract data
        data = self._extract_data()
        
        # Post-extraction validation
        self._validate_output(data)
        
        # Create validated output
        return {
            'metadata': {
                'source': str(self.input_file),
                'extractionDate': datetime.now().isoformat(),
                'scriptVersion': '1.0'
            },
            'data': data,
            'validations': self.validations,
            'evidence': self.evidence
        }
    
    def _validate_input(self):
        """Validate input file exists and is readable"""
        self.validations['input_file'] = {
            'exists': self.input_file.exists(),
            'readable': os.access(self.input_file, os.R_OK) if self.input_file.exists() else False,
            'size_bytes': self.input_file.stat().st_size if self.input_file.exists() else 0
        }
        
    def _extract_data(self):
        """Extract with evidence collection"""
        # Implementation here
        pass
        
    def _validate_output(self, data):
        """Validate extraction results"""
        self.validations['output'] = {
            'record_count': len(data),
            'has_data': len(data) > 0,
            'all_required_fields': all(self._check_required_fields(record) for record in data)
        }
```

## Conclusion

Scripts are inherently more reliable than AI-generated text because they work with real data. However, adding validation layers ensures:

1. **Transparency**: Clear evidence for all claims
2. **Reliability**: Automated verification of results  
3. **Trust**: Users can verify claims independently
4. **Debugging**: Easy to trace issues

The antiHall pattern isn't just about preventing hallucinations - it's about building trustworthy, verifiable data processing systems.