# Analysis: Rerunning Imports from June 26 with Status History

## Current Situation
- We've imported June 26 → July 7 using the WRONG script (no status tracking)
- Database has 23,005 records but NO status history
- We only have the latest status, not the progression

## What Happens If We Rerun?

### How the History Script Works:
1. **Checks existing record** - Looks up each Property ID
2. **Compares status** - Current CSV status vs database status
3. **Updates only if changed** - Adds to statusHistory[] array
4. **Preserves existing data** - Uses merge:true

### Expected Behavior on Rerun:

#### First Run (June 26):
```javascript
// Database currently has (from wrong script):
{
  propertyId: "12345",
  status: "Home Installation: In Progress",  // Latest status from July 7
  // NO statusHistory array
}

// June 26 CSV has:
Status: "Pole Permission: Approved"

// Result after rerun:
{
  propertyId: "12345",
  currentStatus: "Pole Permission: Approved",  // Will DOWNGRADE
  statusHistory: [
    {
      date: "2025-06-26",
      status: "Pole Permission: Approved",
      // ... import metadata
    }
  ]
}
```

### THE PROBLEM: Status Will Go Backwards!

Since we imported July data first (with later statuses), rerunning June will:
1. **Downgrade statuses** - Properties that progressed June→July will revert
2. **Create false history** - Status changes will be recorded in wrong order
3. **Lose current state** - July progress will be overwritten

## Effort Required: SIGNIFICANT

### Option 1: Full Reset & Chronological Reimport (RECOMMENDED)
**Effort: 2-3 hours**
1. Delete all records from June 26 onwards
2. Reimport chronologically: June 26, 27, 30, July 1, 2, 3, 7
3. Each import will properly track status progressions

**Benefits:**
- Accurate status history
- Correct progression tracking
- Proper audit trail

### Option 2: Complex Reprocessing (NOT RECOMMENDED)
**Effort: 8-10 hours + high risk**
1. Export current data
2. Write custom script to reconstruct history
3. Parse all CSVs to build timeline
4. Manually reconstruct statusHistory arrays
5. Very error-prone

### Option 3: Accept Current State (PRAGMATIC)
**Effort: 0 hours**
1. Keep current data as-is
2. Start tracking history from July 8 forward
3. Document that pre-July 8 has no history

## My Recommendation:

**Option 1 - Full Reset** is the best approach if you need accurate historical tracking.

To execute:
```bash
# 1. Delete June 26+ records (need to write this script)
node scripts/delete-records-after-date.js "2025-06-26"

# 2. Reimport in order with history tracking
node scripts/import-onemap.js "Lawley June Week 4 26062025.csv"
node scripts/import-onemap.js "Lawley June Week 4 27062025.csv"
node scripts/import-onemap.js "Lawley June Week 4 30062025.csv"
node scripts/import-onemap.js "Lawley July Week 1 01072025.csv"
node scripts/import-onemap.js "Lawley July Week 1 02072025.csv"
node scripts/import-onemap.js "Lawley July Week 1 03072025.csv"
node scripts/import-onemap.js "Lawley July Week 2 07072025.csv"
```

## Decision Needed:
1. **Full Reset** - 2-3 hours, perfect data
2. **Keep As-Is** - 0 hours, no historical tracking before July 8
3. **Hybrid** - Keep current, add note that history starts July 8

What would you like to do?