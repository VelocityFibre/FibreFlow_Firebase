# Duplicate Pole Management System

## Overview

This document describes the comprehensive solution for managing duplicate poles in the VF OneMap database. The system includes detection, cleanup, and prevention of duplicate pole records.

## The Problem

- Multiple records exist with the same `poleNumber` but different document IDs
- This causes data inconsistency and reporting issues
- Duplicates were created during bulk imports when existing poles weren't checked

## Solution Components

### 1. Duplicate Detection Report
**Script**: `scripts/generate-duplicate-report.js`

Generates a comprehensive analysis of duplicate poles:
- Total statistics (unique poles, duplicates, affected records)
- Pattern analysis (by site, agent, duplicate count)
- Sample duplicates for investigation
- Recommendations for cleanup

**Usage**:
```bash
node scripts/generate-duplicate-report.js
```

**Output**:
- JSON report: `reports/duplicate-analysis-{timestamp}.json`
- CSV export: `reports/duplicate-analysis-{timestamp}.csv`

### 2. Duplicate Cleanup Script
**Script**: `scripts/cleanup-duplicate-poles.js`

Safely merges duplicate poles:
- Identifies the "master" document (most complete data)
- Merges non-empty fields from duplicates
- Deletes duplicate documents
- Generates cleanup report

**Usage**:
```bash
# Dry run (no changes)
node scripts/cleanup-duplicate-poles.js

# Live run (performs cleanup)
node scripts/cleanup-duplicate-poles.js --live
```

**Selection Criteria for Master Document**:
- Completeness (number of non-empty fields)
- Presence of GPS coordinates (+10 points)
- Has drop number (+5 points)
- Has status update (+5 points)
- Older property ID (likely original)

### 3. Duplicate Prevention System
**Module**: `scripts/prevent-duplicate-poles.js`

Provides functions to prevent duplicates during import:
- `checkPoleExists(poleNumber)` - Check single pole
- `checkPolesExistBatch(poleNumbers[])` - Check multiple poles
- `upsertPoleRecord(data)` - Update or insert safely
- `validateImportForDuplicates(records)` - Pre-import validation
- `importWithDuplicatePrevention(records)` - Safe import

### 4. Enhanced Import Script
**Script**: `scripts/firebase-import/bulk-import-with-duplicate-prevention.js`

Updated import script that prevents duplicates:
- Validates all records before import
- Checks for existing poles by `poleNumber`
- Updates existing records instead of creating duplicates
- Reports on duplicates found and prevented

**Usage**:
```bash
node scripts/firebase-import/bulk-import-with-duplicate-prevention.js "Lawley 2025-05-26.csv"
```

## Quick Start Guide

### Step 1: Analyze Current Duplicates
```bash
cd OneMap/scripts
node generate-duplicate-report.js
```

Review the report to understand the scope of duplicates.

### Step 2: Clean Up Existing Duplicates
```bash
# First, do a dry run
node cleanup-duplicate-poles.js

# If results look good, run the cleanup
node cleanup-duplicate-poles.js --live
```

### Step 3: Update Import Process
Replace your current import script with the duplicate-prevention version:
```bash
# Old way (creates duplicates)
node bulk-import-with-history.js "file.csv"

# New way (prevents duplicates)
node firebase-import/bulk-import-with-duplicate-prevention.js "file.csv"
```

## Implementation Details

### Document ID Strategy
- Uses `propertyId` as document ID when possible
- This makes lookups faster and prevents some duplicates
- Falls back to auto-generated IDs if needed

### Merge Strategy
When updating existing poles:
- Non-empty values from new data override empty values in existing
- Preserves important fields like `createdAt`, `importBatchId`
- Adds `lastUpdated` timestamp

### Performance Considerations
- Batch processing (500 records at a time)
- Parallel processing within batches
- Efficient duplicate checking with indexed queries

## Best Practices

1. **Always run duplicate report before major imports**
   ```bash
   node generate-duplicate-report.js
   ```

2. **Use the prevention-enabled import script**
   ```bash
   node firebase-import/bulk-import-with-duplicate-prevention.js "file.csv"
   ```

3. **Regular cleanup schedule**
   - Run duplicate detection weekly
   - Clean up any new duplicates immediately

4. **Monitor import logs**
   - Check for high duplicate counts
   - Investigate sources of duplicates

## Troubleshooting

### Import Taking Too Long
- Reduce batch size in import script
- Check Firebase quotas

### Cleanup Errors
- Check error details in cleanup report
- May need manual intervention for complex cases

### Prevention Not Working
- Ensure `poleNumber` field is normalized (uppercase, trimmed)
- Check that existing pole queries are using correct field name

## Future Improvements

1. **Real-time duplicate detection**
   - Cloud Function to check on every write
   - Reject duplicate creation attempts

2. **Unique index on poleNumber**
   - Firestore doesn't support unique constraints
   - Could use Cloud Functions to enforce

3. **Automated cleanup**
   - Scheduled function to detect and merge duplicates
   - Daily or weekly runs

4. **Import validation UI**
   - Web interface for CSV validation
   - Preview duplicates before import

## Related Documentation

- [OneMap Import System](./ONEMAP_IMPORT_TRACKING_SYSTEM.md)
- [CSV Processing Guide](./CSV_PROCESSING_UPDATE_2025-07-29.md)
- [Field Validation Rules](./scripts/field-validation-rules.js)