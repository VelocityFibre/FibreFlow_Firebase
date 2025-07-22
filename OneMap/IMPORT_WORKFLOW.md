# OneMap Import Workflow - Clear Steps

**Date**: 2025-07-23  
**Principle**: Import first, process later (as per Kobus's advice)

## Overview

We have a two-step process:
1. **Import Raw Data**: Import CSVs as-is, using Property ID for deduplication
2. **Process Data**: Apply Hein's specification for filtering and analysis

## Step 1: Import Raw CSV Data

**Purpose**: Get all data into Firebase without any processing
- Uses Property ID as unique identifier
- First CSV imports all records
- Subsequent CSVs only import NEW records (not duplicates)

**Collection**: `raw_onemap_data`

**Script**: `scripts/import-raw-from-storage.js`

```bash
# Import first CSV (all records)
node scripts/import-raw-from-storage.js

# Import all CSVs in chronological order
node scripts/import-all-raw.js
```

**What happens**:
- File A (May 22): Imports all 746 records
- File B (May 23): Only imports records NOT in File A
- File C (May 26): Only imports records NOT in A or B
- And so on...

## Step 2: Process According to Hein's Specification

**Purpose**: Apply all filtering and business logic
- Filter for "Pole Permission: Approved"
- Exclude "Home Sign Ups"
- Handle missing pole numbers
- Remove duplicate poles (keep earliest)
- Analyze date windows

**Collections Created**:
- `first_entry_in_window` - New permissions (Jun 26 - Jul 9)
- `duplicates_pre_window` - Existing permissions (before Jun 26)
- `no_pole_allocated` - Missing pole numbers
- `duplicate_poles_removed` - Duplicate entries removed

**Script**: `scripts/process-pole-permissions.js`

```bash
# Process all raw data
node scripts/process-pole-permissions.js
```

**Output**:
- 4 Firestore collections with processed data
- Excel report with 4 sheets
- Only the 16 columns specified by Hein

## Key Points

1. **No Pre-Processing**: We import everything first
2. **Property ID = Unique Key**: Prevents duplicate imports
3. **Chronological Order**: Import CSVs by date order
4. **Processing is Separate**: Hein's rules apply AFTER import
5. **Audit Trail**: Raw data preserved in `raw_onemap_data`

## File Structure

```
OneMap/
├── scripts/
│   ├── import-raw-from-storage.js    # Step 1: Import
│   ├── process-pole-permissions.js   # Step 2: Process
│   ├── import-all-raw.js            # Batch import
│   └── list-storage-files.js        # Check uploads
├── reports/
│   └── pole_permissions_analysis.xlsx
└── credentials/
    └── vf-onemap-service-account.json
```

## Quick Commands

```bash
# Check what's in storage
node scripts/list-storage-files.js

# Import first CSV
node scripts/import-raw-from-storage.js

# Import all CSVs
node scripts/import-all-raw.js

# Process data per Hein's spec
node scripts/process-pole-permissions.js

# View results
# Check Firestore collections or Excel report
```

## Important Notes

- **Storage Path**: gs://vf-onemap-data.firebasestorage.app/csv-uploads/
- **Raw Data**: Preserved in `raw_onemap_data` collection
- **Processed Data**: Split into 4 collections as per Hein's spec
- **Excel Output**: Contains only 16 specified columns