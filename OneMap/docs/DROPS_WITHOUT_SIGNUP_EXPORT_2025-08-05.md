# Drops Without Home Sign Up - Export Report
**Date**: 2025-08-05  
**Analysis**: Home Installations that bypassed the Home Sign Up process with drop numbers

---

## Executive Summary

From the analysis of 35,367 records in the Lawley master CSV:
- **526 Home Installations** proceeded without Home Sign Up
- **Only 21 records** have actual drop numbers (4% of the 526)
- **15 records** have both drop numbers and pole numbers
- **505 records** have neither proper drop nor pole numbers

---

## Records With Drop Numbers

Here are the 21 properties with actual drop numbers that have Home Installation status but no Home Sign Up:

| Property ID | Drop Number | Pole Number | Status | Location Address |
|-------------|-------------|-------------|--------|------------------|
| 390743 | DR1734369 | LAW.P.D626 | Home Installation: In Progress | - |
| 366205 | DR1735157 | LAW.P.E078 | Home Installation: In Progress | - |
| 369418 | DR1735338 | LAW.P.E114 | Home Installation: In Progress | - |
| 368536 | DR1735458 | LAW.P.E148 | Home Installation: In Progress | - |
| 368610 | DR1735458 | LAW.P.E149 | Home Installation: In Progress | - |
| 384085 | DR1735955 | LAW.P.D900 | Home Installation: In Progress | - |
| 362669 | DR1736834 | LAW.P.E049 | Home Installation: In Progress | - |
| 349231 | DR1750230 | LAW.P.C432 | Home Installation: In Progress | - |
| 387920 | DR1750319 | LAW.P.C455 | Home Installation: In Progress | - |
| 375336 | DR1750534 | LAW.P.C618 | Home Installation: In Progress | - |
| 377663 | DR1750693 | LAW.P.C719 | Home Installation: In Progress | - |
| 378195 | DR1750730 | LAW.P.C747 | Home Installation: In Progress | - |
| 351643 | DR1750773 | LAW.P.C821 | Home Installation: In Progress | - |
| 383477 | DR1752015 | LAW.P.D674 | Home Installation: In Progress | - |
| 381889 | DR1752015 | LAW.P.D733 | Home Installation: In Progress | - |
| 382127 | DR1752034 | LAW.P.D781 | Home Installation: In Progress | - |
| 385061 | DR1752039 | LAW.P.D858 | Home Installation: In Progress | - |
| 386043 | DR1752055 | LAW.P.D885 | Home Installation: In Progress | - |
| 385089 | DR1752057 | LAW.P.D867 | Home Installation: In Progress | - |
| 387949 | DR1752088 | LAW.P.E003 | Home Installation: In Progress | - |
| 284513 | no drop yet | - | Home Installation: In Progress | - |

---

## Key Findings

### Drop Number Patterns:
- **DR175xxxx series**: 12 drops (most common)
- **DR173xxxx series**: 7 drops
- Drop numbers appear to be sequential within series

### Pole Distribution:
- All poles with drop numbers are in LAW.P. series
- Pole ranges: C432-C821, D626-E149
- Note: Two properties (368536 & 368610) share drop number DR1735458 but have different poles

### Data Quality Issues:
- 505 records (96%) lack proper drop/pole identifiers
- Many records have dates or email addresses in drop/pole fields
- This indicates significant data capture problems in the field

---

## Files Generated

1. **Full Export**: `drops_without_signup_full_export.csv`
   - Contains all 526 records
   - Includes data quality indicators

2. **Drops Only**: `drops_with_numbers_only.csv`
   - Contains only the 21 records with real drop numbers
   - Clean format for immediate use

---

## Recommendations

1. **Immediate Action**: Audit these 21 drops to verify home owner consent
2. **Field Training**: Address why 96% of installations lack proper drop numbers
3. **System Controls**: Implement validation to require drop numbers before installation status
4. **Data Cleanup**: Investigate the 505 records without proper identifiers

---

*Analysis performed on master_csv_latest.csv processed from 38 Lawley Raw Stats files*