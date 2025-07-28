# Script Consolidation Plan - Safe Approach

## 🛡️ SAFETY FIRST APPROACH

### Step 1: Backup Current Working Script
```bash
# Create backup of the script that just worked for June 23
cp bulk-import-onemap.js backup/bulk-import-onemap-WORKING-2025-01-31.js

# Also backup the processing log
cp ../CSV_PROCESSING_LOG.md backup/CSV_PROCESSING_LOG-BEFORE-CONSOLIDATION.md
```

### Step 2: Create Archive Structure
```bash
OneMap/scripts/
├── archive/
│   ├── 2025-01-31-before-consolidation/
│   │   ├── README.md (explains each script)
│   │   ├── bulk-import-*.js (all versions)
│   │   └── [all 82 scripts]
│   └── ARCHIVE_INDEX.md
├── backup/
│   ├── bulk-import-onemap-WORKING-2025-01-31.js
│   └── LAST_KNOWN_GOOD.md
└── [new consolidated scripts]
```

### Step 3: Document What We're Using Now
```javascript
// CURRENT WORKING IMPORT FLOW (June 23 used this):
1. bulk-import-onemap.js - Imports CSV
2. generate-firebase-report.js - Creates report
3. Manual update to CSV_PROCESSING_LOG.md

// MISSING: Import summary showing new vs updated
```

### Step 4: Find Best Features From Each Script
```bash
# Search for report generation code
grep -l "new.*records\|updated.*records\|import.*summary" *.js

# Find scripts that update the processing log
grep -l "CSV_PROCESSING_LOG" *.js

# Find scripts with proper error handling
grep -l "try.*catch\|error handling" *.js
```

### Step 5: Create New Consolidated Script
```javascript
// onemap-import-unified.js
/**
 * UNIFIED OneMap Import Script
 * Created: 2025-01-31
 * Based on: bulk-import-onemap.js (working) + best features from others
 * 
 * Purpose: Single script for all imports with full reporting
 * Replaces: 10+ different import scripts
 */

// Combine:
// - Core import logic from bulk-import-onemap.js (WORKING)
// - Report generation from bulk-import-with-history.js
// - Processing log update from process-next-csv.js
// - Error handling from various scripts
```

### Step 6: Test Parallel to Existing
```bash
# Test new script WITHOUT removing old one
node onemap-import-unified.js "test-10-records.csv" --dry-run

# Compare results with original
node bulk-import-onemap.js "test-10-records.csv"

# Only replace after confirming identical results
```

### Step 7: Gradual Migration
```
Week 1: Use new script alongside old (both work)
Week 2: Primary use new script, old as backup  
Week 3: Move old scripts to archive
Week 4: Clean up
```

## 🔍 WHAT TO PRESERVE

### From bulk-import-onemap.js (WORKING):
- CSV parsing logic ✓
- Batch import process ✓
- Property ID deduplication ✓
- Firebase connection ✓

### From Other Scripts (ADD):
- Import summary generation
- New vs Updated tracking
- Automatic log updates
- Better error messages
- Dry-run capability

## ⚠️ WHAT NOT TO CHANGE
1. Field mappings (must stay identical)
2. Merge behavior (Property ID deduplication)
3. Batch size (500 records)
4. Firebase project (vf-onemap-data)

## 📋 CONSOLIDATION CHECKLIST

- [ ] Backup current working script
- [ ] Create archive directory structure
- [ ] Document current working flow
- [ ] Identify best features from each script
- [ ] Create unified script preserving working logic
- [ ] Test extensively with small CSV
- [ ] Test with full CSV in dry-run mode
- [ ] Run parallel with old script
- [ ] Verify identical results
- [ ] Switch to new script
- [ ] Archive old scripts

## 🚨 ROLLBACK PLAN

If anything goes wrong:
```bash
# Immediate rollback
cp backup/bulk-import-onemap-WORKING-2025-01-31.js bulk-import-onemap.js

# Continue using working script
node bulk-import-onemap.js "next-file.csv"
```

---
*The key is to NEVER delete or modify the working script until the new one is proven*