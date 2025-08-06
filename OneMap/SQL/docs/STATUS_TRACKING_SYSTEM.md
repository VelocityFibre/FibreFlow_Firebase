# OneMap SQL Status Tracking System Documentation

**Created**: 2025-08-06  
**Purpose**: Comprehensive guide to the status change tracking and anomaly detection system

## Overview

The OneMap SQL Analytics system provides comprehensive tracking of pole/drop installation status changes over time, with special focus on detecting and reporting anomalies that could affect payment processing and operational efficiency.

## System Architecture

### Database Tables

#### 1. `status_changes`
Primary table storing the current status of all properties.
- **Purpose**: Baseline data (e.g., August 1 snapshot)
- **Key Fields**: property_id, pole_number, drop_number, status, status_date, agent

#### 2. `status_history`
Tracks all status changes over time.
- **Purpose**: Complete audit trail of status transitions
- **Fields**: property_id, old_status, new_status, change_date, change_type (new/update/revert)

#### 3. `status_anomalies`
Records all detected anomalies for investigation.
- **Purpose**: Flag concerning patterns for review
- **Anomaly Types**:
  - `status_revert` - Backwards progression
  - `bypassed_approval` - Skipped required steps
  - `impossible_transition` - Invalid status changes
  - `missing_prerequisite` - Missing required prior status

#### 4. `anomaly_rules`
Defines detection rules for anomalies.
- **Purpose**: Configurable anomaly detection
- **Current Rules**: 8 active rules covering major concerns

## Status Change Tracking Workflow

### 1. Import Process
```bash
# Import new data with tracking
node scripts/import-with-tracking.js filename.xlsx
```

This script:
- Loads data into staging table
- Compares with existing data
- Identifies status changes
- Tracks changes in history table
- Detects anomalies automatically

### 2. Analysis & Reporting
```bash
# Comprehensive change detection
node scripts/detect-status-changes-comprehensive.js

# Status revert specific report
node scripts/generate-status-revert-report.js

# Anomaly detection report
node scripts/detect-anomalies.js --export
```

## Status Progression Rules

### Expected Workflow
1. Pole Permission: Pending
2. Pole Permission: Approved
3. Home Sign Ups: Pending
4. Home Sign Ups: Approved
5. Home Sign Ups: Approved & Installation Scheduled
6. Home Installation: In Progress
7. Home Installation: Installed

### Anomaly Definitions

#### Status Reverts (Backwards Movement)
- **Critical**: 4+ levels backwards
- **High**: 3 levels backwards (e.g., Installed → In Progress)
- **Medium**: 2 levels backwards
- **Low**: 1 level backwards

#### Bypassed Approvals
- **Critical**: Declined → In Progress/Installed
- **High**: No Sign Up → Installation

## Reports Generated

### 1. Status Change Report
**File**: `STATUS_CHANGE_REPORT_YYYY-MM-DD.md`
- Comprehensive overview of all changes
- Categorizes normal vs anomalous changes
- Includes recommendations

### 2. Status Revert Report
**File**: `STATUS_REVERT_REPORT_YYYY-MM-DD.md`
- Focuses specifically on backwards progressions
- **Data Source**: SQL database (NOT Excel)
- Includes severity assessment
- Property-specific recommendations

### 3. Anomaly Detection Report
**File**: `Anomaly_Report_YYYY-MM-DD.xlsx`
- Multi-sheet Excel with all anomalies
- Geographic clustering analysis
- Agent performance insights

## Key Findings from August 1-2 Analysis

### Statistics
- **Total Status Changes**: 11 (out of 13,764 properties)
- **Change Rate**: 0.08%
- **Anomaly Rate**: 27% of changes were problematic

### Critical Issues Found
1. **Status Revert**: Property 342119 (Installed → In Progress)
2. **Bypassed Approval**: Property 322771 (Declined → In Progress)
3. **Bypassed Approval**: Property 370975 (Declined → In Progress)

### Verification
- Results independently confirmed by DuckDB analysis
- 100% match between different analysis methods

## Database Queries

### Find Status Changes
```sql
SELECT 
  a2.property_id,
  a1.status as old_status,
  a2.status as new_status
FROM august2_data a2
JOIN status_changes a1 ON a2.property_id = a1.property_id
WHERE a1.status != a2.status;
```

### Identify Reverts
```sql
SELECT * FROM status_history
WHERE change_type = 'revert'
ORDER BY status_change_date DESC;
```

### Check Anomalies
```sql
SELECT * FROM status_anomalies
WHERE resolved = 0
ORDER BY severity DESC, detected_date DESC;
```

## Best Practices

### Daily Import Process
1. Copy Excel file to `data/excel/`
2. Run pre-import analysis
3. Import with tracking enabled
4. Generate status revert report
5. Review anomalies before payment processing

### Data Quality
- Always track status changes between imports
- Investigate all anomalies before processing payments
- Maintain complete audit trail
- Document resolution of anomalies

### Performance
- System handles 13,000+ records efficiently
- Import time: < 30 seconds
- Report generation: < 5 seconds

## Troubleshooting

### Common Issues

#### No Status Changes Detected
- Check column mappings in excel-importer.js
- Verify batch IDs in staging comparison
- Ensure proper date ordering of imports

#### High Anomaly Rate
- May indicate systematic data collection issues
- Review agent training requirements
- Check for system synchronization problems

## Future Enhancements

1. **Real-time Alerts** - Immediate notification of anomalies
2. **Dashboard** - Visual status change monitoring
3. **API Integration** - Direct connection to 1Map system
4. **Predictive Analysis** - Identify patterns before issues occur

---

*For technical support, refer to CLAUDE.md or contact the data team*