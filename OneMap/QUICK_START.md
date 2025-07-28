# OneMap Agent Quick Start

## 🚀 Morning Startup Command
```bash
# Just say: "OneMap agent, process next CSV"
```

## 📋 Current Processing Status
- **Last Processed**: May 23, 2025
- **Next to Process**: May 26, 2025 - `Lawley May Week 4 26052025.csv`
- **Location**: `OneMap/downloads/`

## 🔧 Quick Commands
```bash
# Process next CSV in sequence
cd OneMap && node scripts/bulk-import-onemap.js "downloads/Lawley May Week 4 26052025.csv"

# Check current status
cat OneMap/CSV_PROCESSING_LOG.md

# Generate report after import
node scripts/generate-firebase-report.js
```

## 📁 Key Locations
- **CSV Files**: `OneMap/downloads/`
- **Processing Log**: `OneMap/CSV_PROCESSING_LOG.md`
- **Import Scripts**: `OneMap/scripts/bulk-import-onemap.js`
- **Reports**: `OneMap/reports/`

## 🎯 Import Sequence
1. ✅ May 22 - Completed
2. ✅ May 23 - Completed
3. 🔄 May 26 - Ready to process
4. ⏳ May 27 - Pending
5. ⏳ May 29 - Pending
6. ⏳ May 30 - Pending

---
*Updated: 2025-01-29*