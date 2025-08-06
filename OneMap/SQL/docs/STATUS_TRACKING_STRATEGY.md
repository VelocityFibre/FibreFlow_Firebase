# OneMap SQL Status Tracking Strategy
*Date: 2025-08-06*

## Overview
Daily OneMap exports contain both new records and updates to existing records. We must track all status changes while preventing duplicates.

## Key Requirements

### 1. Duplicate Prevention
- **Exact Duplicate**: Same property_id + same status + same date → SKIP
- **Status Change**: Same property_id + different status → TRACK CHANGE
- **Date Update**: Same property_id + same status + different date → UPDATE DATE

### 2. Status Change Tracking
Every status change must be recorded with:
- Property ID
- Old Status → New Status
- Date of change
- Who made the change (agent)
- Import file source
- Change type (new/update/revert)

### 3. Status Revert Detection
Some concerning patterns to track:
- "Installed" → "In Progress" (going backwards)
- "Declined" → "In Progress" (bypassing approval)
- "Approved" → "Pending" (status regression)

## Implementation

### Database Schema

#### Main Table: `status_changes`
Current status of each property (one record per property)

#### History Table: `status_history`
```sql
CREATE TABLE status_history (
  id INTEGER PRIMARY KEY,
  property_id TEXT NOT NULL,
  pole_number TEXT,
  drop_number TEXT,
  old_status TEXT,
  new_status TEXT,
  status_change_date DATETIME,
  import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  import_file TEXT,
  import_batch_id TEXT,
  agent TEXT,
  address TEXT,
  change_type TEXT -- 'new', 'update', 'revert'
);
```

### Import Process

1. **Pre-Import Analysis**
   ```bash
   node scripts/analyze-before-import.js filename.xlsx
   ```
   - Shows what will change
   - Identifies duplicates
   - Highlights concerns

2. **Import with Tracking**
   ```bash
   node scripts/import-with-tracking.js filename.xlsx
   ```
   - Imports to staging first
   - Compares with existing data
   - Records all changes
   - Updates main table
   - Skips duplicates

3. **Post-Import Verification**
   - Check status_history table
   - Review audit log
   - Generate change report

## Status Flow Rules

### Normal Progression
1. Pole Permission: Pending
2. Pole Permission: Approved
3. Home Sign Ups: Pending
4. Home Sign Ups: Approved
5. Home Sign Ups: Approved & Installation Scheduled
6. Home Installation: In Progress
7. Home Installation: Installed

### Allowed Variations
- Declined → Approved (after resolution)
- In Progress → Re-scheduled

### Concerning Patterns
- ⚠️ Installed → In Progress
- ⚠️ Approved → Pending
- ⚠️ Declined → In Progress (without approval)

## Daily Workflow

### Morning Import Process
1. Download new Excel from OneMap
2. Copy to `data/excel/` folder
3. Run pre-import analysis
4. Review changes
5. Import with tracking
6. Check audit log
7. Generate daily report

### Key Metrics to Track
- New properties per day
- Status changes per day
- Average time between statuses
- Properties with multiple status changes
- Revert patterns

## Query Examples

### Find Today's Status Changes
```sql
SELECT * FROM status_history 
WHERE DATE(import_date) = DATE('now')
ORDER BY status_change_date DESC;
```

### Track Property History
```sql
SELECT * FROM status_history 
WHERE property_id = '123456'
ORDER BY status_change_date;
```

### Find Concerning Reverts
```sql
SELECT * FROM status_history 
WHERE change_type = 'revert'
ORDER BY import_date DESC;
```

### Daily Summary
```sql
SELECT 
  DATE(import_date) as date,
  COUNT(CASE WHEN change_type = 'new' THEN 1 END) as new_properties,
  COUNT(CASE WHEN change_type = 'update' THEN 1 END) as status_updates,
  COUNT(CASE WHEN change_type = 'revert' THEN 1 END) as reverts
FROM status_history
GROUP BY DATE(import_date)
ORDER BY date DESC;
```

## Best Practices

1. **Always analyze before importing**
2. **Keep original Excel files**
3. **Document anomalies**
4. **Regular database backups**
5. **Monitor for unusual patterns**

## Troubleshooting

### High Duplicate Count
- Normal for daily exports
- Most records unchanged
- Focus on the changes

### Missing Status Changes
- Check date mapping
- Verify property_id match
- Review agent field mapping

### Performance Issues
- Index key fields
- Archive old history
- Use batch processing