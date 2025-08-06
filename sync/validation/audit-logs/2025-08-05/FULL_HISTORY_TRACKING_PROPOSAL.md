# Full Status History Tracking Proposal
**Date**: 2025-08-05  
**Purpose**: Implement complete status history tracking in master CSV

---

## Current Approach vs Proposed Approach

### Current: Last-Write-Wins
- One record per Property ID
- Only latest status kept
- Previous states overwritten
- Update count tracked but history lost

### Proposed: Full History Preservation
- Multiple records per Property ID (one for each update)
- ALL status changes preserved
- Complete audit trail maintained
- Each record uniquely identified

---

## Implementation Details

### Key Changes

1. **No More Overwrites**
   ```javascript
   // OLD: Overwrites existing record
   Object.assign(existingRecord, normalizedRecord);
   
   // NEW: Adds new record for each update
   allRecords.push(normalizedRecord);
   ```

2. **New Tracking Fields**
   - `_record_id`: Unique identifier for each record
   - `_source_date`: When this record was captured
   - `_source_file`: Which CSV file it came from
   - `_is_status_change`: Whether status changed from previous
   - `_previous_status`: What the status was before
   - `_status_change_date`: When status changed

3. **Status Change Detection**
   - Tracks last known status per Property ID
   - Compares with new status
   - Marks changes explicitly

---

## Benefits

### 1. Complete Audit Trail
- See full progression: "Requested → Approved → Scheduled → Installed"
- Track when each change occurred
- Identify who made changes (from agent fields)

### 2. Better Analytics
- Count status changes over time
- Measure time between states
- Identify bottlenecks in workflow

### 3. Data Integrity
- No data loss ever
- Can reconstruct state at any point in time
- Perfect for compliance/auditing

### 4. Simple & Foolproof
- No complex logic needed
- Just append records
- Easy to understand and maintain

---

## Example Output

For a property that went through multiple status changes:

```
Property ID | Status | _record_id | _source_date | _is_status_change | _previous_status
------------|--------|------------|--------------|-------------------|------------------
123456 | Pole Permission: Requested | 1 | 2025-05-22 | false | 
123456 | Pole Permission: Approved | 2 | 2025-06-15 | true | Pole Permission: Requested
123456 | Home Sign Ups: Scheduled | 3 | 2025-07-01 | true | Pole Permission: Approved
123456 | Home Installation: Installed | 4 | 2025-07-18 | true | Home Sign Ups: Scheduled
```

---

## Trade-offs

### File Size
- **Current approach**: ~35,000 records (35MB)
- **Full history**: Could be 50,000-100,000 records (50-100MB)
- **Impact**: Still manageable, opens in Excel/CSV viewers

### Processing Time
- **Current**: ~30 seconds
- **Full history**: ~45 seconds (minimal increase)

### Complexity
- **Current**: Medium (update logic, comparison)
- **Full history**: Simple (just append)

---

## Usage

### Generate Full History CSV
```bash
cd OneMap/GraphAnalysis
./CREATE_MASTER_CSV_WITH_HISTORY.sh
```

### Query Examples
```sql
-- Get current status (latest record per property)
SELECT * FROM csv WHERE _record_id IN (
  SELECT MAX(_record_id) FROM csv GROUP BY property_id
)

-- Get all status changes for a property
SELECT * FROM csv WHERE property_id = '123456' ORDER BY _record_id

-- Count status changes
SELECT COUNT(*) FROM csv WHERE _is_status_change = 'true'
```

---

## Recommendation

✅ **Implement Full History Tracking**

**Reasons**:
1. Simple to implement (code already created)
2. No data loss - critical for auditing
3. Minimal performance impact
4. Enables powerful analytics
5. Can always generate "latest only" view when needed

The full history approach is more valuable for validation and analysis, while being simpler to implement and maintain.