# Import Scripts Guide

*Last Updated: 2025-01-30*  
*Status: Production Ready*

## Active Scripts

### 1. **import-lawley-robust.js** (PRIMARY)
**Purpose**: Production-ready Excel import with comprehensive error handling  
**Location**: `scripts/import-lawley-robust.js`  
**Usage**: `node scripts/import-lawley-robust.js ~/Downloads/[excel-file].xlsx`

**Key Features**:
- ✅ Row-by-row processing (continues on errors)
- ✅ Intelligent data type conversion
- ✅ Handles combined lat/long fields
- ✅ Proper NULL handling
- ✅ Detailed error reporting
- ✅ Updates existing records
- ✅ Tracks all changes

**Why Use This**:
- Handles real-world Excel data inconsistencies
- Won't fail entire import due to one bad row
- Provides clear summary of what succeeded/failed
- Production-tested with 13,656 row files

### 2. **generate-import-report.js**
**Purpose**: Creates comprehensive reports after each import  
**Location**: `scripts/generate-import-report.js`  
**Usage**: Automatically called after import, or manually: `node scripts/generate-import-report.js`

**Output**:
- HTML report (visual summary)
- TXT report (plain text)
- JSON report (structured data)
- Import history log

### 3. **validate-import.js**
**Purpose**: Cross-validates imported data against Excel source  
**Location**: `scripts/validate-import.js`  
**Usage**: `node scripts/validate-import.js ~/Downloads/[excel-file].xlsx`

### 4. **view-import-history.sh**
**Purpose**: Interactive viewer for import history and statistics  
**Location**: `scripts/view-import-history.sh`  
**Usage**: `./scripts/view-import-history.sh`

## Archived Scripts

### ~~import-lawley-excel.js~~ (DEPRECATED)
**Location**: `scripts/archive/import-lawley-excel.js`  
**Why Archived**: 
- Failed on first error (transaction rollback)
- Poor handling of data type mismatches
- Column name mapping issues

## Helper Scripts

### extract-column-mapping.js
**Purpose**: Generates column mapping from Excel to PostgreSQL  
**Location**: `scripts/extract-column-mapping.js`  
**Usage**: `node scripts/extract-column-mapping.js [excel-file]`  
**Output**: `config/column-mapping.json`

### generate-schema-from-mapping.js
**Purpose**: Creates PostgreSQL schema from column mapping  
**Location**: `scripts/generate-schema-from-mapping.js`  
**Usage**: `node scripts/generate-schema-from-mapping.js`  
**Output**: `config/lawley-schema-v2.sql`

## Import Workflow

### Standard Import Process
```bash
# 1. Import Excel file (robust, handles errors gracefully)
node scripts/import-lawley-robust.js ~/Downloads/1754473447790_Lawley_01082025.xlsx

# 2. View results (automatic report generation)
# Check reports/ directory for HTML report

# 3. Validate against source (optional)
node scripts/validate-import.js ~/Downloads/1754473447790_Lawley_01082025.xlsx

# 4. View history
./scripts/view-import-history.sh
```

### Batch Import Multiple Files
```bash
# Import all Lawley files chronologically
for file in ~/Downloads/*Lawley*.xlsx; do
    echo "Importing: $file"
    node scripts/import-lawley-robust.js "$file"
    echo "Completed. Waiting 5 seconds..."
    sleep 5
done
```

## Key Differences: Old vs Robust

| Feature | Old Script | Robust Script |
|---------|-----------|---------------|
| Error Handling | Fails entire batch | Continues row-by-row |
| Data Types | Basic conversion | Smart type detection |
| Lat/Long | Failed on combined | Splits & stores both |
| NULL Handling | Empty strings | Proper NULLs |
| Phone Numbers | Failed on formats | Strips non-numeric |
| Reporting | Basic stats | Detailed error log |
| Performance | Faster (batch) | Slower but reliable |
| Success Rate | 0% on errors | 99%+ typical |

## Configuration Files

### column-mapping.json
Maps Excel column names (with spaces) to PostgreSQL column names (with underscores).
Generated from actual Excel files.

### database.json
PostgreSQL connection settings:
- Host: localhost
- Port: 5433
- Database: fibreflow_staging
- User: postgres

## Troubleshooting

### Import Shows 0 Successful Rows
- Check first few error messages
- Usually data type mismatches
- Robust script handles these automatically

### Duplicate Key Errors
- Previous import already processed this file
- Check with: `SELECT * FROM onemap_import_batches`
- Clear if needed: `TRUNCATE TABLE onemap_import_batches CASCADE`

### Connection Errors
- Ensure PostgreSQL is running on port 5433
- Check with: `~/postgresql/bin/pg_ctl status -D ~/postgresql_data`

## Best Practices

1. **Always use import-lawley-robust.js** for production imports
2. **Import chronologically** (oldest to newest) for proper status tracking
3. **Check reports** after each import
4. **Monitor first import closely** to catch systematic issues
5. **Keep Excel files unchanged** during import process

## Status History Tracking

The system automatically tracks all status changes:
- When status changes from "Pole Permission: Submitted" to "Pole Permission: Approved"
- When pole numbers are assigned
- When field agents change
- All changes preserved with timestamps

View status history:
```sql
SELECT * FROM onemap_status_history 
WHERE entity_id = 'LAW.P.B167' 
ORDER BY change_date;
```