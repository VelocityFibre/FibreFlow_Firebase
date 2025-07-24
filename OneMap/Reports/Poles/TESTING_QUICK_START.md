# Pole Reports Testing Quick Start Guide

**Purpose**: Quick reference for testing the pole reports system  
**Time Required**: 15-20 minutes for all tests

## Prerequisites Check

```bash
# 1. Navigate to scripts directory
cd /home/ldp/VF/Apps/FibreFlow/OneMap/Reports/Poles/scripts

# 2. Check Node.js version (should be 20+)
node --version

# 3. Install dependencies if needed
npm install
```

## Quick Test Sequence

### 1️⃣ Upload Test Data (2 minutes)
```bash
node upload-test-reports.js
```
✅ **Success**: Should see "Test reports are now available in Firebase!"

### 2️⃣ Check Web UI (3 minutes)
1. Open: https://fibreflow-73daf.web.app/analytics/dashboard
2. Login if needed
3. ✅ **Success**: Should see 2 reports (LAW.P.A508, LAW.P.A707)

### 3️⃣ Test Report Generation (2 minutes)
```bash
node generate-pole-report-enhanced.js LAW.P.A508
```
✅ **Success**: Should see JSON report with timeline, drops, agents

### 4️⃣ Test Batch Processing (3 minutes)
```bash
# Dry run - no actual saves
node batch-process-pole-reports.js --dry-run --limit 3
```
✅ **Success**: Should show "Would process 3 poles" with performance stats

### 5️⃣ Check Performance (1 minute)
```bash
node performance-monitor.js
```
✅ **Success**: Should see memory usage and system metrics

## Verify Everything Works

### Firebase Console Check
1. Go to: https://console.firebase.google.com/project/fibreflow-73daf/firestore
2. Navigate to: `analytics > pole-reports-summary`
3. ✅ Should see 2 documents (LAW.P.A508, LAW.P.A707)

### UI Components Check
1. From dashboard, click on LAW.P.A508
2. ✅ Should navigate to: `/analytics/pole-report/LAW.P.A508`
3. ✅ Should see detailed report (once component is implemented)

## Common Test Commands

```bash
# Test single pole report
node generate-pole-report-enhanced.js LAW.P.A707

# Test with your own pole
node generate-pole-report-enhanced.js YOUR.POLE.NUMBER

# Check what would be processed
node batch-process-pole-reports.js --dry-run

# Process specific poles
node batch-process-pole-reports.js --limit 10

# Monitor performance in real-time
node performance-monitor.js --monitor

# Test daily scheduler
node daily-update-scheduler.js
```

## Quick Troubleshooting

### Nothing in Firebase?
```bash
# Re-run upload
node upload-test-reports.js

# Check Firebase directly
firebase firestore:get analytics/pole-reports-summary --limit 2
```

### UI Not Loading?
1. Check browser console (F12)
2. Hard refresh (Ctrl+Shift+R)
3. Check network tab for failed requests

### CSV Not Found?
```bash
# Check CSV path
ls ../../../GraphAnalysis/data/master/master_csv_latest_validated.csv

# Update path in batch-process-pole-reports.js if needed
```

### Out of Memory?
```bash
# Run with more memory
node --max-old-space-size=4096 batch-process-pole-reports.js --limit 100
```

## Test Results Summary

| Test | Command | Expected Result | Time |
|------|---------|-----------------|------|
| Upload Test Data | `node upload-test-reports.js` | 2 reports uploaded | 30s |
| View Dashboard | Browse to /analytics/dashboard | See 2 reports | 1m |
| Generate Report | `node generate-pole-report-enhanced.js LAW.P.A508` | JSON output | 10s |
| Batch Dry Run | `node batch-process-pole-reports.js --dry-run --limit 3` | Shows 3 poles | 5s |
| Performance | `node performance-monitor.js` | System metrics | 5s |

## Next Steps After Testing

1. **If all tests pass**: System is ready for production use
2. **If some tests fail**: Check troubleshooting section
3. **For production**: Set up daily cron job for automation

---

**Quick Help**: 
- Full docs: `POLE_REPORTS_SYSTEM_DOCUMENTATION.md`
- Implementation plan: `POLE_REPORTS_IMPLEMENTATION_PLAN_2025-07-24.md`