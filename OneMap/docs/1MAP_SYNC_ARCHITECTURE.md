# 1Map to FibreFlow Sync Architecture

*Created: 2025-07-21*  
*Status: Planning Phase*

## Overview

Daily synchronization of 1Map data exports to FibreFlow, with processing database as buffer to handle schema changes and ensure data integrity.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Google Drive  │     │    Processing   │     │  FibreFlow Live │
│  (1Map Exports) │ --> │    Database     │ --> │    Database     │
│   Daily CSVs    │     │  (Validation)   │     │  (Production)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ↓                        ↓                        ↓
   Manual Download          Process & Validate      Incremental Sync
   (Future: Auto)           Schema Mapping         (Only Changes)
                           Change Detection        Preserve User Data
```

## Workflow Steps

### 1. Daily CSV Export from 1Map
- **Source**: Google Drive folder
- **Format**: CSV files (schema may vary)
- **Frequency**: Daily dumps
- **Naming Convention**: TBD (need to see examples)

### 2. Import to Processing Database
- **Collection**: `onemap-processing`
- **Purpose**: 
  - Buffer against schema changes
  - Validation before production
  - Change detection
  - Audit trail

### 3. Processing & Validation
- Map 1Map fields to FibreFlow schema
- Validate data integrity
- Detect changes (new/updated records)
- Generate daily reports

### 4. Sync to Live Database
- **Strategy**: Incremental updates only
- **Preserve**: User-generated data (photos, notes, quality checks)
- **Update**: Only changed fields from 1Map
- **Create**: New records that don't exist

## Key Design Decisions

### Why Processing Database?
1. **Schema Flexibility**: 1Map columns may change
2. **Data Safety**: Never directly modify production
3. **Validation**: Catch errors before they reach users
4. **Reporting**: Track what changed each day
5. **Rollback**: Can revert if issues found

### Change Detection Strategy
- **Option A**: Timestamp-based (if 1Map provides)
- **Option B**: Hash comparison (compute hash of record)
- **Option C**: Field-by-field comparison
- **Recommendation**: Start with Option C for visibility

### Conflict Resolution
- **1Map as Source of Truth** for:
  - Pole locations
  - Property assignments
  - Status updates
- **FibreFlow Preserves**:
  - User uploads (photos)
  - Quality checks
  - Installation notes
  - Custom fields

## Implementation Plan

### Phase 1: Manual Testing (Current)
1. Download CSV from Google Drive
2. Run processing script
3. Review change report
4. Approve and sync to production

### Phase 2: Automation (Future)
1. Google Drive API integration
2. Scheduled Cloud Functions
3. Email notifications
4. Automatic sync with approval

## Technical Stack

### Processing Database Structure
```javascript
// onemap-processing collection
{
  importId: "20250721_001",
  importDate: Timestamp,
  fileName: "1map_export_20250721.csv",
  status: "processing|validated|synced|error",
  recordCount: 1000,
  changes: {
    new: 50,
    updated: 25,
    unchanged: 925
  },
  errors: [],
  processedAt: Timestamp,
  syncedAt: Timestamp
}

// onemap-records subcollection
{
  // All 1Map fields preserved as-is
  raw_field1: "value",
  raw_field2: "value",
  
  // Metadata
  _import: {
    importId: "20250721_001",
    hash: "abc123...",
    status: "new|updated|unchanged",
    errors: []
  },
  
  // Mapped fields for FibreFlow
  _mapped: {
    poleNumber: "LAW.P.001",
    propertyId: "PROP123",
    // etc...
  }
}
```

## Daily Reports

### Change Summary Report
- Total records processed
- New records found
- Updated records (with field changes)
- Errors/warnings
- Records ready to sync

### Detailed Change Log
- Record-by-record changes
- Before/after values
- Conflict warnings
- Sync recommendations

## Questions Needing Answers

1. **1Map Data Structure**
   - What columns does 1Map export?
   - Sample CSV structure?
   - Unique identifier field?
   
2. **Change Detection**
   - Does 1Map provide timestamps?
   - What fields indicate an update?
   - How to identify same record?

3. **Business Rules**
   - Which fields can 1Map update?
   - Which fields are FibreFlow-only?
   - How to handle deletions?

4. **Sync Frequency**
   - Real-time as CSV arrives?
   - Scheduled batch (what time)?
   - Manual approval required?

## Next Steps

1. ✅ Create this architecture document
2. ⏳ Get sample 1Map CSV to analyze structure
3. ⏳ Build processing database schema
4. ⏳ Create import script
5. ⏳ Implement change detection
6. ⏳ Build reporting system
7. ⏳ Test with real data

## Success Criteria

- Zero data loss during sync
- Clear audit trail of all changes
- No disruption to live users
- Daily reports showing exactly what changed
- Ability to rollback if needed
- Handles schema changes gracefully

---

*This document will be updated as we learn more about 1Map's data structure and business requirements.*