# CSV Processing Scripts

## Purpose
Local CSV file operations - NO Firebase interaction. These scripts read CSV files and output processed CSV files.

## Workflow
```
Input CSV → Processing → Output CSV
```

## Scripts in this directory

### Core CSV Processing
- `split-csv-by-pole.js` - Split large CSV by pole number
- `compare-split-csvs.js` - Compare two CSV files for differences
- `process-split-chronologically.js` - Process splits in date order
- `fix-csv-parsing.js` - Fix common CSV parsing issues
- `validate-csv-structure.js` - Validate CSV has required columns

### Usage Examples
```bash
# Split large file by pole
node split-csv-by-pole.js "large-file.csv"

# Compare two days
node compare-split-csvs.js "day1.csv" "day2.csv"

# Validate structure
node validate-csv-structure.js "new-file.csv"
```

## Key Points
- These scripts NEVER touch Firebase
- Input: CSV files from ../downloads/
- Output: Processed CSV files
- Used for data preparation BEFORE import