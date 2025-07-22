# CSV Corruption Fix Guide

## Quick Start

### 1. Run with Validation (Recommended)
```bash
cd OneMap/GraphAnalysis
./CREATE_MASTER_CSV_VALIDATED.sh
```
This will:
- Use better CSV parsing (handles quotes, multi-line text)
- Validate each record and skip corrupted ones
- Generate validation reports showing what was skipped

### 2. Compare Results
```bash
node tools/compare-master-csvs.js
```
Shows differences between original and validated master CSV.

### 3. Clean Specific Dates (If Needed)
```bash
# Remove all records from June 2, 2025 (the corrupted date)
./CREATE_MASTER_CSV_VALIDATED.sh --clean-date 2025-06-02
```

## Understanding the Corruption

### What Happened on June 2, 2025?
The CSV file had **column shifting** where values moved to wrong fields:

```
BEFORE (Correct):
Property ID | Address           | Pole Number | Latitude
249285      | 80 MATHE STREET   | LAW.P.C132  | -26.381227

AFTER (Corrupted):
Property ID | Address                            | Pole Number         | Latitude
249285      | UNNAMED... [-26.381226987740785   | 2025/05/30 13:06:53 | I hereby consent...
```

### Root Cause
Long consent form text with commas and newlines broke the CSV structure.

## Three Fix Options Implemented

### Option 1: Better CSV Parser
```javascript
csv.parse({
  quote: '"',           // Handle quoted fields
  escape: '"',          // Handle escaped quotes
  max_record_size: 1000000, // Handle large records
  relax: true          // Handle irregular data
})
```

### Option 2: Field Validation
Checks each field for corruption patterns:
- Pole numbers shouldn't contain dates
- Addresses shouldn't contain GPS coordinates
- GPS fields shouldn't contain text
- Text fields shouldn't be extremely long

### Option 3: Date-Based Cleaning
Remove all records updated on corrupted dates:
```bash
./CREATE_MASTER_CSV_VALIDATED.sh --clean-date 2025-06-02
```

## Validation Rules

### Pole Number Validation
- ✅ Valid: `LAW.P.C132`, `MOH.D.A001`
- ❌ Invalid: `2025/05/30 13:06:53`, `2025-06-02`

### GPS Coordinate Validation
- ✅ Valid: `-26.381227`, `27.814557`
- ❌ Invalid: `I hereby consent to...`, `[-26.381 (with bracket)`

### Address Validation
- ✅ Valid: `80 MATHE STREET LAWLEY`
- ❌ Invalid: `UNNAMED... [-26.381226987740785` (contains GPS)

## Output Files

### 1. Validated Master CSV
- Location: `data/master/master_csv_latest_validated.csv`
- Contains only valid records
- Includes all metadata fields

### 2. Validation Reports
- Location: `data/validation-logs/`
- Shows every skipped record and why
- Example: `validation_2025-06-02_Lawley June Week 1 02062025.md`

### 3. Daily Processing Reports
- Location: `reports/daily-processing/`
- Shows statistics for each file
- Includes validation warnings

## Best Practices Going Forward

1. **Always use validation** when processing new CSVs
2. **Check validation reports** to see what was skipped
3. **Export CSVs properly** from source:
   - Use quotes around text fields
   - Escape special characters
   - Avoid multi-line text in CSV
4. **Monitor for patterns**:
   - High invalid record counts
   - Specific dates with issues
   - Repeated field corruption

## Emergency Recovery

If you need to restore the original (corrupted) data:
```bash
# Use original script without validation
./CREATE_MASTER_CSV.sh

# Or run with validation disabled
./CREATE_MASTER_CSV_VALIDATED.sh --no-validation
```

## Verification Steps

After fixing:
1. Check record count difference
2. Verify key fields look correct
3. Spot-check records from June 2
4. Ensure no critical data lost

Remember: It's better to have 18,000 clean records than 19,000 with 1,000 corrupted ones!