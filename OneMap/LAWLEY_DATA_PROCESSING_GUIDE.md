# Lawley Data Processing & Firebase Import Guide

**Date**: 2025-01-16  
**Purpose**: Complete guide for processing Lawley CSV files and importing to Firebase

---

## 📋 Overview

This guide shows you exactly which scripts to run, in what order, to:
1. Extract specific fields from Lawley CSV files
2. Validate the data
3. Import to Firebase (when ready)

---

## 🚀 Quick Start (Just Run These Commands)

```bash
cd /home/ldp/VF/Apps/FibreFlow/OneMap

# Step 1: Extract Poles
python3 extract_lawley_poles.py

# Step 2: Extract Drops  
python3 extract_lawley_drops.py

# Step 3: Validate Relationships
python3 validate_pole_drop_relationships.py

# Step 4: Verify Results (Optional but recommended)
python3 validate_extraction_results.py
```

---

## 📁 Required Input Files

Make sure these files exist in `/home/ldp/Downloads/`:
- `Lawley Pole (CSV).csv` - Contains pole data
- `Lawley Drops (CSV).csv` - Contains drop cable data

---

## 🔧 Detailed Script Guide

### 1️⃣ **extract_lawley_poles.py**
**What it does**: Extracts pole data from CSV

**Input**: `/home/ldp/Downloads/Lawley Pole (CSV).csv`

**Output Files**:
- `output/lawley-poles-extracted.json` - Full pole data
- `output/lawley-poles-extracted.csv` - Simplified CSV

**Fields Extracted**:
- Pole ID, Height, Diameter, Status
- GPS coordinates (latitude, longitude)
- PON number, Zone number
- **Added**: Pole type (feeder/distribution)

**Run it**:
```bash
python3 extract_lawley_poles.py
```

**Expected Output**:
```
Valid poles extracted: 4468
Feeder poles: 2107
Distribution poles: 2361
GPS Data: With GPS coordinates: 4468
```

---

### 2️⃣ **extract_lawley_drops.py**
**What it does**: Extracts drop cable data from CSV

**Input**: `/home/ldp/Downloads/Lawley Drops (CSV).csv`

**Output Files**:
- `output/lawley-drops-extracted.json` - Full drop data
- `output/lawley-drops-extracted.csv` - Simplified CSV

**Fields Extracted**:
- Drop ID, Pole reference, ONT reference
- Cable length, PON number, Zone number
- GPS coordinates (usually empty)
- Date created, Created by
- **Added**: isSpare flag (true if no ONT)

**Run it**:
```bash
python3 extract_lawley_drops.py
```

**Expected Output**:
```
Valid drops extracted: 23708
Active drops: 20109
Spare drops: 3599
Unique poles referenced: 2965
```

---

### 3️⃣ **validate_pole_drop_relationships.py**
**What it does**: Links drops to poles and validates relationships

**Input Files** (from previous steps):
- `output/lawley-poles-extracted.json`
- `output/lawley-drops-extracted.json`

**Output Files**:
- `output/relationship-validation-report.json` - Validation results
- `output/poles-with-drops.json` - Poles updated with connected drops

**What it validates**:
- All drops reference existing poles
- No pole has more than 12 drops
- Updates poles with connected drop arrays
- Calculates statistics

**Run it**:
```bash
python3 validate_pole_drop_relationships.py
```

**Expected Output**:
```
Poles with drops: 2965
Poles without drops: 1503
Average drops per pole: 8.0
Orphaned drops: 0
```

---

### 4️⃣ **validate_extraction_results.py** (Optional)
**What it does**: Verifies all statistics are accurate (antiHall validation)

**Run it**:
```bash
python3 validate_extraction_results.py
```

**Expected Output**:
```
Validation Score: 100.0%
Conclusion: All claims verified - No hallucinations detected
```

---

## 📊 Output Files Summary

After running all scripts, you'll have these files in `OneMap/output/`:

| File | Description | Use For |
|------|-------------|---------|
| `lawley-poles-extracted.json` | All pole data with transformations | Firebase import |
| `lawley-drops-extracted.json` | All drop data with transformations | Firebase import |
| `poles-with-drops.json` | Poles with connected drops arrays | Relationship data |
| `relationship-validation-report.json` | Validation statistics | Quality check |
| `*.csv` files | Simplified data | Excel viewing |

---

## 🔥 Firebase Import Options

### Option A: Use Existing Script (Recommended)
```bash
# This script already exists and imports drops to Firebase
cd /home/ldp/VF/Apps/FibreFlow
node scripts/import-lawley-drops.js
```

### Option B: Create Python Import Script
```python
# We can create: import_to_firebase.py
# This would:
# 1. Read the extracted JSON files
# 2. Connect to Firebase using service account
# 3. Batch import poles and drops
# 4. Update relationships
```

### Option C: Manual Import via Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore
3. Import JSON files
4. Use collection names: `poles`, `drops`

---

## ✅ Data Processing Checklist

- [ ] **Check CSV files exist** in `/home/ldp/Downloads/`
- [ ] **Run pole extraction**: `python3 extract_lawley_poles.py`
- [ ] **Verify pole output**: Check for 4,468 poles
- [ ] **Run drop extraction**: `python3 extract_lawley_drops.py`
- [ ] **Verify drop output**: Check for 23,708 drops
- [ ] **Run relationship validation**: `python3 validate_pole_drop_relationships.py`
- [ ] **Check validation report**: No orphaned drops
- [ ] **Optional: Run antiHall check**: `python3 validate_extraction_results.py`
- [ ] **Ready for Firebase import**

---

## 🎯 Next Steps for Firebase Import

### If you want to import NOW:
```bash
# Use the existing Node.js script
cd /home/ldp/VF/Apps/FibreFlow
node scripts/import-lawley-drops.js
```

### If you want a Python Firebase importer:
Tell me and I'll create:
- `import_poles_to_firebase.py` - Import poles
- `import_drops_to_firebase.py` - Import drops
- `update_relationships_firebase.py` - Update pole-drop links

### If you want to modify the data first:
The JSON files in `output/` can be edited before import.

---

## 🚨 Important Notes

1. **Pole-Drop Relationships**: Drops reference poles via `poleReference` field
2. **Spare Drops**: Have `isSpare: true` when no ONT assigned
3. **GPS Data**: 
   - All poles have GPS coordinates
   - No drops have GPS coordinates (this is normal)
4. **Capacity**: Each pole can have maximum 12 drops
5. **Data Integrity**: All drops are linked to valid poles

---

## 📞 Quick Commands Reference

```bash
# Full processing pipeline
cd /home/ldp/VF/Apps/FibreFlow/OneMap
python3 extract_lawley_poles.py && python3 extract_lawley_drops.py && python3 validate_pole_drop_relationships.py

# Check results
ls -la output/
cat output/relationship-validation-report.json | grep -A5 "statistics"

# Ready for Firebase
echo "Data ready in: $(pwd)/output/"
```

---

**Questions?**
- Need different fields extracted? → Modify the extract scripts
- Want different validations? → Update validation scripts  
- Ready for Firebase import? → Let me know which method you prefer