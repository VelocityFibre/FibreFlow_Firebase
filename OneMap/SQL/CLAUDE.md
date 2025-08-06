# OneMap SQL Analytics - CLAUDE Development Notes
*Last Updated: 2025-08-06*

## 🚨 CRITICAL: Snapshot-Based Change Tracking (Updated 2025-08-06)

### Key Architectural Decision
**SNAPSHOT APPROACH**: Each daily Excel export represents a complete system state snapshot.
- **NOT individual change events** with timestamps
- **Compare daily snapshots** to detect changes (like DuckDB)
- More reliable than status_date tracking (many records have NULL dates)

### Key Requirement
**MUST track changes between daily snapshots**. Each daily export contains:
1. Complete system state as of that date
2. All properties regardless of when they last changed
3. Comparison with previous day reveals actual changes

### Snapshot Tracking Strategy (NEW)
- **DO** import each daily file as complete snapshot with day label
- **DO** compare consecutive day snapshots to detect changes
- **DO** create snapshot_changes table for detected differences
- **DO** maintain audit trail of all snapshot comparisons

### Database Structure (Updated)
```sql
-- Daily snapshots table
CREATE TABLE daily_snapshots (
  id INTEGER PRIMARY KEY,
  property_id TEXT,
  snapshot_date DATE,     -- Aug-01, Aug-02, etc.
  pole_number TEXT,
  status TEXT,
  agent TEXT,
  -- ... all other fields
  UNIQUE(property_id, snapshot_date)
);

-- Detected changes between snapshots  
CREATE TABLE snapshot_changes (
  id INTEGER PRIMARY KEY,
  property_id TEXT,
  from_date DATE,
  to_date DATE, 
  old_status TEXT,
  new_status TEXT,
  change_type TEXT,      -- 'status_change', 'new_property', 'data_update'
  detected_at TIMESTAMP
);
```

## 📊 Data Processing Workflow

### 1. Pre-Import Analysis (ALWAYS DO FIRST)
```bash
# Copy new file from Downloads
cp ~/Downloads/[filename].xlsx OneMap/SQL/data/excel/

# Analyze BEFORE importing
node scripts/analyze-before-import.js [filename]
```

### 2. Column Mapping Requirements
**Critical Fields for Status Tracking:**
- `Property ID` → `property_id` (unique identifier)
- `Pole Number` → `pole_number`
- `Drop Number` → `drop_number`
- `Status` → `status`
- `date_status_changed` → `status_date`
- `lst_mod_dt` → `last_modified_date`
- Agent fields → `agent` (first non-null value)
- `Location Address` → `address`

### 3. Duplicate Prevention
- Primary key: Combination of `property_id` + `status` + `status_date`
- If same property + same status + same date = duplicate (skip)
- If same property + different status = status change (track)
- If same property + same status + different date = track as confirmation

### 4. Status History Tracking
Need to create `status_history` table:
```sql
CREATE TABLE status_history (
  id INTEGER PRIMARY KEY,
  property_id TEXT,
  pole_number TEXT,
  old_status TEXT,
  new_status TEXT,
  change_date DATETIME,
  import_date DATETIME,
  import_file TEXT,
  agent TEXT
);
```

## 📁 File Processing Log

### 2025-08-06: Initial Setup
1. **File**: `1754473447790_Lawley_01082025.xlsx`
   - Records: 13,656
   - Unique Poles: 3,800
   - Unique Drops: 7,828
   - Date Range: April 24 - August 1, 2025
   - Status: ✅ Imported

2. **File**: `1754473537620_Lawley_02082025.xlsx`
   - Status: 🔄 Pending analysis
   - Expected: Contains August 2 data
   - Action: Analyze for changes before import

## ⚠️ Known Issues & Fixes

### Column Mapping
- **Issue**: Initial import had NULL dates/agents/addresses
- **Fix**: Updated `excel-importer.js` with proper mappings
- **Verification**: Re-imported with correct mappings

### Critical Findings
- **1,746 Home Installations without Home SignUps**
- Clustered in specific streets (MAHLANGU STREET)
- Process gap: Installations happening without signups

