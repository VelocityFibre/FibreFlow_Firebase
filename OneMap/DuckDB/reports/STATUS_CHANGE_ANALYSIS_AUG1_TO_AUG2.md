# Status Change Analysis: August 1 to August 2
**Date**: 2025-08-06  
**System**: DuckDB Analytics  
**Files Analyzed**: 
- August 1: `1754473447790_Lawley_01082025.xlsx` (13,656 records)
- August 2: `1754473537620_Lawley_02082025.xlsx` (13,764 records)

## Executive Summary

The analysis successfully identified **11 status changes** between August 1 and August 2, contradicting the SQLite system's report of 0 changes. This represents a critical finding for payment verification and workflow tracking.

## Key Findings

### 1. Overall Statistics
- **Total Records August 1**: 13,656
- **Total Records August 2**: 13,764 
- **New Properties Added**: 108
- **Status Changes Detected**: 11
- **Change Rate**: 0.08% (11 out of 13,656 existing properties)

### 2. Status Change Breakdown

| Change Type | Count | Percentage |
|------------|-------|------------|
| Approved & Scheduled → In Progress | 8 | 72.7% |
| Declined → In Progress | 2 | 18.2% |
| Installed → In Progress | 1 | 9.1% |

### 3. Critical Anomalies Detected

#### 🔴 Status Reversal (1 case)
- **Property 342119**: Changed from "Home Installation: Installed" to "Home Installation: In Progress"
- **Location**: 52 AWELANI STREET LAWLEY ESTATE
- **Concern**: Installation marked as complete, then reverted to in-progress

#### 🟡 Skipped Approval Process (2 cases)
- **Property 322771**: "Home Sign Ups: Declined" → "Home Installation: In Progress"
  - Agent: katlego
  - Missing pole number
  
- **Property 370975**: "Home Sign Ups: Declined" → "Home Installation: In Progress"
  - Agent: langa
  - Missing pole number

**Concern**: Properties that were declined for sign-up somehow progressed to installation without approval.

### 4. Normal Progressions (8 cases)

The majority of changes (72.7%) followed the expected workflow:
- Home Sign Ups: Approved & Installation Scheduled → Home Installation: In Progress

Examples:
- Property 294774 (Agent: Sylvia, Pole: LAW.P.C514)
- Property 296170 (Agent: Pearl, Pole: LAW.P.C622)
- Property 321985 (Agent: Zanele, Pole: LAW.P.C664)

### 5. Agent Activity

Active agents making status changes:
- Sylvia
- Pearl
- Zanele
- katlego (anomaly case)
- tint(fibertime) (status reversal case)
- langa (anomaly case)
- Pearl Molisa
- Dikgahlo Lesitha
- Tshepiso Mokwatsi
- itumeleng

## Why SQLite Reported 0 Changes

The discrepancy between DuckDB finding 11 changes and SQLite reporting 0 could be due to:
1. **Different comparison logic** - SQLite may be using different join conditions
2. **Duplicate handling** - If August 1 had duplicates, SQLite might compare wrong records
3. **Data type issues** - Property ID comparison might fail due to type mismatches
4. **Import errors** - SQLite might not have imported all records correctly

## Recommendations

### Immediate Actions
1. **Investigate anomalies**:
   - Contact field teams about the 3 anomalous properties
   - Verify if installations actually proceeded on declined properties
   - Check why property 342119 regressed from Installed to In Progress

2. **Payment verification**:
   - Hold payments for properties 322771 and 370975 (skipped approvals)
   - Verify completion status of property 342119 before payment

3. **Data quality**:
   - Implement validation to prevent status reversals
   - Add approval checks before allowing installation status

### System Improvements
1. **Automated anomaly detection** for all future imports
2. **Daily status change reports** for management review
3. **Agent training** on proper status progression
4. **Validation rules** to prevent impossible status transitions

## Technical Details

### Query Used
```sql
WITH aug1_latest AS (
    SELECT DISTINCT ON ("Property ID") *
    FROM aug1_import
    ORDER BY "Property ID", "date_status_changed" DESC
),
aug2_latest AS (
    SELECT DISTINCT ON ("Property ID") *
    FROM aug2_import
    ORDER BY "Property ID", "date_status_changed" DESC
)
SELECT * FROM aug2_latest a2
JOIN aug1_latest a1 ON a2."Property ID" = a1."Property ID"
WHERE a1."Status" != a2."Status"
```

### Export Location
Detailed change log with all fields exported to:
`/home/ldp/VF/Apps/FibreFlow/OneMap/DuckDB/reports/status_changes_aug1_to_aug2.csv`

## Conclusion

The DuckDB analysis successfully identified 11 status changes that the SQLite system missed. More importantly, it revealed 3 concerning anomalies that require immediate investigation before processing payments. The ability to track these changes is critical for maintaining data integrity and preventing fraudulent claims.