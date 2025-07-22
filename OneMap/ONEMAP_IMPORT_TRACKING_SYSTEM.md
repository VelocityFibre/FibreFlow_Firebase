# OneMap Import Tracking System - Project Development Plan

*Document Type: Project Development Plan (PDP)*  
*Status: REVISED - See PROJECT_UNDERSTANDING_V2.md*  
*Created: 2025-01-22*  
*Version: 2.0*

## ⚠️ IMPORTANT UPDATE (2025-01-22)
**This document contains the original comprehensive plan. For the simplified two-process approach and current understanding, see:**
- 📋 **PROJECT_UNDERSTANDING_V2.md** - Current simplified approach
- 📊 **ONEMAP_TRACKING_ASSUMPTIONS.md** - Tracking rules and clarifications

## Executive Summary

This document defines the complete development plan for the OneMap Daily Import Tracking System. It addresses the critical business need to intelligently process daily data dumps from OneMap while avoiding duplicates and maintaining comprehensive change history.

## The Big Picture

**OneMap** is our data source that provides daily CSV dumps of property/fiber installation data. The challenge is that each daily dump contains:
- All historical records (yesterday's data)
- Plus any new records added today
- Plus any updates to existing records

We need a smart import system that:
1. **Avoids duplicates** - Don't re-import the same property multiple times
2. **Tracks progress** - Know what's new and what changed each day
3. **Maintains history** - Keep audit trail of all changes over time

## Workflow Summary

```
Daily Process:
1. OneMap generates CSV → Contains 5,000+ records (mostly duplicates from yesterday)
2. We download CSV → Goes to OneMap/downloads/ folder
3. Our import script runs → Compares with Firestore staging collection
4. Smart detection happens:
   - NEW property IDs → Add to staging (maybe 50-200 new per day)
   - EXISTING property IDs with changes → Update and track what changed
   - EXISTING property IDs with no changes → Skip (majority of records)
5. Generate reports showing:
   - "Today we added 156 new properties"
   - "Property PROP123 changed status from Pending to Active"
   - "Total properties in system: 5,287"
```

## Business Value

This system helps us:
1. **Track growth** - See how many new properties/installations happen daily
2. **Monitor changes** - Know when property statuses or details change
3. **Maintain data quality** - No duplicates, full audit trail
4. **Generate insights** - Historical reports on installation progress

## Key Technical Points

- **Property ID** is the unique identifier (like a social security number for each property)
- **Firestore staging** is our "source of truth" database
- **Import batches** group each day's import with timestamp
- **Change history** tracks every field modification
- **Reports** provide both files (for sharing) and database records (for querying)

## What Success Looks Like

After implementation, the daily routine will be:
1. Download CSV from OneMap
2. Run: `node import-onemap-daily.js`
3. Get report: "✓ Imported 156 new properties, 23 updates, 0 errors"
4. View detailed changes in generated report file
5. Query Firestore for any historical analysis needed

## Data Flow Architecture

```
Daily CSV from OneMap
    ↓
Import Script (Node.js)
    ↓
Compare with Firestore Staging Collection
    ↓
Process:
  - New Records → Insert with batch ID
  - Changed Records → Update + log changes
  - Unchanged Records → Skip
    ↓
Generate Reports:
  - File Report (Markdown/JSON)
  - Database Report (Firestore)
```

## Firestore Collections Structure

### 1. onemap-staging (Main Data)
```
{property_id}/
├── property_id: string (unique)
├── current_data: { all CSV fields }
├── import_batch_id: string
├── first_seen_date: timestamp
├── last_updated_date: timestamp
├── version: number
└── is_active: boolean
```

### 2. onemap-import-batches (Import Tracking)
```
{batch_id}/
├── batch_id: string (e.g., "IMP_2025-01-22_093045")
├── import_date: timestamp
├── file_name: string
├── total_rows_processed: number
├── new_records_count: number
├── updated_records_count: number
├── unchanged_records_count: number
├── error_count: number
└── status: 'completed' | 'failed' | 'processing'
```

### 3. onemap-change-history (Audit Trail)
```
{change_id}/
├── property_id: string
├── batch_id: string
├── change_type: 'new' | 'update'
├── changed_fields: [{
│     field_name: string
│     old_value: any
│     new_value: any
│   }]
├── change_date: timestamp
└── record_snapshot: { full record }
```

### 4. onemap-import-reports (Report Storage)
```
{report_id}/
├── batch_id: string
├── report_type: 'summary' | 'detailed'
├── report_data: { ... }
└── created_date: timestamp
```

## Import Process Logic

### Step 1: Start Import Batch
- Generate batch_id: "IMP_YYYY-MM-DD_HHMMSS"
- Create import batch record with 'processing' status

### Step 2: Load and Validate CSV
- Parse CSV from OneMap/downloads/
- Validate required fields (property_id mandatory)
- Check CSV structure integrity

### Step 3: Process Each Row
For each property_id in CSV:

**New Record Detection:**
- Query staging collection by property_id
- If not found → New record
  - Insert to staging collection
  - Set first_seen_date = now
  - Set import_batch_id
  - Log to change-history as 'new'
  - Increment new_records_count

**Existing Record Processing:**
- If found → Compare all fields
- If any field changed:
  - Update staging record
  - Increment version
  - Update last_updated_date
  - Log each field change to change-history
  - Increment updated_records_count
- If no changes:
  - Skip processing
  - Increment unchanged_records_count

### Step 4: Generate Reports

**Summary Report (Markdown):**
```markdown
# OneMap Import Report
## Batch ID: IMP_2025-01-22_093045
## Date: 2025-01-22 09:30:45

### Summary
- Total Rows Processed: 5,287
- New Records: 156
- Updated Records: 23
- Unchanged Records: 5,108
- Errors: 0

### New Records Sample
| Property ID | Address | Status | Import Time |
|------------|---------|--------|-------------|
| PROP123456 | 123 Main St | Active | 09:30:45 |

### Field Changes
| Property ID | Field | Old Value | New Value |
|------------|-------|-----------|-----------|
| PROP789012 | status | Pending | Active |
```

**Database Report (JSON):**
```json
{
  "batch_id": "IMP_2025-01-22_093045",
  "summary": {
    "total_processed": 5287,
    "new_records": 156,
    "updated_records": 23,
    "unchanged_records": 5108
  },
  "new_property_ids": ["PROP123456", "PROP123457"],
  "updated_property_ids": ["PROP789012", "PROP789013"],
  "field_changes": [...]
}
```

### Step 5: Complete Batch
- Update batch status to 'completed'
- Save reports to file system
- Log completion metrics

## Implementation Scripts

### Core Scripts
1. **import-onemap-daily.js** - Main orchestrator
2. **process-onemap-changes.js** - Change detection engine
3. **generate-onemap-report.js** - Report generator
4. **validate-onemap-data.js** - Data validator
5. **query-onemap-history.js** - Historical analysis

### Utility Scripts
1. **rollback-import-batch.js** - Revert failed imports
2. **export-staging-data.js** - Export for analysis
3. **cleanup-old-batches.js** - Archive old data

## Key Features

1. **Duplicate Prevention**: Property ID uniqueness enforced at database level
2. **Change Tracking**: Field-level change history with before/after values
3. **Batch Management**: Every import grouped and trackable
4. **Complete Audit Trail**: Full history from first import to latest change
5. **Error Recovery**: Failed imports don't corrupt existing data
6. **Rollback Capability**: Can revert any batch if issues discovered
7. **Performance**: Bulk operations for processing thousands of records efficiently
8. **Broader Entity Tracking** (NEW 2025-07-22): Tracks ALL entities, not just poles

## Tracking Hierarchy (CRITICAL UPDATE 2025-07-22)

The system now uses a **comprehensive tracking hierarchy** to capture ALL entities throughout their lifecycle:

### Tracking Priority Order
1. **Pole Number** → Primary identifier when available (e.g., "LAW.P.B167")
2. **Drop Number** → Used when no pole assigned yet (e.g., "DR1234")
3. **Location Address** → For early stage records (e.g., "74 Market Street")
4. **Property ID** → Last resort for tracking (e.g., "12345")

### Why This Matters
- **Early Stage Records**: Survey requests and initial sign-ups without pole numbers ARE tracked
- **Complete Lifecycle**: From initial address survey to final pole installation
- **No Lost Data**: Every stage of the process is captured, even pre-pole assignment
- **Better Analytics**: Full visibility into the entire installation pipeline

### Implementation Details
```javascript
// Pre-loading structure for all entity types
const trackingStatuses = new Map([
  ["pole:LAW.P.B167", { status: "Permission Approved", date: "2025-06-03", ... }],
  ["drop:DR1234", { status: "Home Sign Up", date: "2025-06-02", ... }],
  ["address:74 Market Street", { status: "Survey Requested", date: "2025-06-01", ... }],
  ["property:12345", { status: "Initial Contact", date: "2025-05-30", ... }]
]);

// Tracking function that checks all entity types
function getTrackingKey(record) {
  if (record.pole_number) return `pole:${record.pole_number}`;
  if (record.drop_number) return `drop:${record.drop_number}`;
  if (record.location_address) return `address:${record.location_address}`;
  return `property:${record.property_id}`;
}
```

### Example Tracking Flow
```
May 30: Property 12345 - "Initial Contact" → Tracked by property ID
June 1: 74 Market St - "Survey Requested" → Tracked by address
June 2: Drop DR1234 - "Home Sign Up" → Tracked by drop number
June 3: Pole LAW.P.B167 - "Permission Approved" → Tracked by pole number
```

This ensures COMPLETE visibility across all workflow stages, not just pole-assigned records.

## Success Metrics

- Import time < 5 minutes for 10,000 records
- Zero duplicate records in staging
- 100% change tracking accuracy
- Reports generated within 30 seconds
- Full audit trail maintained

## Next Steps

1. Review existing OneMap scripts for compatibility
2. Implement core import functionality
3. Add change detection logic
4. Build report generation system
5. Test with sample data
6. Deploy to production
7. Create operational documentation

## Related Documents

- CLAUDE.md - Main project documentation
- OneMap CSV field specifications
- Firestore security rules for OneMap collections
- Import error handling procedures

---

*This document serves as the authoritative guide for the OneMap Import Tracking System implementation.*