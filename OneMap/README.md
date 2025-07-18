# OneMap Module - Data Processing Hub

## Overview
OneMap is a multi-purpose data processing directory for FibreFlow that handles:
1. **CSV to Firebase Import Workflows** - Converting external CSV data to Firebase documents
2. **Pole Conflict Resolution** - Identifying and resolving pole location conflicts
3. **Data Quality Management** - Ensuring data integrity across imports

## CSV to Firebase Import (New Section)

### Complete Workflow Guide
**See `CSV_TO_FIREBASE_WORKFLOW.md` for detailed step-by-step instructions**

### Quick Import Process
1. Extract data from CSV: `python extract_lawley_poles.py`
2. Validate extraction: `python validate_extraction_results.py`
3. Import to Firebase: `node import-lawley-to-firebase.js`
4. Verify in UI: Check pole-tracker page

### Key Import Scripts
- **Python Scripts**: Extract and validate CSV data
- **Node.js Scripts**: Import to Firebase with proper field mapping
- **Validation Scripts**: Ensure data integrity with antiHall

---

## Pole Conflict Resolution (Original Purpose)

### Current Status
- ✅ Data analysis complete
- ✅ 1,811 pole location conflicts identified
- ✅ Export scripts ready
- ⏳ Awaiting field verification
- 🔲 Angular module development pending

### Quick Start

### 1. Run Complete Analysis
```bash
python3 analyze_and_export_complete.py
```

This generates:
- `POLE_CONFLICT_MANAGEMENT_REPORT.md` - Full analysis report
- `field_verification_priority.csv` - High priority poles for field teams
- `antiHall_validation_proof.json` - Validation evidence

### 2. Understanding the Problem
- **Normal**: Multiple entries for same pole at SAME address (workflow updates)
- **Problem**: Same pole at DIFFERENT addresses (1,811 conflicts found)

### 3. For Field Teams
Share `field_verification_priority.csv` which contains:
- Critical poles (5+ locations) 
- High priority poles (3-4 locations)
- Columns for teams to fill in verified location

## Key Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `analyze_and_export_complete.py` | Full analysis with validation | Main analysis tool |
| `identify_true_duplicates.py` | Simple duplicate vs workflow check | Quick verification |
| `export_pole_conflicts.py` | Detailed conflict export | Additional exports |
| `filter_essential_columns.py` | Reduce CSV size | Data too large |
| `validate_analysis.py` | antiHall validation | Verify claims |

## antiHall & Context Engineering

This module implements:
- **antiHall validation**: Every claim verified with data
- **Context engineering**: See `CLAUDE.md` for principles
- **First principles**: One pole = one physical location

## Project Structure
```
OneMap/
├── CSV_TO_FIREBASE_WORKFLOW.md  # Complete import workflow guide
├── CLAUDE.md                    # Context engineering document
├── README.md                    # This file
│
├── CSV Import Scripts/
│   ├── extract_lawley_poles.py
│   ├── extract_lawley_drops.py
│   ├── validate_pole_drop_relationships.py
│   ├── validate_extraction_results.py
│   ├── import-lawley-to-firebase.js
│   ├── import-remaining-lawley-data.js
│   ├── check-firebase-import-status.js
│   ├── test-pole-data.js
│   └── verify-pole-data-structure.js
│
├── Pole Conflict Scripts/
│   ├── analyze_and_export_complete.py
│   ├── identify_true_duplicates.py
│   └── validate_analysis.py
│
├── Raw Data/
│   ├── Lawley_Project_Louis.csv # Original data
│   ├── Lawley Pole (CSV).csv    # Pole data for import
│   ├── Lawley Drops (CSV).csv   # Drop data for import
│   └── Lawley_Essential.csv     # Filtered columns
│
├── output/                      # Extracted JSON files
│   ├── lawley-poles-extracted.json
│   ├── lawley-drops-extracted.json
│   └── poles-with-drops.json
│
├── Reports/
│   └── POLE_CONFLICT_MANAGEMENT_REPORT.md
│
└── Exports/
    ├── field_verification_priority.csv
    └── antiHall_validation_proof.json
```

## Next Steps

### For CSV to Firebase Imports
1. Always validate extracted data before import
2. Ensure ALL UI fields are mapped during import
3. Create necessary Firestore indexes
4. Test in pole-tracker UI immediately

### For Pole Conflict Resolution
1. Field verification of pole conflicts
2. Update records with correct locations
3. Implement OneMap Angular module
4. Add real-time validation

## Key Lessons Learned
- **Most Important**: Map ALL UI-required fields during initial import (not afterwards!)
- Verify collection names match what UI expects
- Handle batch operations properly
- Use antiHall validation for data integrity

## Development Plan
See `PROJECT_PLAN.md` and `DEVELOPMENT_ROADMAP.md` for detailed implementation timeline.

---
*Last Updated: 2025-01-16*
*Successfully imported: 4,468 poles and 23,708 drops to Firebase*