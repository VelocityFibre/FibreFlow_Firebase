# Memory Fix Plan - 2025-08-05

## The Problem (As We Identified)
- Original script loads ALL records into memory array
- Memory pollution between runs
- Creates phantom status changes
- Script works perfectly EXCEPT for memory issue

## The ONLY Change Needed
Change from:
```javascript
// OLD: Load everything first
const records = [];
// Parse entire CSV into array
// Then process all at once
```

To:
```javascript  
// NEW: Process line by line
csvStream.on('data', (row) => {
  // Process ONE row
  // Compare with database
  // Update immediately
  // Memory clears after each row
});
```

## What MUST Stay the Same
1. ✅ Status history tracking logic
2. ✅ Property ID as unique key
3. ✅ Change detection before update
4. ✅ Import batch tracking
5. ✅ All the working logic from weeks of refinement

## Simple Step-by-Step Plan

### Step 1: Take the original working script
- `ARCHIVED_bulk-import-with-history_DO-NOT-USE_2025-08-05.js`
- This has all the correct logic

### Step 2: Change ONLY the memory handling
- Keep all status tracking logic
- Keep all field mappings
- Keep all validation
- Just change HOW we read the CSV

### Step 3: Test with same properties
- Property 308025, 291411, etc.
- Should show REAL status changes only
- No phantom changes

## Expected Results
- June 20: No status changes (most stayed same)
- June 22: Real status changes only
- No backwards progressions
- No memory pollution

## Files to Import (in order)
1. May files (baseline)
2. June files (where issues occurred)
3. July files (latest data)

**CRITICAL**: Use the SAME import logic, just fix the memory issue!