# CSV Aggregator Built-in Validations

## ✅ The CSV Aggregator Already Validates:

### 1. **Data Quality Validation**
- **Invalid GPS coordinates** - Skips records with invalid lat/lon
- **Field shifts** - Detects when consent form text corrupts columns
- **Address validation** - Checks for valid address formats
- **Pole number formats** - Validates pole number structure

### 2. **Entity Tracking & Deduplication**
- **Unique entity detection** using MD5 hashes
- **Duplicate identification** within and across daily files
- **First seen tracking** - Adds `_first_seen_date` column
- **Keeps earliest record** when duplicates found

### 3. **Status Change Tracking**
- **Daily progression** - Tracks status changes between days
- **Field-level changes** - Identifies what changed and when
- **Agent tracking** - Who made each change
- **Logical progression** - Validates status transitions

### 4. **Comprehensive Reporting**
Generated reports include:
- `validation-logs/` - Details of invalid records with reasons
- `change-logs/` - Daily change tracking (JSON)
- `reports/` - Processing summaries
- `duplicates/` - Duplicate detection reports

### 5. **Master CSV Validation**
- Creates `master_csv_latest_validated.csv`
- Only includes records that pass all quality checks
- Maintains complete history across all daily files
- Preserves first occurrence of each entity

## 📁 Validation Output Locations

```
OneMap/GraphAnalysis/
├── data/
│   ├── validation-logs/     # Daily validation reports
│   │   └── validation_YYYY-MM-DD.md
│   ├── change-logs/         # Status change tracking
│   │   └── changes_YYYY-MM-DD.json
│   └── master/             # Validated master CSVs
│       └── master_csv_latest_validated.csv
└── reports/
    └── comprehensive-report-YYYY-MM-DD.md
```

## 🔍 How to Check Specific Pole Status History

### Using Existing Scripts:
```bash
# 1. Analyze pole history from aggregated data
cd OneMap/GraphAnalysis
node analyze-pole-history.js LAW.P.C654

# 2. Track daily changes for all entities
node track-daily-changes.js

# 3. Process all CSVs and generate validation reports
node process-all-daily-csvs.js
```

### Using New Verification Script:
```bash
# Compare pole status across all sources
cd sync/validation/scripts
node verify-pole-status-history.js LAW.P.C654
```

## 📊 Validation Rules Applied

1. **GPS Validation**
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Both must be present and valid

2. **Status Validation**
   - Must be non-empty
   - Tracks valid status progressions

3. **Entity Relationships**
   - Poles can have multiple drops
   - Drops linked to properties
   - Maximum 12 drops per pole

4. **Duplicate Detection**
   - By pole number
   - By drop number
   - By address
   - By property ID

## ✅ Summary

The CSV aggregator provides comprehensive validation at multiple levels:
- **Input validation** - Ensures data quality
- **Process validation** - Tracks changes and detects anomalies
- **Output validation** - Creates validated master CSV
- **Reporting** - Detailed logs for every validation step

This makes it a reliable source of truth for the sync process!