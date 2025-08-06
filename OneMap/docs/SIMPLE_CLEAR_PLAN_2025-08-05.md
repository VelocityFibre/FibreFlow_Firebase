# Simple Clear Plan - What We're Actually Doing

## Current Situation
1. We identified phantom status changes in the database
2. Root cause: Memory pollution from loading entire CSV files
3. We cleared the corrupted data
4. Now need to reimport cleanly

## What the Original Script Did RIGHT
- Tracked status changes in statusHistory array
- Used Property ID as unique key
- Detected changes before updating
- Created import batches
- Everything worked EXCEPT memory issue

## The SIMPLE Fix
Instead of trying to use the complex stream processing with async issues, let's:

1. **Use the existing working script** but process in smaller chunks
2. **Import smaller batches** to avoid memory issues
3. **Clear memory between batches**

## Step-by-Step Import Plan

### 1. Start with May files (small, ~700 records each)
- These are baseline data
- Should create initial status entries
- No status changes expected between May files

### 2. Move to June files (this is where we check)
- June 13: Initial statuses recorded
- June 20: Should see NO phantom changes
- June 22: Should see REAL status changes only

### 3. Complete with July files
- Continue pattern
- Only real changes recorded

## Testing Checkpoints
After each day's import, check:
- Total records in database
- Status changes recorded
- Verify against CSV for accuracy

## Success Criteria
✅ No backwards status progressions
✅ Status changes match what's in CSV files
✅ Properties 308025, 291411, etc. show correct history
✅ No phantom changes on June 20

## Which Script to Use?
Let's go back to basics and use a simple approach that we know works.