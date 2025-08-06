# Drop Number Analysis - Complete Investigation
**Date**: 2025-08-05  
**Analysis**: Why only 21 drops have numbers out of 526 Home Installations

---

## Executive Summary

From 526 Home Installations without Home Sign Up:
- **Only 21 records (4%)** have actual drop numbers
- **505 records (96%)** are missing drop numbers
- **Drop numbers DO exist** in source CSV files (column 18)
- **Column misalignment** during aggregation caused data loss

---

## The Export Files

Located at: `/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/`

1. **`drops_without_signup_full_export.csv`** (68KB)
   - All 526 records with quality indicators
   - Shows which records have/lack drop numbers

2. **`drops_with_numbers_only.csv`** (2.6KB)
   - Only the 21 records with real drop numbers
   - Clean format for immediate use

---

## Source Investigation Results

### Example: Property 369418
From source file `Lawley July Week 3 14072025.csv`:
- **Property ID**: 369418
- **Drop Number**: DR1735338 ✅ (exists in source)
- **Pole Number**: LAW.P.E114 ✅ (exists in source)
- **Status**: Home Installation: In Progress
- **Flow**: Home Installation: In Progress (no Sign Up)

This proves drop numbers ARE in the source files!

---

## Root Cause Analysis

### 1. Source Files Use Semicolon Delimiter
- CSV files use `;` not `,` as delimiter
- Drop Number is in column 18 (counting from 1)
- Pole Number is in column 17

### 2. Column Mapping Issues
During CSV aggregation, the drop number column was misaligned:
- Some drop numbers ended up containing dates
- Some contained email addresses  
- Only properly mapped records retained real drop numbers

### 3. Data Quality in Source
Even in source files, many records have empty drop number fields:
- Properties with "Home Installation" status but no drop assigned
- This indicates field process issues

---

## The 21 Records With Drop Numbers

All follow the pattern DRxxxxxxx and have valid pole numbers:

| Count | Drop Series | Pole Range |
|-------|-------------|------------|
| 12 | DR175xxxx | Various LAW.P. poles |
| 7 | DR173xxxx | Various LAW.P. poles |
| 2 | Other | Including duplicate DR1735458 |

### Geographic Distribution
All 21 records are in Lawley Estate:
- Streets: Ramodike, Peace, Siphiwe, Ingwenya, Molao, etc.
- All have LAW.P. series pole numbers
- Consistent with Lawley area development

---

## Why So Few Drop Numbers?

### 1. Process Flow Issue
Normal workflow should be:
```
Pole Permission → Home Sign Up → Drop Assignment → Installation
```

But these 526 properties followed:
```
Pole Permission → [Skip Sign Up] → Installation (no drop assigned?)
```

### 2. Field Data Capture
- Field agents may not be recording drop numbers
- System may allow installation status without drop assignment
- Drop numbers might be assigned later (not captured in these CSVs)

### 3. Timeline Analysis
Looking at July Week 3 data:
- Most records show recent installation activity
- Drop numbers DR173xxxx and DR175xxxx appear sequential
- Suggests drops are assigned in batches, not individually

---

## Recommendations

### Immediate Actions:
1. **Fix CSV Processing**: Update aggregation script to properly handle semicolon delimiters
2. **Re-process All Files**: Extract drop numbers from all 38 source CSVs
3. **Audit Field Process**: Why are installations proceeding without drops?

### System Improvements:
1. **Enforce Drop Assignment**: Require drop number before installation status
2. **Field Training**: Ensure agents capture drop numbers
3. **Data Validation**: Add checks for missing critical fields

### For Payment Verification:
- These 21 drops need immediate consent verification
- The 505 without drops need investigation
- Consider holding payments until drop numbers are assigned

---

## Files for Follow-up

1. **Full Export**: `drops_without_signup_full_export.csv`
   - Use for complete audit
   - Filter by "Has Real Drop" column

2. **Drops Only**: `drops_with_numbers_only.csv`
   - Ready for field verification
   - Contains addresses and pole numbers

3. **Source Files**: All in `/Lawley Raw Stats/`
   - Contain original data with proper drop numbers
   - Need re-processing with correct delimiter

---

*Analysis based on 38 Lawley Raw Stats CSV files and master_csv_latest.csv*