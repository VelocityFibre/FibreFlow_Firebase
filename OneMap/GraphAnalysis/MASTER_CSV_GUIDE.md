# Master CSV Creation Guide

## Overview

The Master CSV Creator aggregates all your daily CSV files into one comprehensive master file that:
- **Adds new records** when Property ID is new
- **Updates existing records** when Property ID already exists
- **Tracks all changes** with detailed reports
- **Processes chronologically** to maintain historical accuracy

## How to Run

```bash
cd OneMap/GraphAnalysis
./CREATE_MASTER_CSV.sh
```

Or directly:
```bash
node processors/create-master-csv-with-changes.js
```

## What It Does

### 1. **Chronological Processing**
- Sorts all CSV files by date (May → June → July)
- Processes in order to track evolution over time

### 2. **Smart Record Management**
- **New Property ID**: Adds complete record to master
- **Existing Property ID**: Updates with latest data, tracks what changed

### 3. **Change Tracking**
- Compares every field between old and new versions
- Records all changes with dates
- Creates detailed reports for each day

## Output Structure

```
GraphAnalysis/
├── data/
│   ├── master/
│   │   ├── master_csv_latest.csv                      # Always points to latest master
│   │   ├── master_csv_with_changes_2025-01-23.csv    # Today's master file
│   │   └── master_summary_2025-01-23.md              # Summary report
│   └── change-logs/
│       ├── changes_2025-06-03_june3.json              # Detailed changes per file
│       └── changes_2025-06-05_june5.json
└── reports/
    └── daily-processing/
        ├── processing_2025-06-03_june3.md             # Report for each day
        └── processing_2025-06-05_june5.md
```

## Master CSV Contents

The master CSV contains:
1. **All original fields** from your CSV files
2. **Latest values** for each field (updated as files are processed)
3. **Metadata fields** (added automatically):
   - `_first_seen_date` - When this Property ID first appeared
   - `_first_seen_file` - Which file it first appeared in
   - `_last_updated_date` - Last time any field changed
   - `_last_updated_file` - Which file had the last change
   - `_update_count` - How many times this record was updated

## Daily Processing Reports

Each day's report shows:
- **Summary Statistics**
  - Total records in file
  - New records added
  - Existing records updated
  - Records unchanged
  
- **Field Change Summary**
  - Which fields changed most frequently
  - Count of changes per field

- **Detailed Changes** (first 50)
  - Property ID
  - Each field that changed
  - Old value → New value

## Example Workflow

1. **Day 1 (May 22)**: 100 records
   - All 100 are new → Master has 100 records
   
2. **Day 2 (May 23)**: 120 records
   - 80 match existing Property IDs → Updated in master
   - 40 are new → Added to master
   - Master now has 140 records
   
3. **Day 3 (May 26)**: 150 records
   - 130 match existing → Check for changes, update if different
   - 20 are new → Added to master
   - Master now has 160 records

## Understanding Changes

### Example Change Report
```markdown
#### Property ID: 249111

- **Status**:
  - Old: "Pole Permission: Approved"
  - New: "Home Installation: Installed"
  
- **Field Agent Name**:
  - Old: "manuel"
  - New: "installation_team"
```

This shows that Property 249111 progressed from pole permission to installation, and the agent changed from manuel to the installation team.

## Use Cases

### 1. **Track Installation Progress**
Look at status changes over time to see workflow progression

### 2. **Verify Agent Changes**
See when field agents change for payment verification

### 3. **Data Quality**
Identify fields that change frequently (possible data entry issues)

### 4. **Historical Analysis**
Use _first_seen_date and _update_count to understand data patterns

## Tips

1. **Always use master_csv_latest.csv** - It's always the most current
2. **Check daily reports** - They show exactly what changed
3. **Use change logs (JSON)** for programmatic analysis
4. **Sort by _update_count** to find most volatile records

## Common Questions

**Q: What happens if a Property ID appears multiple times in one file?**
A: The last occurrence in the file is used (assumes it's the most recent)

**Q: Can I re-run the process?**
A: Yes, it creates a new master file each time with current date

**Q: How do I see what changed for a specific Property ID?**
A: Check the daily processing reports or search the change log JSON files

**Q: Why are some records marked as "unchanged"?**
A: The Property ID exists but all field values are identical to the master