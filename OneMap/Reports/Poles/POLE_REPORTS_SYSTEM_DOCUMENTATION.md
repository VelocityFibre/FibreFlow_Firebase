# Pole Reports System Documentation

**Created**: 2025-07-24  
**Status**: Phase 3 Complete - Ready for Testing  
**Purpose**: Comprehensive documentation of the pole reporting system for OneMap data

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Data Flow](#data-flow)
5. [Testing Instructions](#testing-instructions)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

## System Overview

The Pole Reports System is a comprehensive analytics platform that processes OneMap CSV data to generate detailed reports about fiber optic pole installations. The system consists of:

- **Batch Processing Engine**: Processes CSV files and detects changes
- **Report Generation**: Creates comprehensive JSON reports with timeline, drops, agents, and data quality
- **Firebase Storage**: Stores reports with versioning (current + previous)
- **Daily Automation**: Monitors for new CSV files and processes automatically
- **Performance Monitoring**: Tracks system performance and generates metrics
- **Web UI**: Angular components for viewing reports in FibreFlow

## Architecture

### Technology Stack
- **Backend**: Node.js scripts for CSV processing
- **Database**: Firebase Firestore for report storage
- **Frontend**: Angular 17+ with Material Design
- **State Management**: Signals and RxJS
- **Data Format**: JSON reports with structured data

### Directory Structure
```
OneMap/Reports/Poles/
├── scripts/                          # Processing scripts
│   ├── batch-process-pole-reports.js # Main batch processor
│   ├── generate-pole-report-enhanced.js # Report generator
│   ├── daily-update-scheduler.js    # Daily automation
│   ├── performance-monitor.js       # Performance tracking
│   └── upload-test-reports.js       # Test data uploader
├── generated/                        # Output reports
├── templates/                        # Report templates
└── metadata/                         # Processing logs
    ├── processing-log.json          # Processing history
    └── script-versions.json         # Version tracking
```

### Firebase Structure
```
analytics/
├── pole-reports/                    # Main report storage
│   └── {poleNumber}/
│       ├── current (document)       # Latest report
│       └── previous (document)      # Previous version
├── pole-reports-summary/            # Report metadata
│   └── {poleNumber} (document)
└── daily-summaries/                 # Daily processing stats
    └── {date} (document)
```

## Components

### 1. Batch Processing Engine (`batch-process-pole-reports.js`)

**Purpose**: Main engine for processing CSV files and generating reports

**Features**:
- Change detection (only processes modified poles)
- Concurrent processing with configurable batch size
- Firebase integration for report storage
- Version management (current + previous)
- Command-line options for flexibility
- Performance tracking and metrics

**Configuration**:
```javascript
const CONFIG = {
  CSV_PATH: '../../../GraphAnalysis/data/master/master_csv_latest_validated.csv',
  METADATA_PATH: '../metadata/processing-log.json',
  REPORTS_COLLECTION: 'analytics/pole-reports',
  BATCH_SIZE: 100,
  MAX_CONCURRENT: 5,
  CACHE_HOURS: 24
};
```

**Command Options**:
- `--force-all`: Regenerate all reports regardless of changes
- `--dry-run`: Simulate processing without saving
- `--limit <number>`: Process only specified number of poles

### 2. Enhanced Report Generator (`generate-pole-report-enhanced.js`)

**Purpose**: Creates comprehensive JSON reports for individual poles

**Report Structure**:
```javascript
{
  poleNumber: string,
  generatedAt: ISO timestamp,
  dataSource: 'CSV',
  version: 'current',
  summary: {
    totalRecords: number,
    totalDrops: number,
    dateRange: { earliest, latest },
    currentStatus: string,
    dataCompleteness: percentage
  },
  timeline: [{
    date: timestamp,
    status: string,
    changes: array,
    agent: string
  }],
  drops: [{
    dropNumber: string,
    address: string,
    status: string,
    records: array
  }],
  agents: [{
    name: string,
    recordCount: number,
    latestActivity: timestamp,
    statuses: object
  }],
  dataQuality: {
    score: percentage,
    issues: array,
    missingFields: object
  }
}
```

### 3. Daily Update Scheduler (`daily-update-scheduler.js`)

**Purpose**: Automated daily processing of new CSV files

**Features**:
- Monitors CSV directory for new files
- Detects changes since last processing
- Triggers batch processing automatically
- Generates daily summary reports
- File-based reporting (no email dependencies)

**Cron Job Setup**:
```bash
# Add to crontab
0 3 * * * cd /path/to/FibreFlow/OneMap/Reports/Poles/scripts && node daily-update-scheduler.js >> daily-update.log 2>&1
```

### 4. Performance Monitor (`performance-monitor.js`)

**Purpose**: Tracks system performance and generates metrics

**Metrics Collected**:
- Memory usage (total, free, percentage)
- CPU utilization
- Processing times
- Firebase query performance
- Batch processing statistics

**Modes**:
- **Analysis Mode**: One-time performance report
- **Monitor Mode**: Real-time monitoring with live updates

### 5. Test Data Uploader (`upload-test-reports.js`)

**Purpose**: Uploads sample reports to Firebase for UI testing

**Test Poles**:
- LAW.P.A508 (15 records, 3 drops, 2 agents)
- LAW.P.A707 (28 records, 5 drops, 6 agents)

### 6. Angular UI Components

**Analytics Service** (`pole-analytics.service.ts`):
- Firebase integration with caching
- Report retrieval and storage
- In-memory cache for performance
- Automatic cache cleanup

**Analytics Dashboard** (`analytics-dashboard.component.ts`):
- List of available reports
- Search and filtering
- Dashboard statistics
- Navigation to detailed reports

**Routes Configuration**:
- `/analytics/dashboard` - Main dashboard
- `/analytics/pole-report/:poleNumber` - Individual pole report

## Data Flow

### Processing Pipeline

1. **CSV Input**
   - Daily CSV files from OneMap export
   - Contains pole installation and status data

2. **Change Detection**
   - Compare with previous processing metadata
   - Identify new or modified poles

3. **Report Generation**
   - Process pole records
   - Build timeline from status changes
   - Aggregate drop connections
   - Analyze agent activities
   - Assess data quality

4. **Firebase Storage**
   - Store report with versioning
   - Update summary metadata
   - Maintain previous version

5. **UI Display**
   - Dashboard shows available reports
   - Click to view detailed pole report
   - Real-time updates from Firebase

### Daily Automation Flow

```
3:00 AM → Check for new CSV files
        ↓
        → Process new/changed poles
        ↓
        → Generate reports
        ↓
        → Store in Firebase
        ↓
        → Update summary stats
        ↓
        → Generate daily report
```

## Testing Instructions

### Prerequisites

1. **Install Dependencies**:
```bash
cd /home/ldp/VF/Apps/FibreFlow/OneMap/Reports/Poles/scripts
npm install
```

2. **Verify Firebase Configuration**:
- Check Firebase credentials in scripts
- Ensure project ID is correct: `fibreflow-73daf`

### Test 1: Upload Test Reports

**Purpose**: Verify Firebase integration and UI components

```bash
# Upload test reports to Firebase
cd scripts
node upload-test-reports.js
```

**Expected Output**:
```
🚀 Uploading Test Reports to Firebase
============================================================
📤 Uploading report for pole LAW.P.A508...
✅ Successfully uploaded report for LAW.P.A508
📤 Uploading report for pole LAW.P.A707...
✅ Successfully uploaded report for LAW.P.A707

============================================================
📊 Upload Complete
   Successful: 2
   Failed: 0

✅ Test reports are now available in Firebase!
   You can view them at:
   https://fibreflow-73daf.web.app/analytics/dashboard
```

### Test 2: View Analytics Dashboard

1. **Navigate to FibreFlow**:
```
https://fibreflow-73daf.web.app/analytics/dashboard
```

2. **Verify Dashboard Shows**:
   - LAW.P.A508 report
   - LAW.P.A707 report
   - Statistics (2 total, 100% availability)
   - Search functionality
   - Filter options

3. **Click on a Report**:
   - Should navigate to detailed pole report
   - Verify all sections load correctly

### Test 3: Batch Processing (Dry Run)

**Purpose**: Test batch processing without saving to Firebase

```bash
cd scripts
node batch-process-pole-reports.js --dry-run --limit 5
```

**Expected Output**:
- Shows 5 poles that would be processed
- No actual Firebase writes
- Performance metrics displayed

### Test 4: Generate Single Report

**Purpose**: Test report generation for a specific pole

```bash
cd scripts
node generate-pole-report-enhanced.js LAW.P.A508
```

**Expected Output**:
- Detailed JSON report in console
- Summary statistics
- Timeline of status changes
- Connected drops information
- Agent activity summary

### Test 5: Performance Monitoring

**Purpose**: Check system performance

```bash
cd scripts
# One-time analysis
node performance-monitor.js

# Real-time monitoring (press Ctrl+C to stop)
node performance-monitor.js --monitor
```

**Expected Metrics**:
- Memory usage statistics
- Processing time analysis
- Firebase query performance
- System resource utilization

### Test 6: Daily Scheduler (Manual Run)

**Purpose**: Test daily automation manually

```bash
cd scripts
node daily-update-scheduler.js
```

**Expected Output**:
- Scans for new CSV files
- Processes any changes
- Generates daily summary
- Updates Firebase

### Test 7: Full Batch Processing

**Purpose**: Process all poles (use with caution)

```bash
cd scripts
# Process only changed poles
node batch-process-pole-reports.js

# Force regenerate first 10 poles
node batch-process-pole-reports.js --force-all --limit 10
```

## Troubleshooting

### Common Issues

#### 1. Firebase Connection Error
**Symptom**: "Failed to connect to Firebase"

**Solutions**:
- Check internet connection
- Verify Firebase configuration in scripts
- Ensure Firebase project exists and is accessible

#### 2. CSV File Not Found
**Symptom**: "CSV file not found at path"

**Solutions**:
- Verify CSV path in CONFIG
- Check file exists at specified location
- Update path if OneMap structure changed

#### 3. Memory Issues with Large CSV
**Symptom**: "JavaScript heap out of memory"

**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 batch-process-pole-reports.js
```

#### 4. Reports Not Showing in UI
**Symptom**: Dashboard shows no reports

**Solutions**:
- Check browser console for errors
- Verify Firebase rules allow read access
- Run upload-test-reports.js to create test data
- Check network tab for failed requests

#### 5. Performance Issues
**Symptom**: Slow processing or timeouts

**Solutions**:
- Reduce batch size in CONFIG
- Lower MAX_CONCURRENT setting
- Process in smaller chunks using --limit
- Check system resources with performance monitor

### Debug Commands

```bash
# Check Firebase data directly
firebase firestore:get analytics/pole-reports-summary --limit 5

# View processing log
cat metadata/processing-log.json | jq .

# Check specific pole in Firebase
firebase firestore:get analytics/pole-reports/LAW.P.A508/current

# Monitor Node.js memory usage
node --trace-gc batch-process-pole-reports.js --limit 10
```

## Maintenance

### Daily Tasks
- Monitor daily-update.log for errors
- Check Firebase usage/quotas
- Verify new CSV files are processed

### Weekly Tasks
- Review performance metrics
- Clean up old logs
- Update processing metadata
- Check for failed processes

### Monthly Tasks
- Archive old CSV files
- Review and optimize queries
- Update documentation
- Performance analysis

### Configuration Updates

#### Update CSV Path
Edit `CONFIG.CSV_PATH` in:
- `batch-process-pole-reports.js`
- `generate-pole-report-enhanced.js`
- `daily-update-scheduler.js`

#### Adjust Processing Parameters
```javascript
// In batch-process-pole-reports.js
const CONFIG = {
  BATCH_SIZE: 100,        // Increase for faster processing
  MAX_CONCURRENT: 5,      // Increase for more parallelism
  CACHE_HOURS: 24        // Adjust cache duration
};
```

#### Firebase Collection Names
If changing collection structure, update:
- `REPORTS_COLLECTION` in scripts
- `REPORTS_BASE` in pole-analytics.service.ts
- `SUMMARY_COLLECTION` in both locations

### Adding New Report Fields

1. **Update Report Generator**:
   - Edit `generate-pole-report-enhanced.js`
   - Add new fields to report structure
   - Update builder functions

2. **Update TypeScript Models**:
   - Edit `pole-report.model.ts`
   - Add new fields to interfaces

3. **Update UI Components**:
   - Add display logic for new fields
   - Update dashboard if needed

4. **Test Changes**:
   - Generate test report
   - Upload to Firebase
   - Verify UI displays correctly

## Next Steps (Phase 4)

### Planned Enhancements
1. **Error Handling**
   - Retry logic for failed processes
   - Better error reporting
   - Recovery mechanisms

2. **Performance Optimization**
   - Implement streaming for large CSV files
   - Optimize Firebase queries
   - Add indexing strategies

3. **User Features**
   - Export reports to PDF/Excel
   - Email notifications for important changes
   - Custom report scheduling

4. **Monitoring**
   - Add Sentry integration
   - Create monitoring dashboard
   - Set up alerts for failures

---

**Support**: For issues or questions, check the implementation plan at `POLE_REPORTS_IMPLEMENTATION_PLAN_2025-07-24.md`