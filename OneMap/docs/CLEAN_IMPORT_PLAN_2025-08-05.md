# 🚀 Clean Import Plan - 2025-08-05

## Overview
- **Total Files**: 36 CSV files
- **Total Records**: 215,934 (cumulative)
- **Unique Properties**: ~10,000-15,000
- **Date Range**: May 22 - July 18, 2025

## ✅ YES - We Test Correctness As We Go!

### Testing Checkpoints:
1. **After May imports** - Baseline check
2. **After June 13** - Initial statuses  
3. **After June 20** - CRITICAL: Check for phantom changes
4. **After June 22** - Verify real changes only
5. **After each month** - Progress validation

## Phase 1: May 2025 Imports & Testing

### Import Commands:
```bash
cd /home/ldp/VF/Apps/FibreFlow/OneMap/scripts/firebase-import

# May imports
node bulk-import-fixed-2025-08-05.js "Lawley May Week 3 22052025 - First Report.csv"  # 746 records
node bulk-import-fixed-2025-08-05.js "Lawley May Week 3 23052025.csv"                # 745 records
node bulk-import-fixed-2025-08-05.js "Lawley May Week 4 26052025.csv"                # 746 records
node bulk-import-fixed-2025-08-05.js "Lawley May Week 4 27052025.csv"                # 746 records
node bulk-import-fixed-2025-08-05.js "Lawley May Week 4 29052025.csv"                # 1,066 records
node bulk-import-fixed-2025-08-05.js "Lawley May Week 4 30052025.csv"                # 1,476 records
```

### Test After May:
```bash
cd ../
node check-specific-properties.js      # Should show minimal/no status changes
node monitor-clear-progress.js         # Check record counts
```

## Phase 2: June 2025 Imports & Critical Testing

### Import Through June 13:
```bash
# Import up to June 13 (where issues started)
node bulk-import-fixed-2025-08-05.js "Lawley June Week 1 02062025.csv"    # 2,644
node bulk-import-fixed-2025-08-05.js "Lawley June Week 1 03062025.csv"    # 3,357
node bulk-import-fixed-2025-08-05.js "Lawley June  Week 1 05062025.csv"   # 4,751
node bulk-import-fixed-2025-08-05.js "Lawley June Week 1 06062025.csv"    # 4,751
node bulk-import-fixed-2025-08-05.js "Lawley June Week 2 09062025.csv"    # 4,895
node bulk-import-fixed-2025-08-05.js "Lawley June Week 2 10062025.csv"    # 5,047
node bulk-import-fixed-2025-08-05.js "Lawley June Week 2 11062025.csv"    # 5,448
node bulk-import-fixed-2025-08-05.js "Lawley June Week 2 12062025.csv"    # 5,691
node bulk-import-fixed-2025-08-05.js "Lawley June Week 2 13062025.csv"    # 5,827
```

### 🔍 TEST CHECKPOINT 1 - After June 13:
```bash
cd ../
node check-specific-properties.js
# Expected: Properties should show initial statuses
```

### Critical June 20-22 Imports:
```bash
# Continue with critical dates
node bulk-import-fixed-2025-08-05.js "Lawley June Week 3 16062025.csv"    # 5,827
node bulk-import-fixed-2025-08-05.js "Lawley June Week 3 17062025.csv"    # 5,827
node bulk-import-fixed-2025-08-05.js "Lawley June Week 3 18062025.csv"    # 5,944
node bulk-import-fixed-2025-08-05.js "Lawley June Week 3 19062025.csv"    # 5,951
node bulk-import-fixed-2025-08-05.js "Lawley June Week 3 20062025.csv"    # 6,041 ⚠️
```

### 🔍 TEST CHECKPOINT 2 - After June 20 (CRITICAL!):
```bash
cd ../
node check-specific-properties.js
node validate-import-accuracy-2025-08-05.js
# Expected: NO phantom backwards changes!
```

### Continue June:
```bash
node bulk-import-fixed-2025-08-05.js "Lawley June Week 3 22062025.csv"    # 6,448
node bulk-import-fixed-2025-08-05.js "Lawley June Week 4 23062025.csv"    # 6,785
node bulk-import-fixed-2025-08-05.js "Lawley June Week 4 26062025.csv"    # 7,971
node bulk-import-fixed-2025-08-05.js "Lawley June Week 4 27062025.csv"    # 8,126
node bulk-import-fixed-2025-08-05.js "Lawley June Week 4 30062025.csv"    # 6,761
```

### 🔍 TEST CHECKPOINT 3 - After June Complete:
```bash
cd ../
node validate-import-accuracy-2025-08-05.js
# Expected: Real status changes only, no phantoms
```

## Phase 3: July 2025 Imports & Final Testing

### July Imports:
```bash
node bulk-import-fixed-2025-08-05.js "Lawley July Week 1 01072025.csv"    # 7,413
node bulk-import-fixed-2025-08-05.js "Lawley July Week 1 02072025.csv"    # 7,878
node bulk-import-fixed-2025-08-05.js "Lawley July Week 1 03072025.csv"    # 8,431
node bulk-import-fixed-2025-08-05.js "Lawly July Week 1 04072025.csv"     # 8,468
node bulk-import-fixed-2025-08-05.js "Lawley July Week 2 07072025.csv"    # 9,379
node bulk-import-fixed-2025-08-05.js "Lawley July Week 2 08072025.csv"    # 9,704
# Skip July 11 - incompatible format
node bulk-import-fixed-2025-08-05.js "Lawley July Week 3 14072025.csv"    # 10,021
node bulk-import-fixed-2025-08-05.js "Lawley July Week 3 15072025.csv"    # 10,030
node bulk-import-fixed-2025-08-05.js "Lawley July Week 3 16072025.csv"    # 10,047
node bulk-import-fixed-2025-08-05.js "Lawley July Week 3 17072025.csv"    # 10,467
node bulk-import-fixed-2025-08-05.js "Lawley July Week 3 18072025.csv"    # 10,479
```

### 🔍 FINAL TEST - After All Imports:
```bash
cd ../
node validate-import-accuracy-2025-08-05.js
node monitor-clear-progress.js

# Final validation of known properties
node check-specific-properties.js
```

## Success Criteria:
✅ No phantom status changes  
✅ Database changes match CSV exactly  
✅ No backwards progressions  
✅ ~10,000-15,000 unique properties  
✅ Clean status history  

## Quick Reference Scripts:
- **Import**: `bulk-import-fixed-2025-08-05.js`
- **Check Progress**: `monitor-clear-progress.js`
- **Validate Specific**: `check-specific-properties.js`
- **Full Validation**: `validate-import-accuracy-2025-08-05.js`

## Emergency Stop:
If phantom changes detected at any checkpoint:
1. STOP imports immediately
2. Document the issue
3. Do NOT continue until resolved

---
**Created**: 2025-08-05  
**Purpose**: Clean import without phantom status changes  
**Status**: READY TO EXECUTE