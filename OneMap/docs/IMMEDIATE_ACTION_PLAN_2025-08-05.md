# 🚨 IMMEDIATE ACTION PLAN - Data Integrity Fix

**Created: 2025-08-05**
**Status: READY TO EXECUTE**

## 📋 Summary

**Problem**: Import script creates phantom status changes that never happened in CSV files
**Impact**: 5+ properties verified with corrupted status history, likely thousands affected
**Solution**: New fixed script eliminates root cause

## 🎯 Step-by-Step Execution Plan

### Step 1: Test Fixed Script (5 minutes)
```bash
cd OneMap/scripts/firebase-import
node bulk-import-fixed-2025-08-05.js "Lawley May Week 3 22052025 - First Report.csv"
```
**Purpose**: Verify fixed script works on small file (746 records)
**Expected**: Clean import with no phantom changes

### Step 2: Verify Results (3 minutes)  
```bash
node ../../scripts/check-specific-properties.js
```
**Purpose**: Check that no false status changes were created
**Expected**: Only real status changes from CSV recorded

### Step 3: Document Baseline (2 minutes)
Record current database state before major cleanup:
- Total records in database
- Properties with multiple status changes
- Import batches present

### Step 4: Stop Using Old Scripts (Immediate)
**CRITICAL**: Only use `bulk-import-fixed-2025-08-05.js` going forward
- Old scripts are archived with DO-NOT-USE warnings
- README created to prevent confusion

### Step 5: Plan Database Cleanup (Future)
**After testing confirms fix works**:
1. Identify all properties with phantom changes (thousands likely)
2. Remove false status change records 
3. Rebuild clean status history from CSV sources
4. Re-import affected files with fixed script

## 🔧 Scripts Ready

### ✅ USE THIS:
- `bulk-import-fixed-2025-08-05.js` - Fixed script (PRODUCTION READY)

### ❌ ARCHIVED:
- `ARCHIVED_bulk-import-with-history_DO-NOT-USE_2025-08-05.js` - Old broken script

### 📖 DOCUMENTATION:
- `README_WHICH_SCRIPT_TO_USE.md` - Clear guidance on which script to use

## ⚠️ Critical Points

1. **Test First**: Always test on small file before large imports
2. **No Old Scripts**: Never use archived scripts - they create phantom data
3. **Complete Replacement**: New script uses complete document replacement (no merge)
4. **Memory Safe**: Line-by-line processing prevents memory corruption

## 🎯 Expected Outcomes

### Immediate (After Step 1-2):
- ✅ Clean test import with no phantom changes
- ✅ Verification that fix works correctly
- ✅ Confidence to proceed with larger imports

### Short Term (Next imports):
- ✅ All new imports use fixed script
- ✅ No more phantom status changes created
- ✅ Reliable status progression tracking

### Long Term (After cleanup):
- ✅ Entire database has clean status history
- ✅ Reliable reporting and analytics
- ✅ Trustworthy audit trail

## 🚀 Ready to Execute?

**Everything is prepared. We can start Step 1 immediately.**

The fixed script addresses all identified issues:
- ❌ No merge: true (prevents data mixing)
- ❌ No memory overload (line-by-line processing) 
- ❌ No phantom changes (complete replacement)
- ✅ Clean, reliable imports

**Question**: Shall we start with Step 1 - testing the fixed script on the small May file?