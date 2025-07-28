# OneMap Scripts Directory - Organization Guide

## 🚨 CRITICAL ISSUE
We have 82+ scripts with:
- No clear documentation
- Duplicate functionality
- Unclear purposes
- No versioning
- Multiple scripts doing the same thing

## 📋 SCRIPT CATEGORIES & CURRENT STATE

### 1. Import Scripts (TOO MANY!)
- `bulk-import-onemap.js` - Basic import, no reporting
- `bulk-import-with-history.js` - Import with status history
- `bulk-import-history-fast.js` - Fast version of above
- `import-onemap-csv.js` - Another import variant
- `import-with-god-mode.js` - Yet another import
- `simple-import-solution.js` - And another...

**PROBLEM**: Which one to use when??

### 2. Report Generation Scripts (DUPLICATES!)
- `generate-firebase-report.js` - Basic report
- `generate-report-with-history.js` - Report with history
- `generate-pole-report-firebase.js` - Pole-specific report
- Multiple "analyze-" scripts doing similar things

### 3. Status/Check Scripts (OVERLAPPING!)
- `check-active-import.js`
- `check-latest-import.js`
- `check-status-changes-collection.js`
- `check-sync-progress.js`
- Multiple redundant checking scripts

## 🎯 PROPOSED SOLUTION

### 1. Primary Scripts (Keep These)
```bash
# IMPORT - One script to rule them all
onemap-import.js
  Purpose: Import any CSV with full reporting
  Usage: node onemap-import.js "filename.csv"
  Features: 
    - Import with deduplication
    - Generate summary report
    - Track new vs updated records
    - Update processing log

# STATUS - Check current state
onemap-status.js
  Purpose: Show current processing state
  Usage: node onemap-status.js
  Features:
    - Last processed file
    - Next file to process
    - Database summary

# REPORT - Generate reports
onemap-report.js
  Purpose: Generate comprehensive reports
  Usage: node onemap-report.js [--batch ID] [--date]
  Features:
    - Full database report
    - Batch-specific report
    - Change detection report
```

### 2. Archive/Delete The Rest
Move all other scripts to an `archive/` folder with a README explaining what each did.

### 3. Script Template
Every script MUST have:
```javascript
/**
 * Script: onemap-import.js
 * Purpose: Import CSV files to vf-onemap-data with full reporting
 * Created: 2025-01-31
 * Author: OneMap Team
 * 
 * Usage:
 *   node onemap-import.js "filename.csv"
 *   node onemap-import.js "path/to/file.csv" --dry-run
 * 
 * Features:
 *   - Deduplication by Property ID
 *   - Tracks new vs updated records
 *   - Generates import summary
 *   - Updates CSV_PROCESSING_LOG.md
 * 
 * Output:
 *   - Console: Import progress and summary
 *   - File: reports/import_[date]_[batchId].md
 *   - Log: Updates CSV_PROCESSING_LOG.md
 */
```

## 🔥 IMMEDIATE ACTIONS NEEDED

1. **Audit all 82 scripts** - Identify unique functionality
2. **Consolidate to 3-5 core scripts** - With clear purposes
3. **Document everything** - Headers, README, usage guides
4. **Archive old scripts** - Don't delete, but move out of the way
5. **Update morning status** - To use the consolidated scripts

## 📊 Current Script Chaos Examples

### Import Scripts That Do Similar Things:
1. bulk-import-onemap.js
2. bulk-import-with-history.js
3. bulk-import-history-fast.js
4. import-onemap-csv.js
5. import-with-god-mode.js
6. simple-import-solution.js
7. vf-onemap-import-final.js
8. demo-production-import.js
9. complete-import-batch.js
10. process-1map-sync-simple.js

**This is insane!** We need ONE import script that works properly.

---
*Created: 2025-01-31*
*Status: URGENT - Scripts are out of control*