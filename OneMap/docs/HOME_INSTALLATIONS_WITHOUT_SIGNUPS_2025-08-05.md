# Home Installations Without Sign Ups - Lawley Analysis
**Date**: 2025-08-05  
**Analysis**: Home Installations that bypassed the Home Sign Up process

---

## Summary

Found **528 Home Installations** (39% of total) that went directly from Pole Permission to Home Installation without going through the Home Sign Up process.

### Statistics:
- **Total Home Installations**: 1,365 (In Progress or Installed)
- **Without Home Sign Up**: 528 properties
- **Percentage**: 38.7%

---

## Workflow Patterns Identified

### 1. Direct Installation (Most Common)
**Pattern**: Pole Permission: Approved → Home Installation: In Progress
- **Count**: ~500+ cases
- **Example**: Property 245557, 242879, 243670, etc.
- **Issue**: Skipped the entire Home Sign Up process

### 2. Installation Started Without Any Prior Status
**Pattern**: Blank → Home Installation: In Progress
- **Count**: Several cases
- **Example**: Property 264514, 242951
- **Issue**: No prior approval or sign up recorded

### 3. Installation Completed Without Sign Up
**Pattern**: Pole Permission: Approved → Home Installation: Installed
- **Count**: Multiple cases
- **Example**: Property 259310, 275517
- **Issue**: Completed installation without resident consent process

---

## Examples of Problematic Records

| Property ID | Current Status | Workflow History | Notes |
|-------------|----------------|------------------|-------|
| 245557 | Home Installation: In Progress | Pole Permission: Approved | No sign up |
| 242879 | Home Installation: In Progress | Pole Permission: Approved | No sign up |
| 260018 | Home Installation: Installed | Home Installation: Installed | Started at installation |
| 259310 | Home Installation: Installed | Pole Permission: Approved | Completed without sign up |
| 264514 | Home Installation: In Progress | Home Installation: In Progress | No prior status |

---

## Concerns

1. **Consent Issues**: 528 properties had installations without recorded home owner sign-up/consent
2. **Process Violation**: Standard workflow should be:
   - Pole Permission → Home Sign Up → Installation Scheduled → Installation
3. **Data Quality**: Some records show installation as first and only status

---

## Recommendations

1. **Audit These Properties**: Verify if home sign-ups were done but not recorded
2. **Process Review**: Ensure field teams follow proper workflow
3. **System Controls**: Consider preventing installation status without prior sign-up
4. **Retroactive Consent**: May need to obtain consent documentation for these 528 properties

---

## Query Used

```sql
-- Find Home Installations without Home Sign Up in workflow
SELECT Property_ID, Status, Flow_Name_Groups
FROM master_csv
WHERE Status LIKE 'Home Installation:%'
AND Flow_Name_Groups NOT LIKE '%Home Sign Up%'
```

---

*Analysis based on master_csv_latest.csv with 35,367 records from Lawley Raw Stats*