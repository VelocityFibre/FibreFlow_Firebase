# OneMap Script Workflows - Clarified

## 🔄 TWO DISTINCT WORKFLOWS

### Workflow 1: CSV-to-CSV Processing (Local)
**Purpose**: Analyze, clean, split, compare CSV files WITHOUT touching Firebase
**Location**: Local file system only

#### Scripts for CSV Processing:
- `split-csv-by-pole.js` - Split large CSV by pole number
- `compare-split-csvs.js` - Compare two CSV files
- `process-split-chronologically.js` - Process splits in date order
- `fix-csv-parsing.js` - Fix CSV parsing issues
- `analyze-gps-duplicates.py` - Find GPS-based duplicates
- `validate-csv-structure.js` - Validate CSV format

**Output**: Cleaned/processed CSV files

### Workflow 2: CSV-to-Firebase Import (Database)
**Purpose**: Import CSV data into Firebase database
**Location**: CSV → Firebase (vf-onemap-data)

#### Scripts for Firebase Import:
- `bulk-import-onemap.js` - Basic import (currently using)
- `bulk-import-with-history.js` - Import with status tracking
- `import-onemap-csv.js` - Another import variant
- `sync-to-production.js` - Sync staging to production
- `vf-onemap-firebase-cli-import.sh` - Shell wrapper

**Output**: Data in Firebase

### Workflow 3: Firebase Reporting/Analysis
**Purpose**: Generate reports from data already in Firebase
**Location**: Firebase → Reports

#### Scripts for Firebase Analysis:
- `generate-firebase-report.js` - Database summary
- `detect-changes-firebase.js` - Find changes
- `analyze-vf-onemap-data.js` - Analyze imported data
- `generate-pole-report-firebase.js` - Pole-specific reports

**Output**: Markdown reports

## 📊 CURRENT PROCESS FLOW

```
1. CSV File (raw data)
       ↓
2. [Optional] CSV Processing Scripts
       ↓
3. Processed CSV
       ↓
4. Firebase Import Script (bulk-import-onemap.js)
       ↓
5. Firebase Database
       ↓
6. Report Generation Scripts
       ↓
7. Analysis Reports
```

## 🎯 CONSOLIDATION STRATEGY (REVISED)

### Phase 1: CSV Processing Scripts
**Keep Separate** - These are utilities for different purposes
- Group in `scripts/csv-processing/`
- Each has a specific job
- Don't consolidate these

### Phase 2: Firebase Import Scripts (CONSOLIDATE THESE!)
**Problem**: 10+ scripts doing the same thing
**Solution**: ONE import script with options
```bash
# Consolidated script with flags
node onemap-import.js "file.csv" --with-history --generate-report --update-log
```

### Phase 3: Reporting Scripts
**Keep Separate** - Different reports for different needs
- Group in `scripts/reports/`
- Each generates specific report type

## 📁 PROPOSED DIRECTORY STRUCTURE

```
OneMap/scripts/
├── csv-processing/          # CSV-to-CSV tools
│   ├── split-csv-by-pole.js
│   ├── compare-csvs.js
│   └── validate-structure.js
├── import/                  # CSV-to-Firebase
│   ├── onemap-import.js    # THE ONE IMPORT SCRIPT
│   └── archive/            # Old import scripts
├── reports/                 # Firebase-to-Reports
│   ├── generate-summary.js
│   ├── detect-changes.js
│   └── pole-analysis.js
├── utils/                   # Shared utilities
└── backup/                  # Working backups
```

## ⚠️ KEY INSIGHT

The mess is mainly in the **import scripts** category where we have:
- bulk-import-onemap.js
- bulk-import-with-history.js
- bulk-import-history-fast.js
- import-onemap-csv.js
- simple-import-solution.js
- vf-onemap-import-final.js
- [... and more]

All doing essentially the same thing: CSV → Firebase import

**We DON'T need to consolidate**:
- CSV processing tools (each has unique purpose)
- Report generators (different report types)

**We DO need to consolidate**:
- The 10+ import scripts into ONE

---
*This clarifies that we have different script categories serving different purposes*