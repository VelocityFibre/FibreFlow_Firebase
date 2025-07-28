# Sync Module - Claude Development Notes

## ⚡ CRITICAL INSTRUCTIONS FOR CLAUDE

### 🤖 DO THE WORK - DON'T GIVE TASKS!
**IMPORTANT**: When the user asks for something to be done:
1. **CHECK** if we already have what's needed (service accounts, files, etc.)
2. **PLAN** what needs to be done
3. **ASK** for clarification if needed
4. **DO IT YOURSELF** - Don't write guides or instructions for the user!
5. **Complete the task** - Don't tell the user to do it themselves!

**Examples**:
- ❌ WRONG: "Here's how you can create a service account..."
- ✅ RIGHT: "Let me check if we have a service account and set it up for you."

- ❌ WRONG: "You need to run this command..."
- ✅ RIGHT: "I'll run this command for you now..."

### 👂 LISTEN CLOSELY & CLARIFY
**BEFORE doing anything**:
1. **READ** the user's request carefully - what do they ACTUALLY want?
2. **CLARIFY** if you're unsure before proceeding
3. **CONFIRM** you understand before taking action
4. **DON'T ASSUME** - if unclear, ask!

**Example**:
- User: "Set up the service account"
- Claude: "I'll set up the service account. Just to clarify - do you want me to use an existing service account file or create a new one?"

## 🎯 Module Overview
**Purpose**: Synchronize pole and drop data from vf-onemap-data (staging) to fibreflow-73daf (production)  
**Type**: One-way database sync with conflict detection and human approval  
**Agent**: Use the sync-agent for all sync operations

## 🚨 CRITICAL RULES

### Data Integrity
- **NEVER** sync without running conflict detection first
- **NEVER** auto-resolve conflicts - always require human approval
- **NEVER** sync personal/sensitive data (names, IDs, contacts)
- **ALWAYS** validate pole number uniqueness before sync
- **ALWAYS** enforce max 12 drops per pole limit

### Sync Direction
- **One-way only**: vf-onemap-data → fibreflow-73daf
- **No bidirectional sync**: FibreFlow changes stay in production
- **Preserve production data**: Only update explicitly approved fields

## 📁 Module Structure
```
sync/
├── config/                 # Configuration files
│   ├── field-mappings.json    # Field mapping definitions
│   ├── sync-rules.json        # Business rules for sync
│   └── validation-rules.json  # Data validation rules
├── scripts/                # Executable scripts
│   ├── full-sync.js          # Initial complete sync
│   ├── incremental-sync.js   # Daily change sync
│   ├── detect-conflicts.js   # Conflict detection only
│   └── generate-report.js    # Report generation
├── services/              # Core sync services
│   ├── sync.service.ts       # Main sync orchestrator
│   ├── conflict.service.ts   # Conflict detection
│   └── validation.service.ts # Data validation
├── models/                # TypeScript interfaces
│   ├── sync-config.model.ts  # Configuration types
│   ├── conflict.model.ts     # Conflict types
│   └── report.model.ts       # Report structures
├── reports/               # Generated sync reports
│   └── YYYY-MM-DD/          # Daily report folders
├── tests/                 # Test suites
├── docs/                  # Technical documentation
└── CLAUDE.md             # This file
```

## 🔄 Sync Process Flow

### 1. Daily Sync (2:00 AM)
```javascript
// Automatic trigger
1. Load configurations
2. Authenticate both Firebase projects
3. Detect changes since last sync
4. Run conflict detection
5. Generate pre-sync report
6. Wait for human approval
7. Execute approved syncs
8. Generate post-sync report
```

### 2. Conflict Detection
```javascript
// Types of conflicts detected
- Duplicate pole numbers
- Data mismatches (different values for same pole)
- Invalid relationships (drops → non-existent poles)
- Capacity violations (>12 drops per pole)
- Missing required fields
```

### 3. Human Approval Flow
```javascript
// Review process
1. View conflict report
2. For each conflict:
   - Review staging vs production data
   - Choose resolution (use staging/keep production/skip)
   - Add notes if needed
3. Approve sync execution
4. Monitor sync progress
```

## 📊 Field Mappings

