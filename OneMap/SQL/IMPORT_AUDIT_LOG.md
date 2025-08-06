# OneMap SQL Import Audit Log

## Overview
This file tracks all Excel imports into the SQL analytics system with key statistics.

---

## Import History

### 2025-08-06 - Lawley August 2025 Data
- **Date Processed**: 2025-08-06 10:14:43
- **Filename**: `1754473447790_Lawley_01082025.xlsx`
- **File Size**: 8.2 MB (8,243,086 bytes)
- **Source**: Firebase Storage (`csv-uploads/` folder)
- **Import Status**: ✅ Success

#### Statistics:
- **Total Records Imported**: 13,656
- **Unique Poles**: 3,800
- **Unique Drops**: 7,828
- **Unique Agents**: 0 (no agent data in this import)
- **Processing Time**: < 30 seconds
- **Errors**: 0
- **Duplicates**: 0

#### Data Quality Notes:
- File contains 166 columns (many unmapped)
- Key mapped fields: property_id, pole_number, drop_number, status, location_lat, location_lng
- Date field not properly mapped (need to map 'date_status_changed' field)
- Agent field not mapped (need to map 'Field Agent Name' fields)

#### Status Distribution:
1. Home Sign Ups: Approved & Installation Scheduled - 5,850 records
2. Pole Permission: Approved - 5,168 records
3. Home Installation: In Progress - 1,546 records
4. Home Sign Ups: Declined - 457 records
5. (Blank status) - 244 records

#### Column Mapping Issues to Fix:
- `date_status_changed` → should map to `status_date`
- `Field Agent Name (pole permission)` → should map to `agent`
- `lst_mod_dt` → could be alternative date field
- Many location and survey fields unmapped

---

## Summary Statistics

### Cumulative Totals (All Imports)
- **Total Imports**: 1
- **Total Records**: 13,656
- **Date Range**: Single import (2025-08-06)

### Data Coverage
- **Projects**: Lawley
- **Time Period**: August 2025
- **Geographic Area**: Based on lat/long fields present

---

## Notes for Future Imports

1. **Column Mapping**: Update `excel-importer.js` to properly map date and agent fields
2. **Data Validation**: Many records have blank status (244) - investigate
3. **Performance**: Import handled 13,656 records efficiently
4. **Storage**: Database file size after import: ~15MB

---

## Audit Trail

| Date | Action | User | Details |
|------|--------|------|---------|
| 2025-08-06 10:14:43 | Import | System | Initial import of Lawley August 2025 data |
| 2025-08-06 10:16:00 | Audit | System | Created audit log file |
| 2025-08-06 12:40:47 | Import | System | Second import with status tracking - August 2 data |

---

### 2025-08-06 - Lawley August 2 Data (Second Import)
- **Date Processed**: 2025-08-06 12:40:47
- **Filename**: `1754473537620_Lawley_02082025.xlsx`
- **Source**: Downloads folder
- **Import Status**: ✅ Success with Status Tracking

#### Statistics:
- **Total Records in File**: 13,764
- **New Records Imported**: 122
- **Duplicates Skipped**: 13,642
- **New Properties Added**: 108
- **Status Changes Detected**: 11

#### Status Change Analysis:
- **Normal Progression**: 8 (properties moving forward in workflow)
- **Status Reverts**: 1 ⚠️
  - Property 342119: "Home Installation: Installed" → "Home Installation: In Progress"
- **Bypassed Approvals**: 2 ⚠️
  - Property 322771: "Home Sign Ups: Declined" → "Home Installation: In Progress"
  - Property 370975: "Home Sign Ups: Declined" → "Home Installation: In Progress"

#### Critical Findings:
1. **Data Integrity Concern**: One property (342119) shows a completed installation reverting to "in progress"
2. **Process Violation**: Two properties (322771, 370975) show installations proceeding despite declined sign-ups
3. **Low Change Volume**: Only 11 status changes in 24 hours may indicate:
   - Weekend/holiday with reduced activity
   - Data collection gaps
   - System synchronization delays

#### Anomaly Detection Results:
- Anomaly tracking system successfully identified all concerning patterns
- Generated detailed report: `status_changes_aug1_to_aug2_2025-08-06.csv`
- All anomalies logged in `status_anomalies` table for follow-up

---

## Updated Summary Statistics

### Cumulative Totals (All Imports)
- **Total Imports**: 2
- **Total Unique Records**: 13,764
- **Total Status Changes Tracked**: 11
- **Total Anomalies Detected**: 3
- **Date Range**: April 24 - August 2, 2025

---

*Last Updated: 2025-08-06*
### 2025-08-06 - 1754473817260_Lawley_04082025.xlsx
- Total Records: 639
- New Properties: 0
- Status Changes: 0
- Status Reverts: 0
- Duplicates Skipped: 0

### 2025-08-06 - Data Merging Fix Applied
- **Action**: Consolidated fragmented import batches
- **Status Changes Found**: 0
- **Status Reverts**: 0
- **New Properties**: 0
- **Comparison with DuckDB**: DISCREPANCY

### 2025-08-06 - Comprehensive Status Analysis (August 3 → August 4)
- **Files Processed**: August 1-5 (complete dataset)
- **Total Database Records**: 29065
- **Status Changes Found**: 0
- **Backwards Progressions**: 0
- **New Properties**: 0
- **New Installations**: 0
- **DuckDB Comparison**: Status Changes DIFFER, Reverts DIFFER
