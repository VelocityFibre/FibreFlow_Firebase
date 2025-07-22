# OneMap Progress Report: June 3rd to June 5th, 2025

## Executive Summary

This report analyzes the progress made in the Lawley fiber installation project between June 3rd and June 5th, 2025. The analysis compares data snapshots to identify actual field progress.

### Key Findings

- **June 3rd contained complete June 3rd data** (3,487 records)
- **June 5th contained both June 3rd data AND new progress** (6,039 records total)
- **3,484 records were tracked across both dates** (99.9% overlap of June 3 data)
- **2,555 new records were added by June 5th**

## Progress Metrics

### 1. Pole Infrastructure Progress

| Metric | Count | Description |
|--------|-------|-------------|
| Total Poles Tracked | 2,454 | Unique poles with activity |
| New Poles Added | 601 | Poles that appeared only in June 5 data |
| Poles with More Records | 742 | Poles that gained additional home connections |
| Poles with New Drops | 590 | Poles where new fiber drops were installed |
| Poles with Status Progress | 689 | Poles where approval status advanced |

### 2. Home Connection Progress

| Metric | Count | Description |
|--------|-------|-------------|
| New Pole Assignments | 41 | Addresses that were assigned to poles |
| New Drop Installations | 29 | Addresses that received fiber drops |
| Status Upgrades | 52 | Addresses that progressed in approval status |

### 3. Most Active Poles (Top 5)

1. **Pole LAW.P.E291**: 0 → 5 homes connected (+5), 0 → 4 drops installed (+4)
2. **Pole LAW.P.C656**: 2 → 6 homes connected (+4), 0 → 4 drops installed (+4)
3. **Pole LAW.P.C671**: 1 → 5 homes connected (+4), 0 → 4 drops installed (+4)
4. **Pole LAW.P.C599**: 1 → 5 homes connected (+4), 0 → 4 drops installed (+4)
5. **Pole LAW.P.E255**: 0 → 4 homes connected (+4), 0 → 4 drops installed (+4)

## Progress Examples

### New Drop Installations
- 82 SHILOWA STREET → Drop DR1750573 installed on Pole LAW.P.C502
- 59 MATHE STREET → Drop DR1748591 installed on Pole LAW.P.E419
- 57 REBONE STREET → Drop DR1733546 installed on Pole LAW.P.D795

### Status Progressions
- 30 LETSATSI STREET: "Pole Permission: Approved" → "Home Sign Ups: Approved & Installation Scheduled"
- Multiple addresses progressed from "No status" → "Home Sign Ups: Approved & Installation Scheduled"

### New Pole Assignments
- SEVENTH AVENUE OPEN SPACE 364 → Assigned to pole LAW.P.A945
- 8563 LAWLEY ESTATE → Assigned to pole LAW.P.C553

## Key Insights

1. **Significant Progress in 2 Days**: 
   - 601 new poles brought into service
   - 590 poles received new fiber drop installations
   - 742 poles expanded their service capacity

2. **Active Installation Work**:
   - Field teams are actively installing drops and connecting homes
   - Status progressions show homes moving from approval to installation phase

3. **Data Quality**:
   - June 5th file properly includes all historical data plus new progress
   - Property IDs remain consistent for tracking individual addresses
   - Pole numbers are standardized (LAW.P.XXXX format)

## Recommendations

1. **Continue Daily Tracking**: The 2-day progress shows active field work that should be monitored daily
2. **Focus on High-Activity Poles**: Poles showing 4+ new connections indicate high-demand areas
3. **Monitor Installation Pipeline**: 52 status upgrades suggest installations are progressing well
4. **Validate Drop Capacity**: Ensure poles don't exceed physical drop limits (12 per pole)

## Technical Notes

- Analysis based on semicolon-delimited CSV files
- Property IDs used as primary tracking identifier
- Pole numbers follow format: LAW.P.[A-E][0-9]+
- Drop numbers follow format: DR[0-9]+

---

*Report Generated: 2025-07-22*
*Analysis Period: June 3-5, 2025*
*Total Records Analyzed: 9,526*