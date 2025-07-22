# Simple CSV Processing Workflow

## Step 1: Process CSV to Staging Only
```bash
# Import CSV to staging database
node process-1map-sync-simple.js --file "downloads/[filename].csv"
```

## Step 2: Generate Report
```bash
# Get report after import
node generate-import-report.js --import-id [ID]
```

## Step 3: STOP AND WAIT
- Data is in STAGING database only
- NO automatic sync to production
- System waits for your instructions

## What You Get:
1. **Import Report** showing:
   - Total records processed
   - Records with/without pole numbers
   - Records with/without agents
   - Data quality score
   - Any duplicates found

2. **Status**: Data safely in staging, waiting for your review

## Next Steps (When You're Ready):
- Review the report
- Decide if data looks good
- Give instruction to sync to production OR rollback

That's it. Simple as that.