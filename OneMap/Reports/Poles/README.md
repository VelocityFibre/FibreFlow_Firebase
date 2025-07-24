# Pole Reports System

## Overview

This directory contains the standardized pole reporting system for OneMap data analysis. The system generates comprehensive timeline reports for individual poles, tracking status changes, connected drops, and agent activity.

## Directory Structure

```
Poles/
├── scripts/              # Processing scripts
├── generated/            # Output reports (JSON and Markdown)
├── templates/            # Report templates
└── metadata/             # Script versioning and logs
```

## Available Scripts

### 1. generate-pole-report.js
Generates a detailed JSON report for a specific pole.

**Usage:**
```bash
node scripts/generate-pole-report.js LAW.P.A508
```

**Output:**
- Console display of pole summary
- JSON file saved to `generated/` directory

### 2. analyze-pole-history.js
Creates comprehensive timeline analysis with status progression.

**Usage:**
```bash
node scripts/analyze-pole-history.js LAW.P.A707
```

**Output:**
- Detailed console output with chronological timeline
- Status change analysis
- Connected drops summary

### 3. find-active-poles.js
Identifies poles with highest activity levels for management reporting.

**Usage:**
```bash
node scripts/find-active-poles.js
```

**Output:**
- Top 15 most active poles ranked by activity score
- Recommendations for detailed reporting

## Data Source

All scripts read from the validated master CSV:
`../../GraphAnalysis/data/master/master_csv_latest_validated.csv`

## Report Format

Reports follow a standardized format including:
- Timeline summary
- Key findings
- Detailed chronological events
- Connected drops analysis
- Agent activity tracking
- Data quality notes
- Operational insights

## Version Tracking

Script versions and report metadata are tracked in:
- `metadata/script-versions.json` - Script inventory
- `metadata/processing-log.json` - Processing history

## Future Integration

These reports will be integrated into FibreFlow's Analytics module with:
- Daily automated updates
- PDF/Excel export functionality
- Mobile-friendly views (planned)
- Real-time data synchronization

## Examples

View example reports in the `generated/` directory:
- `pole-LAW.P.A508-complete-timeline.md`
- `pole-LAW.P.A707-complete-timeline.md`

## Testing Scripts

Test the scripts are working correctly:
```bash
# From the OneMap directory
cd Reports/Poles

# Test pole report generation
node scripts/generate-pole-report.js LAW.P.A508

# Find active poles
node scripts/find-active-poles.js

# Analyze specific pole history
node scripts/analyze-pole-history.js LAW.P.A707
```