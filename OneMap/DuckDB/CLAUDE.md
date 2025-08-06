# DuckDB OneMap Processing - Claude Context

## Overview
DuckDB-based system for processing OneMap Excel files with high performance columnar storage and SQL analytics.

## Firebase Storage Path
**Base URL**: `https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/`
**CSV Uploads Path**: `csv-uploads/`

Example file URL format:
```
https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/csv-uploads%2F{filename}?alt=media
```

## Known Files
- `1754473447790_Lawley_01082025.xlsx` - Lawley data for August 1, 2025

## Quick Commands

### Download from Firebase Storage
```bash
# Download Excel file
wget -O OneMap/DuckDB/data/filename.xlsx "https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/csv-uploads%2Ffilename.xlsx?alt=media"
```

### Initialize Database
```bash
cd OneMap/DuckDB
npm run init
```

### Import Excel File
```bash
cd OneMap/DuckDB
npm run import -- data/filename.xlsx
```

### Query Database
```bash
# Using DuckDB CLI
duckdb data/onemap.duckdb
```

## Database Schema

### Tables
1. **raw_imports** - Raw Excel data
2. **processed_data** - Cleaned, deduplicated data
3. **status_history** - All status changes
4. **import_batches** - Import tracking

### Key Views
- **monthly_summary** - Monthly breakdown by agent/status
- **agent_performance** - Agent productivity metrics

## Processing Pipeline

1. **Download** → Excel file from Firebase Storage
2. **Import** → Load into raw_imports table
3. **Process** → Clean, deduplicate, validate
4. **Analyze** → SQL queries and views
5. **Export** → Results to CSV/JSON/Parquet

## Common Issues

### File Not Found in Firebase
- Check exact filename in Firebase Console
- Ensure URL encoding (%2F for /)
- Verify file exists in csv-uploads folder

### Excel Import Errors
- Check column names match expected format
- Verify sheet name (default: "Sheet1")
- Use preview feature to inspect structure

## Performance Notes
- Handles 100k+ records in seconds
- Columnar storage optimized for analytics
- SQL interface for complex queries
- Minimal memory footprint