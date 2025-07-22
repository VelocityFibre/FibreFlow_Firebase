# Daily CSV Analysis - Output Guide

## Overview

The daily CSV analysis system processes all your OneMap CSV files and generates comprehensive reports showing how data changes over time.

## How to Run

```bash
cd OneMap/GraphAnalysis
./RUN_DAILY_ANALYSIS.sh
```

Or directly:
```bash
node process-all-daily-csvs.js
```

## Output Structure

```
GraphAnalysis/
├── reports/
│   ├── REPORT_INDEX.md                    # 📋 START HERE - Index of all reports
│   ├── complete/
│   │   └── daily_analysis_2025-01-23/     # Today's analysis session
│   │       ├── daily_analysis_2025-01-23_MASTER_REPORT.md    # 📊 Executive summary
│   │       ├── daily_analysis_2025-01-23_DATA_SUMMARY.json   # 📈 Complete data
│   │       └── daily_analysis_2025-01-23_CHANGE_ANALYSIS.md  # 🔄 Daily changes
│   ├── daily/                             # Individual day comparisons
│   └── summary/                           # Duplicate analysis results
```

## Report Types Explained

### 1. **MASTER_REPORT.md** (Start Here)
The executive summary containing:
- Total files analyzed
- Key findings and statistics
- Duplicate issues summary
- Daily change overview
- Links to all other reports

**Example content:**
```markdown
# OneMap Daily CSV Analysis - Master Report

**Total Files Analyzed**: 15
**Date Range**: 2025-05-22 to 2025-07-21

### Key Findings
- Total New Entities Added: 5,234
- Total Modifications: 12,456
- Total Entities Removed: 1,023

### Duplicate Issues Found
- Duplicate Poles: 234 groups
- Duplicate Drops: 567 groups
```

### 2. **DATA_SUMMARY.json** (Machine-Readable)
Complete analysis data in JSON format for:
- Integration with other systems
- Further processing
- Detailed inspection

**Structure:**
```json
{
  "sessionId": "daily_analysis_2025-01-23",
  "filesAnalyzed": 15,
  "dateRange": {
    "start": "2025-05-22",
    "end": "2025-07-21"
  },
  "changeReports": [...],
  "duplicateReport": {...},
  "totals": {
    "newEntities": 5234,
    "modifications": 12456,
    "removals": 1023
  }
}
```

### 3. **CHANGE_ANALYSIS.md** (Daily Progression)
Detailed day-by-day change tracking:
- What changed between each day
- Growth vs shrink patterns
- Average daily changes
- Trends and insights

**Example content:**
```markdown
## Day 1: 2025-06-03 → 2025-06-05
- New Entities: 892
- Modified: 1,245
- Removed: 103
- Net Change: +789
```

### 4. **REPORT_INDEX.md** (Navigation)
Central index linking all reports:
- Organized by date
- Quick access to any session
- Historical record of all analyses

## Understanding the Results

### Entity Types Tracked
1. **Poles** - Physical installation points (e.g., LAW.P.B167)
2. **Drops** - Service connections (e.g., DR1234)
3. **Addresses** - Physical locations
4. **Properties** - Property IDs

### Change Types
- **New**: Entity appears for first time
- **Modified**: Status, agent, or location changed
- **Removed**: Entity no longer in dataset
- **Unchanged**: Entity present but no changes

### Duplicate Detection
The system identifies when the same entity appears multiple times:
- Within a single day (data quality issue)
- Across different addresses (pole location conflicts)
- With different agents (payment verification needed)

## Common Use Cases

### 1. **Payment Verification**
Check duplicate poles to prevent double payments:
```bash
# Look in MASTER_REPORT.md under "Duplicate Issues Found"
```

### 2. **Progress Tracking**
See installation progress over time:
```bash
# Check CHANGE_ANALYSIS.md for daily progression
```

### 3. **Data Quality**
Identify and fix data issues:
```bash
# Review duplicate reports in summary/ directory
```

### 4. **Historical Analysis**
Compare any two specific days:
```bash
node processors/track-daily-changes.js "../downloads/day1.csv" "../downloads/day2.csv"
```

## Tips

1. **Start with REPORT_INDEX.md** - It links to everything
2. **Read MASTER_REPORT first** - Get the big picture
3. **Use JSON for automation** - DATA_SUMMARY.json has all raw data
4. **Check duplicates regularly** - Prevent payment issues

## Troubleshooting

### "No CSV files found"
- Check that CSV files are in `OneMap/downloads/`
- Ensure filenames contain dates (June3, July Week 3, etc.)

### "Comparison failed"
- Some CSVs might have different formats
- Check individual file processing in console output

### Memory issues
- Process files in smaller batches
- Increase Node memory: `node --max-old-space-size=4096 process-all-daily-csvs.js`