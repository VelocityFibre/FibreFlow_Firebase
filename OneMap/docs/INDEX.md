# OneMap Documentation Index

*Last Updated: 2025-07-23*

## 📚 Project Documentation Structure

> **📍 NEW (2025-07-23)**: Added Graph Analysis system documentation in `../GraphAnalysis/docs/` 
> See `../GraphAnalysis/docs/INDEX.md` for relationship-aware duplicate detection and CSV enhancement.

### Core Understanding Documents

1. **📋 [PROJECT_UNDERSTANDING_V2.md](../PROJECT_UNDERSTANDING_V2.md)** ⭐ START HERE
   - Current simplified approach
   - Two-process split (daily import vs progress tracking)
   - Clear next steps

2. **📊 [ONEMAP_TRACKING_ASSUMPTIONS.md](../ONEMAP_TRACKING_ASSUMPTIONS.md)**
   - Business rules and tracking logic
   - First instance counting rules
   - Daily change detection approach

3. **🔧 [ONEMAP_IMPORT_TRACKING_SYSTEM.md](../ONEMAP_IMPORT_TRACKING_SYSTEM.md)**
   - Original comprehensive plan
   - Technical architecture details
   - Database schema designs

### Technical Documentation

4. **⚡ [CSV_VS_FIREBASE_PROCESSING.md](./CSV_VS_FIREBASE_PROCESSING.md)** 🆕
   - Performance analysis: CSV vs Firebase operations
   - Speed comparisons (100-1000x faster with CSV)
   - Lessons learned from June imports

5. **📋 [UPDATED_IMPORT_STRATEGY.md](./UPDATED_IMPORT_STRATEGY.md)** 🆕
   - New CSV-first processing approach
   - Implementation plan
   - Migration from current approach

6. **✅ [CORRECT_IMPORT_APPROACH.md](./CORRECT_IMPORT_APPROACH.md)** 🆕
   - Proper deduplication patterns
   - One Property ID = One Record principle
   - Import best practices

7. **🔍 [VERIFICATION_METHODS.md](../VERIFICATION_METHODS.md)**
   - Data quality checks
   - Business logic validation
   - Red flag detection

8. **📈 [COMPARISON_STRATEGY.md](../COMPARISON_STRATEGY.md)**
   - CSV vs Database comparison
   - Why staging database approach
   - Performance considerations

9. **🗂️ [FIELD_MAPPING_REFERENCE.md](../FIELD_MAPPING_REFERENCE.md)**
   - CSV field definitions
   - OneMap to FibreFlow mappings
   - Data transformations

### Import Process Documentation

10. **📥 [imports/INDEX.md](../imports/INDEX.md)**
   - Import tracking system
   - Historical imports log
   - Batch tracking

11. **☁️ [GOOGLE_DRIVE_LOCATION.md](./GOOGLE_DRIVE_LOCATION.md)**
   - Source data location
   - Access information
   - File naming conventions

### Analysis & Reports

12. **📊 [ANALYSIS_CONTEXT.md](./ANALYSIS_CONTEXT.md)**
   - Business context
   - Agent payment verification
   - Duplicate analysis

13. **🔍 [SEARCH_PATTERNS_AND_LESSONS.md](./SEARCH_PATTERNS_AND_LESSONS.md)** 🆕
   - Effective search strategies for OneMap data
   - Lessons learned from pole permission analysis
   - Speed optimization tips
   - Future analysis patterns

14. **📝 Various Report Files**
    - Daily change reports
    - Import status reports
    - Data quality reports
    - Pole status analysis reports

## 🎯 Quick Navigation

### If you want to...

**Understand the current approach**:
→ Read PROJECT_UNDERSTANDING_V2.md

**Import June 5th data**:
→ Check PROJECT_UNDERSTANDING_V2.md for which process to use

**Understand tracking rules**:
→ Read ONEMAP_TRACKING_ASSUMPTIONS.md

**Check data quality**:
→ See VERIFICATION_METHODS.md

**Review field mappings**:
→ Check FIELD_MAPPING_REFERENCE.md

## 📁 Directory Structure

```
OneMap/
├── docs/                    # All documentation
│   ├── INDEX.md            # This file
│   └── [various docs]      # Technical & analysis docs
│
├── imports/                # Import tracking
│   └── INDEX.md           # Import history
│
├── scripts/               # Processing scripts
│   ├── Process 1/        # Daily import scripts
│   └── Process 2/        # Progress tracking scripts
│
├── reports/              # Generated reports
│   ├── daily-changes/    # Simple change reports
│   └── progress/         # Complex tracking reports
│
└── Main Documents/       # Core understanding
    ├── PROJECT_UNDERSTANDING_V2.md
    ├── ONEMAP_TRACKING_ASSUMPTIONS.md
    └── ONEMAP_IMPORT_TRACKING_SYSTEM.md
```

## 🔄 Document Status

| Document | Status | Last Updated | Priority |
|----------|--------|--------------|----------|
| PROJECT_UNDERSTANDING_V2.md | ✅ Current | 2025-01-22 | HIGH |
| ONEMAP_TRACKING_ASSUMPTIONS.md | ✅ Current | 2025-01-22 | HIGH |
| ONEMAP_IMPORT_TRACKING_SYSTEM.md | 📝 Original Plan | 2025-01-22 | Reference |
| VERIFICATION_METHODS.md | ✅ Current | 2025-01-22 | Medium |
| COMPARISON_STRATEGY.md | ✅ Current | 2025-01-22 | Medium |

---

*Use this index to navigate the OneMap documentation. Start with PROJECT_UNDERSTANDING_V2.md for the current approach.*