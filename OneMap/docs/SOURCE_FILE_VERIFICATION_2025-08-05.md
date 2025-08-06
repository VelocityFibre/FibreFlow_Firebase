# Source File Verification - Drop Numbers
**Date**: 2025-08-05  
**Purpose**: Verify that empty drop fields exist in source CSV files

---

## Verification Results

**CONFIRMED**: The 425 empty drop fields are indeed **missing from the source CSV files themselves**.

---

## Detailed Analysis

### Sample File: Lawley July Week 3 17072025.csv
- **Total Home Installations without Sign Up**: 506
- **With Drop Numbers (DRxxxxxxx)**: 67 (13.2%)
- **Empty Drop Fields**: 438 (86.6%)
- **"no drop allocated"**: 1 (0.2%)

### Evidence from Source
Looking directly at the semicolon-delimited source file:
```
Property;Status;Flow;Drop Number (Column 18)
353314;Home Installation: In Progress;Home Installation: In Progress;[EMPTY]
368813;Home Installation: In Progress;Home Installation: In Progress;[EMPTY]
344703;Home Installation: In Progress;Home Installation: In Progress;[EMPTY]
300537;Home Installation: In Progress;Pole Permission: Approved...;DR1752451
299588;Home Installation: In Progress;Pole Permission: Approved...;DR1752490
345415;Home Installation: In Progress;Home Installation: In Progress;DR1751588
```

### Pattern Across All Files
Checking multiple source files shows:
- July Week 1-2: Almost ALL have empty drop fields
- July Week 3: Mix of empty and filled (mostly empty)
- June files: Very few Home Installations without Sign Up

---

## Key Findings

1. **This is a SOURCE DATA issue**, not a processing error
2. **Field agents are setting status** to "Home Installation: In Progress"
3. **But NOT recording drop numbers** at the same time
4. **Drop assignment appears to happen AFTER** installation status is set

---

## Implications

### For Data Quality:
- 86.6% of installations proceeding without drop numbers
- No way to track which drop cable was used
- Payment verification becomes difficult

### For Field Process:
- Workflow is not being followed correctly
- Drop numbers should be assigned BEFORE installation
- Field training needed on proper data capture

### For System Design:
- System allows installation status without drop number
- No validation to enforce drop number requirement
- Process gap needs to be addressed

---

## Conclusion

The missing drop numbers are **definitively in the source files**. This is a field data capture issue where installations are being marked as "In Progress" or "Installed" without recording the associated drop number. The CSV processing is working correctly - the data simply isn't there to process.

---

*Verification performed on raw CSV files in /OneMap/downloads/Lawley Raw Stats/*