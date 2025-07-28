# OneMap Scripts Directory

## 📁 Directory Organization

### Primary Directories
- **`csv-processing/`** - Local CSV operations (no Firebase)
- **`firebase-import/`** - CSV to Firebase import scripts
- **`reporting/`** - Firebase to report generation
- **`data_analysis/`** - Python analysis tools
- **`payment_verification/`** - Payment validation scripts
- **`utilities/`** - General utility scripts

### Archive
- **`archive/`** - Old/unused scripts (don't delete, just archive)

## 🎯 Which Script to Use When

### Daily CSV Import (Most Common)
```bash
cd firebase-import/
node bulk-import-with-history.js "downloads/Lawley June Week 4 24062025.csv"
```

### Generate Summary Report
```bash
cd reporting/
node generate-firebase-report.js
```

### Check Import Status
```bash
cd ../
bash morning-status.sh
```

### Cross-Reference Validation
1. Import CSV to Firebase
2. Generate report
3. Compare CSV row count vs Firebase record count
4. Verify new vs updated record counts

## 📋 Each Directory Has

- **CLAUDE.md** - Purpose, usage, examples
- **Scripts organized by function**
- **Clear separation of concerns**

## 🚨 Important Notes

1. **USE THE RIGHT SCRIPT**: `bulk-import-with-history.js` for imports (not bulk-import-onemap.js)
2. **CROSS-REFERENCE**: Always validate imports against master CSV
3. **SEPARATION**: CSV processing ≠ Firebase import ≠ Reporting
4. **DOCUMENTATION**: Each directory has its own CLAUDE.md

---
*Organized: 2025-01-31*
*Purpose: Clear workflow understanding*