### Essential Fields Only
```javascript
// From 159 available fields, we sync only:
{
  // Identification
  "Pole Number": "poleNumber",
  "Drop Number": "dropNumber",
  
  // Location
  "Latitude": "location.latitude",
  "Longitude": "location.longitude",
  "Location Address": "address",
  
  // Network
  "PONs": "ponNumber",
  "Sections": "zoneNumber",
  "Site": "projectName",
  
  // Status
  "Status": "importStatus",
  "Flow Name Groups": "workflowGroup",
  
  // Relationships
  "Property ID": "propertyId",
  "strtfeat": "connectedToPole",
  
  // Metadata
  "lst_mod_dt": "lastModifiedInOnemap",
  "date_status_changed": "statusChangeDate"
}
```

### Fields NOT Synced
- Personal details (all consent form data)
- Survey responses
- Installation photos
- Sales/marketing data
- Technical specifications
- Audit fields from source

## 🛠️ Common Tasks

### Run Full Sync (First Time)
```bash
cd sync
node scripts/full-sync.js --dry-run  # Test first
node scripts/full-sync.js             # Execute
```

### Run Daily Incremental Sync
```bash
cd sync
node scripts/incremental-sync.js
```

### Check for Conflicts Only
```bash
cd sync
node scripts/detect-conflicts.js > reports/conflicts-$(date +%Y-%m-%d).json
```

### Generate Sync Report
```bash
cd sync
node scripts/generate-report.js --date 2025-01-30
```

## 🚨 Error Handling

### Authentication Errors
```javascript
// Check service account files exist
ls -la sync/config/service-accounts/
// vf-onemap-data-key.json
// fibreflow-73daf-key.json
```

### Common Issues
1. **"Permission denied"** - Check service account has correct roles
2. **"Quota exceeded"** - Batch operations may be too large
3. **"Document not found"** - Pole/drop may have been deleted
4. **"Network error"** - Retry with exponential backoff

## 📈 Performance Targets

- **Sync Duration**: <10 minutes for daily incremental
- **Batch Size**: 500 documents per batch
- **Memory Usage**: <512MB
- **Conflict Detection**: 100% accuracy
- **Success Rate**: >99% for approved syncs

## 🔍 Monitoring & Debugging

### Check Sync Status
```javascript
// View last sync status
cat reports/sync-status.json

// Check sync history
ls -la reports/*/summary.json

// View current conflicts
cat reports/pending-conflicts.json
```

### Debug Mode
```bash
# Enable verbose logging
export SYNC_DEBUG=true
node scripts/incremental-sync.js

# Dry run mode
node scripts/incremental-sync.js --dry-run
```

## 📝 Report Structure

### Pre-Sync Report
```json
{
  "timestamp": "2025-01-30T02:00:00Z",
  "type": "pre-sync",
  "summary": {
    "polesAnalyzed": 5287,
    "dropsAnalyzed": 3456,
    "changesDetected": 216,
    "conflictsFound": 12
  },
  "conflicts": [
    {
      "type": "duplicate",
      "poleNumber": "LAW.P.A123",
      "staging": { /* data */ },
      "production": { /* data */ }
    }
  ]
}
```

### Post-Sync Report
```json
{
  "timestamp": "2025-01-30T09:30:00Z",
  "type": "post-sync",
  "summary": {
    "polesSynced": 204,
    "dropsSynced": 156,
    "conflictsResolved": 12,
    "errors": 0,
    "duration": "8m 34s"
  },
  "details": [ /* ... */ ]
}
```

## 🔐 Security Notes

- Service account keys stored in `sync/config/service-accounts/` (gitignored)
- Never commit credentials to repository
- Use environment variables for sensitive config
- Audit trail maintained for all sync operations
- Read-only access to staging, write access to production

## 🚀 Quick Start for New Developers

1. **Get Service Account Keys**
   ```bash
   # Place in sync/config/service-accounts/
   # vf-onemap-data-key.json (from staging project)
   # fibreflow-73daf-key.json (from production project)
   ```

2. **Install Dependencies**
   ```bash
   cd sync
   npm install
   ```

3. **Run Test Sync**
   ```bash
   npm run test:sync -- --limit 10
   ```

4. **Check Reports**
   ```bash
   ls -la reports/
   ```

## 📚 Related Documentation

