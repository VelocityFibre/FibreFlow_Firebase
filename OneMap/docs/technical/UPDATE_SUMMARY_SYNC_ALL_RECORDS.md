# Sync Script Updated - Now Includes ALL Records

**Date**: 2025-07-21  
**Script**: `sync-to-production.js`

## Changes Made

### ✅ Records WITHOUT Pole Numbers Are Now Included

**Before**: Script skipped records without pole numbers (244 records ignored)

**After**: Script now syncs ALL records:
- Records WITH poles → Normal sync with actual pole number
- Records WITHOUT poles → Synced with `poleNumber: "PENDING_ASSIGNMENT"`

### Key Updates

1. **Removed Skip Logic**
   - Removed the `return null` when no pole number
   - Instead assigns "PENDING_ASSIGNMENT" as placeholder

2. **Added Tracking Flags**
   ```javascript
   requiresPoleAssignment: true
   assignmentPriority: 'HIGH' // for approved properties
   ```

3. **Enhanced Reporting**
   - Shows count of records without poles
   - Indicates they're marked as PENDING_ASSIGNMENT

4. **Fixed Project ID Mapping**
   - Now uses simple project codes (Law-001, MO-001)
   - Defaults to Law-001 for records without poles

## How to Use

### For Future Imports

Just run ONE command - it syncs everything:
```bash
# Dry run first (recommended)
node sync-to-production.js --dry-run

# Then sync for real
node sync-to-production.js
```

### What Happens

1. **Records WITH pole numbers**:
   - Go to appropriate collection (planned-poles or pole-trackers)
   - Keep their actual pole number

2. **Records WITHOUT pole numbers**:
   - Always go to planned-poles collection
   - Get `poleNumber: "PENDING_ASSIGNMENT"`
   - Flagged with `requiresPoleAssignment: true`
   - Ready for field teams to assign actual poles

## Benefits

- ✅ No more missing records
- ✅ Single command syncs everything
- ✅ Field teams can find properties needing poles
- ✅ Complete data integrity maintained
- ✅ Full audit trail for all properties

## Testing

Test with a dry run:
```bash
node sync-to-production.js --dry-run --limit=10
```

This will show what would happen without making changes.

---

**Status**: ✅ Script Updated and Ready for Use