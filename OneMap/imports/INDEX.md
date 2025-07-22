# OneMap Import Tracking Index

## Purpose
Track all 1Map CSV imports, their status, and related files.

## Imports

### 2025-07-21: Lawley May Week 3
- **Status**: ✅ Imported, ⏳ Pending Sync
- **Records**: 746 total, 543 ready
- **Directory**: `imports/2025-07-21_Lawley_May_Week3/`
- **Issues**: 203 missing poles, 27 duplicates

## Directory Structure
```
imports/
├── YYYY-MM-DD_ImportName/
│   ├── source/          # Original CSV files
│   ├── reports/         # All related reports
│   ├── scripts/         # Processing scripts
│   ├── logs/            # Import logs
│   ├── IMPORT_MANIFEST.json
│   └── README.md
└── INDEX.md             # This file
```

## Quick Commands
```bash
# View specific import
cd imports/2025-07-21_Lawley_May_Week3/

# Check manifest
cat IMPORT_MANIFEST.json

# View issues
cat README.md
```
