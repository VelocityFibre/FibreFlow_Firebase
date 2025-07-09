# OneMap Module - Pole Conflict Resolution System

## Overview
OneMap is a data quality management module for FibreFlow that identifies and resolves pole location conflicts in fiber optic installation projects.

## Current Status
- ✅ Data analysis complete
- ✅ 1,811 pole location conflicts identified
- ✅ Export scripts ready
- ⏳ Awaiting field verification
- 🔲 Angular module development pending

## Quick Start

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
├── CLAUDE.md                    # Context engineering document
├── README.md                    # This file
├── Raw Data/
│   ├── Lawley_Project_Louis.csv # Original data
│   └── Lawley_Essential.csv     # Filtered columns
├── Scripts/
│   ├── analyze_and_export_complete.py
│   ├── identify_true_duplicates.py
│   └── validate_analysis.py
├── Reports/
│   └── POLE_CONFLICT_MANAGEMENT_REPORT.md
└── Exports/
    ├── field_verification_priority.csv
    └── antiHall_validation_proof.json
```

## Next Steps
1. Field verification of pole conflicts
2. Update records with correct locations
3. Implement OneMap Angular module
4. Add real-time validation

## Development Plan
See `PROJECT_PLAN.md` and `DEVELOPMENT_ROADMAP.md` for detailed implementation timeline.

---
*Last Updated: 2025-01-09*