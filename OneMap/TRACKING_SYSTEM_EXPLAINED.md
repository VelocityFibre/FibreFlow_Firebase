# How OneMap Tracking System Works

##  The Tracking Flow

### 1. **Primary Source of Truth: CSV_PROCESSING_LOG.md**
This file is automatically updated after each CSV import:

```markdown
| Date | CSV File | Import Date | Records | New Props | Status Changes |
|------|----------|-------------|---------|-----------|----------------|
| June 22, 2025 | Lawley June Week 3 22062025.csv | 2025-07-24 | 9315 | 1152 | 32 |
```

### 2. **How It Updates Automatically**

#### When you process a CSV:
```bash
# Running this command:
cd OneMap && node scripts/bulk-import-onemap.js "downloads/filename.csv"

# Automatically does:
1. Imports data to Firebase
2. Generates report
3. Updates CSV_PROCESSING_LOG.md with results
4. Creates entry with: date, filename, records count, new properties
```

#### The Update Process:
```javascript
// Inside bulk-import-onemap.js
async function updateProcessingLog(filename, results) {
    const logEntry = `| ${date} | ${filename} | ${importDate} | ${records} | ${newProps} | ${changes} |`;
    fs.appendFileSync('CSV_PROCESSING_LOG.md', logEntry);
}
```

### 3. **What Gets Tracked**

- **File Processing Status**: Which CSVs have been imported
- **Import Metrics**: How many records, new properties, status changes
- **Data Quality Issues**: Notes about corrupted data
- **Processing Date**: When each file was processed
- **Sequential Order**: Files are processed chronologically

### 4. **How Morning Status Finds Next File**

```bash
# The morning-status.sh script:
1. Reads all processed files from CSV_PROCESSING_LOG.md
2. Lists all CSV files in downloads/ directory
3. Compares to find unprocessed files
4. Returns the first unprocessed file (chronologically)
```

### 5. **Manual Updates (If Needed)**

If something goes wrong, you can manually update:

```bash
# Edit the log
nano OneMap/CSV_PROCESSING_LOG.md

# Add entry manually
| July 16, 2025 | Lawley July Week 3 16072025.csv | 2025-01-30 | 1000 | 50 | 10 |
```

##  State Management Components

### 1. **CSV_PROCESSING_LOG.md**
- Main tracking file
- Updated after each import
- Source of truth for what's done

### 2. **Firebase Database**
- Stores actual imported data
- Each record has importBatch ID
- Tracks which CSV it came from

### 3. **Import Reports**
- Generated after each import
- Stored in OneMap/reports/
- Contains detailed analysis

### 4. **Memory System**
Save important state to Claude's memory:
```bash
# After processing
node .claude/zep-bridge.js add-fact "onemap" "Last processed July 16, next is July 17"
```

##  Keeping Everything in Sync

### After Each Import:
1. **Automatic**: Processing log updates
2. **Automatic**: Report generation
3. **Manual**: Save to memory (optional but helpful)

### Daily Workflow:
```bash
# Morning
morning                    # Check status
onemap-next               # Process next file
# System auto-updates log

# Evening (optional)
node .claude/zep-bridge.js add-fact "onemap" "Processed July 16-18 today"
```

##  Important Notes

1. **Never Skip Files**: Process in chronological order
2. **Check for Gaps**: Missing files will be flagged
3. **Data Quality**: Issues are noted in the log
4. **Backup**: The log file is your recovery point

##  Quick Recovery

If state is lost:
```bash
# Check what's been done
cat OneMap/CSV_PROCESSING_LOG.md

# Find next file
morning

# Continue where left off
onemap-next
```

The system is designed to be self-documenting and self-recovering!