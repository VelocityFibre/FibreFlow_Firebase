# 1Map Sync Usage Guide

*Created: 2025-07-21*  
*Status: Ready for Testing*

## Quick Start

The 1Map sync system is now ready for manual testing! Here's how to use it:

### Step 1: Download CSV from Google Drive

```bash
# Show download instructions
node OneMap/download-from-gdrive.js

# This will:
# - Show the Google Drive link
# - Create download/processed directories
# - List any existing CSV files
```

### Step 2: Process the CSV

```bash
# Process a specific CSV file
node OneMap/process-1map-sync.js OneMap/downloads/your-file.csv

# Or process the latest downloaded file
node OneMap/download-from-gdrive.js --process-latest
```

### Step 3: Review the Report

The sync process will:
1. Import data to `onemap-processing` collection
2. Detect new/changed records
3. Generate a detailed report
4. Save report to `OneMap/reports/`

### Step 4: Check Status

```bash
# View all sync operations
node OneMap/check-sync-status.js
```

## What Happens During Sync

1. **CSV Import**: Reads your 1Map export file
2. **Processing Database**: Stores in `onemap-processing` collection
3. **Change Detection**: Compares with previous syncs using MD5 hashes
4. **Report Generation**: Shows exactly what changed
5. **Manual Review**: You decide whether to sync to production

## Key Features

### ✅ Implemented
- Processing database (`onemap-processing` collection)
- Change detection (new/updated/unchanged)
- Detailed reporting
- Error handling
- Status tracking
- Manual workflow

### 🔮 Future Enhancements
- Automatic sync to production
- Google Drive API integration
- Scheduled syncs
- Email notifications
- Conflict resolution UI

## Important Questions for You

Before we can fully configure the sync, I need to know:

1. **CSV Structure**
   - What columns does 1Map export?
   - What's the unique identifier (Property ID, Pole Number, etc.)?
   - Sample row would be very helpful!

2. **Field Mappings**
   - Which 1Map fields map to FibreFlow fields?
   - Any fields that need transformation?
   - Fields that should be ignored?

3. **Business Rules**
   - When 1Map and FibreFlow data conflict, who wins?
   - Should we preserve any FibreFlow-only fields?
   - How to handle deletions (if any)?

4. **Sync Frequency**
   - Daily at specific time?
   - Multiple times per day?
   - Manual approval always required?

## Directory Structure

```
OneMap/
├── 1MAP_SYNC_ARCHITECTURE.md      # Technical design
├── 1MAP_SYNC_USAGE_GUIDE.md       # This guide
├── process-1map-sync.js           # Main sync processor
├── download-from-gdrive.js        # Download helper
├── check-sync-status.js           # Status checker
├── downloads/                     # Put CSV files here
├── processed/                     # Processed files moved here
└── reports/                       # Sync reports saved here
```

## Testing Workflow

1. **Get Sample Data**
   - Download a recent 1Map export CSV
   - Place in `OneMap/downloads/`

2. **Run First Sync**
   ```bash
   node OneMap/process-1map-sync.js OneMap/downloads/sample.csv
   ```

3. **Review Report**
   - Check `OneMap/reports/sync_report_*.txt`
   - Verify field mappings are correct

4. **Adjust Mappings**
   - Edit `mapToFibreFlow()` function in process-1map-sync.js
   - Customize based on your CSV structure

5. **Test Changes**
   - Make small changes to CSV
   - Run sync again
   - Verify change detection works

## Next Steps

1. **Test with Real Data** - Download actual 1Map export
2. **Configure Field Mappings** - Based on your CSV structure  
3. **Define Business Rules** - Conflict resolution strategy
4. **Plan Production Sync** - How to safely update live data
5. **Consider Automation** - Google Drive API for auto-downloads

## Safety Features

- **Never overwrites all data** - Only syncs changes
- **Processing database** - Isolates from production
- **Detailed reports** - See exactly what will change
- **Manual approval** - You control when to sync
- **Audit trail** - Every sync is tracked

## Support

If you encounter any issues or have questions:
1. Check sync status: `node OneMap/check-sync-status.js`
2. Review reports in `OneMap/reports/`
3. Check Firebase Console for `onemap-processing` collection
4. Let me know what CSV structure you're working with!

---

Ready to test? Start with Step 1 above! 🚀