## 🔧 SQL Queries for Status Tracking

### Find Status Changes
```sql
-- Compare two imports
WITH yesterday AS (
  SELECT property_id, status 
  FROM status_changes 
  WHERE import_batch_id = 'batch1'
),
today AS (
  SELECT property_id, status 
  FROM status_changes 
  WHERE import_batch_id = 'batch2'
)
SELECT 
  t.property_id,
  y.status as old_status,
  t.status as new_status
FROM today t
JOIN yesterday y ON t.property_id = y.property_id
WHERE t.status != y.status;
```

### Track Installation Progress
```sql
-- Properties that moved from SignUp to Installation
SELECT property_id, 
       MIN(CASE WHEN status LIKE '%Sign Up%' THEN status_date END) as signup_date,
       MIN(CASE WHEN status LIKE '%Installation%' THEN status_date END) as install_date
FROM status_changes
GROUP BY property_id
HAVING signup_date IS NOT NULL AND install_date IS NOT NULL;
```

## 📋 Daily Import Checklist

- [ ] Copy file from Downloads to `data/excel/`
- [ ] Run pre-import analysis
- [ ] Check for duplicate records
- [ ] Identify status changes
- [ ] Review new properties
- [ ] Import with change tracking
- [ ] Generate comparison report
- [ ] Update audit log
- [ ] Export changes summary

## 🚀 Quick Commands

```bash
# Analyze before import
node scripts/analyze-before-import.js filename.xlsx

# Import with change tracking
node scripts/import-with-tracking.js filename.xlsx

# Detect and report anomalies
node scripts/detect-anomalies.js
node scripts/detect-anomalies.js --export  # Generate Excel report

# Generate daily report
node scripts/generate-daily-report.js

# Check status changes
node scripts/check-status-changes.js
```

## 🚨 Anomaly Detection System

### Tracked Anomalies
1. **Status Reverts** - Going backwards in process
   - Installed → In Progress (HIGH severity)
   - Approved → Pending (MEDIUM severity)
   
2. **Bypassed Approvals** - Skipping required steps
   - Declined → In Progress (CRITICAL severity)
   - No Signup → Installation (HIGH severity)
   
3. **Impossible Transitions** - Invalid status changes
   - Pending → Installed (HIGH severity)
   - Declined → Installed (CRITICAL severity)

### Anomaly Tables
- `status_anomalies` - All detected anomalies
- `anomaly_rules` - Detection rules
- `anomaly_summary` - Summary view
- `recent_anomalies` - Unresolved issues

### 📊 Status Revert Reporting (NEW - 2025-08-06)
**Dedicated report for backwards status progressions**
- **Script**: `generate-status-revert-report.js`
- **Data Source**: SQL database (NOT Excel files)
- **Output**: Markdown report + CSV export
- **Tracks**: All instances where status moves backwards in workflow
- **Severity Levels**: Critical (4+ levels), High (3), Medium (2), Low (1)

**To generate report after each import**:
```bash
node scripts/generate-status-revert-report.js
```

**Report includes**:
- Property details (ID, pole, drop, address)
- Status change details (old → new)
- Severity assessment
- Impact analysis
- Recommended actions
- Agent responsible

## 📈 Metrics to Track

1. **Daily New Properties**
2. **Status Change Count**
3. **Installation Progress Rate**
4. **Properties Missing SignUps**
5. **Agent Performance**
6. **Geographic Distribution**

## 🔄 Status Flow Tracking

Expected status progression:
1. `Pole Permission: Pending` → `Pole Permission: Approved`
2. `Home Sign Ups: Pending` → `Home Sign Ups: Approved`
3. `Home Sign Ups: Approved` → `Home Installation: In Progress`
4. `Home Installation: In Progress` → `Home Installation: Installed`

## 📝 Notes for Future Processing

1. **Always analyze before importing** - prevents data corruption
2. **Track all status changes** - critical for reporting
3. **Maintain import history** - for rollback capability
4. **Document anomalies** - like installations without signups
5. **Regular backups** - before each import

---
*This document is critical for maintaining data integrity in the OneMap SQL system*