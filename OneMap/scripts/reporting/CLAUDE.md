# Reporting Scripts

## Purpose
Generate reports from Firebase data. These scripts read from Firebase and create analysis reports.

## Workflow
```
Firebase Data → Analysis → Markdown/CSV Reports
```

## Scripts in this directory

### Database Reports
- `generate-firebase-report.js` - Comprehensive database summary
- `generate-report-with-history.js` - Report including status history
- `generate-pole-report-firebase.js` - Individual pole analysis
- `generate-pole-status-report.js` - Pole status summary

### Change Detection
- `detect-changes-firebase.js` - Find what changed between dates
- `analyze-status-history.js` - Track status progression

### Usage Examples
```bash
# Generate overall report
node generate-firebase-report.js

# Generate report for specific batch
node generate-firebase-report.js --batch IMP_123456789

# Detect changes since yesterday
node detect-changes-firebase.js --since "2025-01-30"

# Pole-specific report
node generate-pole-report-firebase.js "LAW.P.C123"
```

## Report Outputs
- Location: ../reports/
- Format: Markdown (.md)
- Naming: report_YYYY-MM-DD_timestamp.md

## Cross-Reference Validation
Reports should be used to validate imports:
1. Import count should match CSV row count
2. New records should match expected
3. Duplicate poles should be flagged
4. Missing data should be identified