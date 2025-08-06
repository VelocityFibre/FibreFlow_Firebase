# 🎯 WHICH IMPORT SCRIPT TO USE

**Created: 2025-08-05**

## ✅ USE THIS SCRIPT:

```bash
node bulk-import-fixed-2025-08-05.js "filename.csv"
```

**Status**: ✅ PRODUCTION READY - Fixes all data integrity issues

## ❌ DO NOT USE THESE SCRIPTS:

- ❌ `ARCHIVED_bulk-import-with-history_DO-NOT-USE_2025-08-05.js` (archived)
- ❌ `bulk-import-history-fast.js` (has merge: true bug)
- ❌ Any script with "merge: true" in the code

## Why We Changed (2025-08-05):

### Problem Found:
- Old scripts created **phantom status changes** that never happened
- Memory overload from loading 30MB+ files caused data corruption
- `merge: true` mixed old corrupted data with new clean data

### Properties Verified as Corrupted:
- Property 308025: 7 fake changes recorded, only 2 real changes in CSV
- Property 291411: Same pattern - phantom backwards status progression
- Property 292578: Same pattern - false status flipping
- Property 307935: Same pattern - non-existent status changes
- Property 308220: Same pattern - systemic data corruption

### Fix Implemented:
1. ✅ **No merge: true** - Complete document replacement prevents data mixing
2. ✅ **Line-by-line processing** - No memory overload, no corruption
3. ✅ **Explicit field mapping** - Every field set from CSV source only
4. ✅ **Smaller batches** - More reliable processing

## Testing Before Production:

```bash
# Test on a small file first
node bulk-import-fixed-2025-08-05.js "small-test-file.csv"

# Check results before proceeding with large files
```

## Emergency Rollback:

If issues occur, the old script is available as:
`ARCHIVED_bulk-import-with-history_DO-NOT-USE_2025-08-05.js`

But **DO NOT USE** unless directed - it has the phantom change bug!