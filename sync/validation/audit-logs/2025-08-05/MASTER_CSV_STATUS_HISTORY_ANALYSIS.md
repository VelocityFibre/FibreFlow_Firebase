# Master CSV Status History Analysis
**Date**: 2025-08-05  
**Purpose**: Analyze how the master CSV handles status history and validate aggregation

---

## Key Findings

### 1. Status History Handling
The master CSV does **NOT** maintain full status history. Instead, it uses a **last-write-wins** approach:

- Each Property ID appears only once in the master CSV
- Only the **latest status** is kept when a property is updated
- The system tracks:
  - `_first_seen_date`: When the property first appeared
  - `_first_seen_file`: Which CSV file it first appeared in
  - `_last_updated_date`: When it was last updated
  - `_last_updated_file`: Which CSV file contained the last update
  - `_update_count`: How many times it was updated

### 2. Multiple Records for Same Pole
When a pole appears at multiple addresses (like LAW.P.D721), the master CSV keeps **ALL records** because they have different Property IDs:

**Example: LAW.P.D721 (8 records)**
- Different addresses: MOKOENA STREET, 7657 LAWLEY ESTATE, 13 MOTLOTLO STREET, etc.
- Different statuses: "Home Sign Ups: Declined", "Pole Permission: Approved", etc.
- All marked as updated on 2025-07-17 with update count of 2

This indicates each property/address combination is tracked separately, even if they reference the same pole.

### 3. Spot Check Validation

**Test 1: LAW.P.C463 (July 1st)**
- ✅ Master CSV shows: "Home Sign Ups: Approved & Installation Scheduled"
- ✅ Source file verification: Found 5 times in Lawley July Week 1 01072025.csv
- ✅ Last updated date matches source file date

**Test 2: LAW.P.E441 (June 23rd)**
- ✅ Master CSV shows: "Home Sign Ups: Approved & Installation Scheduled"
- ✅ Source file verification: Found 3 times in Lawley June Week 4 23062025.csv
- ✅ Tracking metadata correctly points to source file

### 4. Data Aggregation Method

The aggregation process:
1. Processes CSV files chronologically (May 22 → July 18)
2. For each Property ID:
   - First occurrence: Creates new record with all fields
   - Subsequent occurrences: Updates existing record, overwrites all fields
   - Increments `_update_count`
   - Updates `_last_updated_date` and `_last_updated_file`

### 5. Limitations

1. **No Status History Chain**: Cannot see progression like "Approved → Scheduled → Installed"
2. **Lost Intermediate States**: Only final status is preserved
3. **No Timestamp Granularity**: Only tracks date, not time of changes
4. **Property-Centric, Not Pole-Centric**: Same pole at different addresses creates multiple records

---

## Validation Results

### Aggregation Accuracy
- ✅ Records correctly mapped to source files
- ✅ Update tracking metadata properly maintained
- ✅ Pole numbers now in correct column (fixed from previous version)
- ✅ All spot checks verified against source files

### Data Integrity
- Total Records: 35,367
- Files Processed: 38 (May 22 - July 18, 2025)
- Records with multiple updates: Thousands (indicated by _update_count > 1)
- Column alignment: Fixed and verified

---

## Recommendations

1. **For Status History Tracking**: 
   - The master CSV is suitable for current state validation
   - Not suitable for historical status progression analysis
   - Use change logs (in `data/change-logs/`) for detailed history

2. **For Pole Analysis**:
   - Be aware that one pole may have multiple records (different properties)
   - Group by pole number when analyzing pole-level data
   - Consider Property ID + Pole Number as composite key

3. **For Validation Use**:
   - Master CSV accurately represents the latest state of each property
   - Suitable for checking current status against staging database
   - Use `_update_count` to identify frequently changing records

---

## Conclusion

The master CSV aggregation is working correctly as a **snapshot system** that maintains the latest state of each property with basic tracking metadata. While it doesn't preserve full status history, it accurately reflects the most recent data from the source files and is suitable for validation against the staging database.