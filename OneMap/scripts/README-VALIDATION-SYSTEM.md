# OneMap CSV Validation System

A comprehensive validation system designed to prevent data corruption issues like those found in the June 22 CSV file (46% invalid records).

## 🎯 Purpose

Prevents import of corrupted CSV files by:
- Detecting field shifts and column misalignment
- Validating GPS coordinates and pole numbers
- Checking for text in numeric fields
- Identifying unescaped delimiters
- Enforcing data quality thresholds

## 📁 Files Overview

### Core Validation Scripts

#### 1. `validate-csv-structure.js`
**Purpose**: Primary CSV structure validation
**Features**:
- Detects field shifts (June 22 issue)
- Validates GPS coordinates 
- Checks pole number formats
- Identifies text in numeric fields
- Generates detailed validation reports

**Usage**:
```bash
node validate-csv-structure.js data.csv [report-path]
```

#### 2. `field-validation-rules.js`
**Purpose**: Comprehensive field-level validation rules
**Includes**:
- Data type validation (string, number, coordinate, etc.)
- Format patterns (pole numbers, emails, dates)
- Value ranges (GPS coordinates for South Africa)
- Cross-field validation (latitude/longitude pairs)
- Quality thresholds (90% minimum validation rate)

#### 3. `safe-import-with-validation.js`
**Purpose**: Wrapper that adds validation to existing import scripts
**Features**:
- Pre-import validation
- Quality threshold enforcement
- Interactive import decisions
- Force override option (with warnings)
- Integration with existing import scripts

**Usage**:
```bash
# Validation only
node safe-import-with-validation.js data.csv

# Validation + import
node safe-import-with-validation.js data.csv --import-script=bulk-import-history-fast.js

# Force import despite warnings (not recommended)
node safe-import-with-validation.js data.csv --force --import-script=bulk-import-history-fast.js
```

### Testing & Quality Assurance

#### 4. `test-validation-system.js`
**Purpose**: Comprehensive testing of validation system
**Features**:
- Tests with clean, corrupted, and mixed data
- June 22 specific issue testing
- Performance testing with large files
- Automated test report generation

**Usage**:
```bash
node test-validation-system.js
```

## 🚨 June 22 Issues Detected

The validation system specifically catches the issues found in June 22:

### Issue 1: Field Shift Detection
```
❌ Invalid Latitude: and prior to the transfer of any title in the prop...
❌ Invalid Longitude: shall also notify the Company/ies of the identity...
```

### Issue 2: Date in Pole Number Field
```
❌ Invalid Pole Number: 2025/05/06 14:16:50.225
```

### Issue 3: Text in Coordinate Fields
```
❌ Field shift detected in Primary House of Backyard Dwelling
```

## 📊 Quality Thresholds

### Validation Rates
- **90%+**: ✅ Ready for import
- **60-89%**: ⚠️ Warning - review errors first
- **<60%**: ❌ Critical - do not import

### Auto-Rejection Criteria
- Field shift detected
- >40% invalid GPS coordinates
- >50% invalid pole numbers
- CSV parser errors

## 🔧 Integration Guide

### Step 1: Replace Existing Import Commands
```bash
# Old way (dangerous)
node bulk-import-history-fast.js data.csv

# New way (safe)
node safe-import-with-validation.js data.csv --import-script=bulk-import-history-fast.js
```

### Step 2: Set Up Automated Validation
Add to your import pipeline:
```bash
#!/bin/bash
CSV_FILE=$1

# Validate first
node validate-csv-structure.js "$CSV_FILE" || exit 1

# Import if validation passes
node your-import-script.js "$CSV_FILE"
```

### Step 3: Monitor Validation Reports
- Check validation reports in validation-tests/ directory
- Monitor validation rates over time
- Alert on files with <90% validation rate

## 📋 Validation Report Example

```markdown
# CSV Validation Report

**File**: June_22_Data.csv
**Validation Rate**: 54% (CRITICAL - DO NOT IMPORT)

## Issues Found
- Field shift detected: ⚠️ YES
- Invalid coordinates: 2,350 records
- Text in numeric fields: 1,870 records
- Corrupted pole numbers: 1,200 records

## Recommendations
- Re-export CSV with proper delimiter escaping
- Review terms and conditions text formatting
- Check CSV export settings for quote handling
```

## 🚀 Quick Start

1. **Test the system:**
```bash
node test-validation-system.js
```

2. **Validate a file:**
```bash
node validate-csv-structure.js your-file.csv
```

3. **Safe import:**
```bash
node safe-import-with-validation.js your-file.csv --import-script=your-import-script.js
```

## 🔍 Troubleshooting

### Common Issues

#### High Invalid Rate (>50%)
- **Cause**: CSV export corruption (like June 22)
- **Solution**: Re-export from source system
- **Prevention**: Always validate before import

#### Field Shift Detected
- **Cause**: Unescaped commas in text fields
- **Solution**: Fix CSV export to properly escape delimiters
- **Prevention**: Use proper CSV generation libraries

#### GPS Coordinates Invalid
- **Cause**: Text appearing in coordinate fields
- **Solution**: Clean data at source
- **Prevention**: Validate coordinates during data entry

### Dependencies
```bash
npm install csv-parse
```

## 🎯 Best Practices

1. **Always validate first** - Never import without validation
2. **Review reports** - Check validation reports for patterns
3. **Set thresholds** - Don't import files <90% valid
4. **Monitor trends** - Track data quality over time
5. **Fix at source** - Address root causes, not symptoms

## 🔄 Future Enhancements

- Real-time validation during CSV upload
- Integration with OneMap UI
- Automated data quality dashboards
- Machine learning for anomaly detection
- API validation for real-time imports

---

**Remember**: The June 22 incident with 46% invalid records could have been prevented with this validation system. Always validate before importing!