- **Approved Plan**: `/docs/plans/approved/DATABASE_SYNC_MODULE_PLAN_APPROVED_2025-01-30.md`
- **Sync Agent**: `/.claude/agents/sync-agent.md`
- **Field Analysis**: Original conversation about CSV fields
- **OneMap System**: `/OneMap/CLAUDE.md`
- **Test Results**: `/sync/SYNC_TEST_RESULTS_2025-01-30.md`
- **User Guide**: `/sync/docs/HOW_TO_USE_SYNC.md`
- **Module README**: `/sync/README.md`

## 🎯 Test Results Summary (2025-01-30)

### What We Accomplished
- ✅ Set up sync module with existing service accounts
- ✅ Created 6 sync scripts (connection, test, sync, verify)
- ✅ Successfully synced 36 poles with 38 status history entries
- ✅ Integrated with status history tracking from 2025-01-29
- ✅ Handled duplicate poles correctly (same pole, different statuses)

### Key Findings
1. **Staging data location**: `vf-onemap-processed-records` (not `poles`)
2. **Duplicate handling**: Creates complete audit trail in statusHistory
3. **Field mappings**: 15+ fields successfully mapped
4. **Performance**: ~10 records/second processing speed

### Example: Status History Working
Pole LAW.P.C654 demonstrates the system:
- 2 records in staging (different statuses)
- Current status: "Pole Permission: Approved"
- History preserved: Both status changes tracked with timestamps

### Ready for Production
- Manual sync scripts ready to use
- Full documentation created
- Service accounts configured
- Status history tracking operational

## 📊 Latest Sync Status (2025-01-31)

### Pre-Sync Report Summary
**Generated**: 2025-01-31 07:22:20 UTC

#### Current Status:
- **Already in production**: 36 poles
- **Total in staging**: 200 records analyzed
- **Ready to sync**: 100 unique poles (103 records)

#### What Will Be Synced:
- **Unique poles**: 100
- **Total records**: 103 (includes status history)
- **Skipped - Already synced**: 39 records
- **Skipped - No pole number**: 58 records

#### Status Distribution:
- **Pole Permission: Approved**: 102 records
- **Home Installation: In Progress**: 1 record

#### Top Agents (by record count):
1. nathan: 28 records
2. Adrian: 14 records
3. marnu: 13 records
4. marchael: 13 records
5. Pieter: 12 records

#### Recommendations:
- ✅ **Proceed with sync**: YES
- ✅ **Review conflicts first**: NO
- **Estimated duration**: 10 seconds

### Available Scripts:
1. **`create-pre-sync-report.js`** - Shows what WILL be synced (latest report generated)
2. **`prepare-next-sync.js`** - Quick check of sync readiness
3. **`sync-with-status-history.js`** - Execute the actual sync

### How to Run Next Sync:
```bash
# 1. Review the pre-sync report (already generated)
cat sync/reports/pre-sync-report-1753946540846.json

# 2. If approved, run the sync
cd sync
node scripts/sync-with-status-history.js

# 3. Verify results
node scripts/verify-production-sync.js
```

## 🚨 CRITICAL DECISION: DATA SYNC STRATEGY (2025-01-31)

### ❌ RECOMMENDATION: DO NOT SYNC ONEMAP DATA TO PRODUCTION

**Decision**: Keep OneMap historical data in staging only (vf-onemap-data)

**Rationale**:
- **Purpose mismatch**: OneMap = historical records, FibreFlow = active work
- **Performance impact**: Would double production database size (7,247 → ~12,000 records)
- **Cost concerns**: Higher Firestore read costs, slower queries
- **Data quality**: Many records missing pole numbers, not relevant to operations

**Strategy**: 
- Use staging as data warehouse for historical OneMap data
- Only sync specific poles when they become part of active FibreFlow projects
- Create reporting tools that query staging directly

**Documentation**: See `/OneMap/DATA_SYNC_STRATEGY_2025-01-31.md` for full analysis

### Module Status: PAUSED PENDING SELECTIVE SYNC REQUIREMENTS

## ⚠️ Important Notes

1. **This is NOT the OneMap import system** - that handles CSV → staging
2. **This syncs staging → production** - different purpose  
3. **Current recommendation**: DO NOT use for bulk OneMap sync
4. **Future use**: Selective sync for active project poles only
5. **No UI included** - command line and reports only
6. **Manual approval required** - no fully automated sync
7. **One-way sync only** - no bidirectional updates

---

*Last Updated: 2025-01-30*