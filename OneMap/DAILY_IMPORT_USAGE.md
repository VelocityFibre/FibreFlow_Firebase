# OneMap Daily Import - Usage Guide

## Overview

The `import-onemap-daily.js` script provides comprehensive verification while importing OneMap CSV data. It prevents duplicates, tracks changes, and performs multiple verification checks.

## Features

### 1. **Manual Spot Checks**
- Randomly selects 5 records from the CSV
- Verifies if they already exist in staging
- Shows tracking identifiers (pole/drop/GPS/address)
- Helps catch obvious issues quickly

### 2. **Count Verification**
- Total unique Property IDs
- Unique pole numbers
- Unique addresses
- Status breakdown (how many approved, pending, etc.)

### 3. **Business Logic Checks**
- **Drops per Pole**: Alerts if any pole has >12 drops (physical limit)
- **GPS Bounds**: Flags records outside Lawley area
- **Status Conflicts**: Detects if same pole has conflicting statuses
- **Poles per Day**: Warns if daily pole count seems unrealistic

### 4. **Red Flags**
Automatically flags:
- Duplicate Property IDs in same file
- Poles exceeding drop capacity
- GPS coordinates outside expected area
- Conflicting status information

## Usage

### Basic Import
```bash
node import-onemap-daily.js "downloads/Lawley Raw Stats/Lawley June Week 1 05062025.csv"
```

### What Happens During Import

1. **Initialization**
   - Creates unique batch ID (e.g., `IMP_2025-01-22T14-30-00-000Z`)
   - Creates import batch record in Firestore

2. **Verification Phase**
   ```
   🔍 Performing manual spot checks...
   📊 Performing count verification...
   🏗️ Checking business logic constraints...
   ```

3. **Processing Phase**
   ```
   💾 Processing records...
     Processed 100/6039 records...
     Processed 200/6039 records...
   ```

4. **Report Generation**
   ```
   📝 Generating reports...
   📄 Report saved to: reports/import_report_IMP_2025-01-22T14-30-00-000Z.txt
   ```

## Example Output

```
# OneMap Import Report
## Batch ID: IMP_2025-01-22T14-30-00-000Z
## File: Lawley June Week 1 05062025.csv
## Date: 2025-01-22T14:30:00.000Z

### Summary
- Total Records Processed: 6039
- New Records Imported: 2555
- Duplicate Property IDs Skipped: 3484
- Verification Status: ✅ PASSED

### Verification Checks

#### 1. Manual Spot Checks (5 samples)
- Property 248629: Already exists | Pole: LAW.P.B167
- Property 251234: New record | Pole: LAW.P.C584
- Property 249876: Already exists | Pole: N/A
- Property 252345: New record | Pole: LAW.P.D298
- Property 248999: Already exists | Pole: LAW.P.A692

#### 2. Count Verification
- Unique Property IDs: 6039
- Unique Poles: 2454
- Unique Addresses: 4823

Status Breakdown:
- Pole Permission: Approved: 2878
- Home Sign Ups: Approved & Installation Scheduled: 1456
- Pending: 892
- No Status: 813

#### 3. Business Logic Checks
- Drops per Pole: ✅ PASSED
- GPS Bounds: ✅ PASSED
- Status Conflicts: ❌ FAILED
  Found 3 poles with conflicting statuses

### Changes Detected
- New Poles: 601
- Status Changes: 0
- Pole Assignments: 0
- Drop Additions: 0

### ⚠️ Red Flags
- Pole LAW.P.B234 has conflicting statuses: ['Approved', 'Pending']
- Pole LAW.P.C123 has conflicting statuses: ['Installed', 'Approved']
```

## Understanding Verification Results

### ✅ **PASSED** Verification
- Safe to proceed
- Data quality is good
- No major issues found

### ❌ **FAILED** Verification
- Review red flags carefully
- May still be safe to import (e.g., known status conflicts)
- Use judgment based on specific issues

## Common Issues & Solutions

### 1. **Duplicate Property IDs**
- **Expected**: When importing cumulative files
- **Action**: Script automatically skips duplicates

### 2. **Conflicting Statuses**
- **Cause**: Multiple records for same pole at different stages
- **Action**: Review to ensure latest status is correct

### 3. **GPS Outside Bounds**
- **Cause**: Data entry errors or neighboring areas
- **Action**: Verify addresses manually

### 4. **Too Many Drops per Pole**
- **Cause**: Data quality issue
- **Action**: Investigate specific poles, may need correction

## Daily Workflow

1. **Download CSV** from OneMap
2. **Run Import** with verification
3. **Review Report** for any red flags
4. **Investigate Issues** if verification failed
5. **Confirm Success** in Firestore console

## Monitoring Import Progress

Check Firestore collections:
- `onemap-import-batches` - Import history
- `onemap-staging` - Current data state
- `onemap-import-reports` - Detailed reports
- `onemap-change-history` - All changes tracked

## Next Steps

After successful import:
1. Compare with previous day's data
2. Generate progress reports
3. Share insights with team
4. Plan next day's field work based on pending items