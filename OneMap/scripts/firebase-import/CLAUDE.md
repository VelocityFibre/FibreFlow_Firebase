# Firebase Import Scripts

## Purpose
Import CSV data into Firebase database (vf-onemap-data). These scripts handle the CSV → Firebase workflow.

## Workflow
```
CSV File → Parse → Validate → Import to Firebase → Generate Summary
```

## PRIMARY SCRIPT TO USE
**`bulk-import-with-history.js`** - Enhanced import with status tracking
- Tracks status history changes
- Generates import summary
- Updates processing log
- Shows new vs updated records

## Scripts in this directory

### Active Import Scripts
- `bulk-import-with-history.js` ⭐ **USE THIS ONE** - Full featured import
- `bulk-import-onemap.js` - Basic import (no reporting)
- `bulk-import-history-fast.js` - Fast version for large files

### Sync Scripts
- `sync-to-production.js` - Sync vf-onemap-data to FibreFlow production
- `batch-sync-to-production.js` - Batch sync for large datasets

### Usage
```bash
# Standard import with full reporting
node bulk-import-with-history.js "downloads/Lawley June Week 4 23062025.csv"

# After import, sync to production
node sync-to-production.js --batch-id IMP_123456789
```

## Import Features
- Deduplication by Property ID
- Status history tracking
- Import batch tracking
- New vs updated record counts
- Automatic report generation
- CSV_PROCESSING_LOG.md updates

## Cross-Reference Check
After import, always verify against CSV master file:
1. Import creates records in Firebase
2. Generate report to verify counts
3. Compare with original CSV for accuracy