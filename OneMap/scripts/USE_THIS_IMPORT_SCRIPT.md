# ⚠️ CRITICAL: CORRECT IMPORT SCRIPT TO USE

## ✅ USE THIS SCRIPT FOR ALL IMPORTS:
```bash
node scripts/firebase-import/bulk-import-with-history.js "filename.csv"
```

## ❌ DO NOT USE:
- `bulk-import-onemap.js` - ARCHIVED (no status tracking)
- Any scripts in root scripts/ directory

## Why bulk-import-with-history.js?
1. **Tracks Status History** - Maintains complete audit trail
2. **Detects Changes** - Knows when status actually changes
3. **Preserves Data** - Doesn't overwrite historical information
4. **Better Reporting** - Shows new records vs status changes
5. **Photo Tracking** - Enhanced photo quality tracking

## Correct Import Workflow:
```bash
# 1. Copy file to downloads/
cp "downloads/Lawley Raw Stats/filename.csv" downloads/

# 2. Run import with history tracking
node scripts/firebase-import/bulk-import-with-history.js "filename.csv"

# 3. Check the report output for:
   - New properties count
   - Status changes detected
   - Photo tracking results

# 4. Update CSV_PROCESSING_LOG.md with results
```

## What This Script Tracks:
- **statusHistory[]** - Array of all status changes with dates
- **currentStatus** - Latest status from most recent import
- **hadStatusChangeInImport** - Boolean if status changed in this import
- **Import metadata** - Which file/batch caused each change

## Example Status History:
```javascript
{
  propertyId: "12345",
  currentStatus: "Home Installation: In Progress",
  statusHistory: [
    {
      date: "2025-05-22",
      status: "Pole Permission: Approved",
      agent: "Yolanda",
      batchId: "IMP_123456",
      fileName: "Lawley May Week 3 22052025.csv"
    },
    {
      date: "2025-06-15", 
      status: "Home Sign Ups: Approved & Installation Scheduled",
      agent: "Yolanda",
      batchId: "IMP_789012",
      fileName: "Lawley June Week 2 15062025.csv"
    },
    {
      date: "2025-07-01",
      status: "Home Installation: In Progress",
      agent: "Yolanda", 
      batchId: "IMP_345678",
      fileName: "Lawley July Week 1 01072025.csv"
    }
  ]
}
```

## Created: 2025-01-31
## Reason: We've been using the wrong script that doesn't track status changes!