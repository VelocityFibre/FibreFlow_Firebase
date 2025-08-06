# OneMap Module - Context Engineering Document

## ⚡ CRITICAL INSTRUCTIONS FOR CLAUDE

### 📁 DOCUMENT PLACEMENT RULE (CRITICAL - 2025-08-05)
**NEVER place documentation files in root folders!**
- ✅ ALWAYS place docs in the `/docs/` subfolder
- ✅ For OneMap: use `/OneMap/docs/`
- ✅ For sync: use `/sync/docs/`
- ❌ NEVER put .md files in root directories
- The user has repeatedly stated this preference!

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

## Quick Start for Claude

**Philosophy**: First principles thinking. Understand the problem completely before solving.

## 📁 ORGANIZED SCRIPT STRUCTURE

### 🎯 PRIMARY WORKFLOW COMMANDS

#### CSV Processing (Local Operations)
```bash
cd scripts/csv-processing/
node split-csv-by-pole.js "large-file.csv"     # Split large CSV
node compare-split-csvs.js "day1.csv" "day2.csv"  # Compare files
node validate-csv-structure.js "file.csv"      # Validate format
```

#### Firebase Import (CSV → Database)
```bash
cd scripts/firebase-import/
node bulk-import-with-photo-tracking.js "downloads/filename.csv"  # PRIMARY IMPORT SCRIPT (with photo quality tracking)
node bulk-import-with-history.js "downloads/filename.csv"         # Alternative: Basic import (no photo tracking)
node sync-to-production.js --batch-id IMP_123456789               # Sync to production
```

**📸 PHOTO TRACKING ENHANCEMENT (Added 2025-07-31)**:
The primary import script now includes comprehensive photo quality tracking:
- Tracks which specific poles have photos (e.g., LAW.P.B167 → photo ID 1732480)
- Identifies poles missing photos (critical for payment verification)
- Generates 3 reports: summary trends, per-pole details, critical missing photos
- Current baseline: 26.3% overall, 0% completed installations have photos ⚠️
- See `photos/PHOTO_QUALITY_TRACKING_MISSION.md` for full details

#### Reporting (Database → Reports)
```bash
cd scripts/reporting/
node generate-firebase-report.js              # Database summary
node detect-changes-firebase.js --since "2025-01-30"  # Change detection
node generate-pole-report-firebase.js "LAW.P.C123"    # Pole analysis
```

#### Analysis Tools (Python)
```bash
cd scripts/data_analysis/
python3 analyze_duplicates.py                 # Find duplicates
python3 reanalyze_with_workflow.py           # Workflow analysis

cd scripts/payment_verification/
python3 analyze_gps_duplicates.py            # GPS-based duplicates
python3 run_payment_verification.py          # Payment validation
```

### 🔄 COMPLETE WORKFLOW

```
1. Raw CSV File
   ↓
2. [Optional] CSV Processing (scripts/csv-processing/)
   ↓
3. Firebase Import (scripts/firebase-import/bulk-import-with-history.js)
   ↓
4. Generate Reports (scripts/reporting/generate-firebase-report.js)
   ↓
5. Cross-Reference Validation (Compare CSV vs Firebase)
   ↓
6. Sync to Production (scripts/firebase-import/sync-to-production.js)
```

**Current Status**: ✅ June 23 imported (12,667 records), ✅ **STAGING-ONLY STRATEGY APPROVED**

## 🚨 CRITICAL STRATEGY DECISION (2025-01-31)

### ❌ DO NOT SYNC TO PRODUCTION  
**Decision**: Keep OneMap data in staging (vf-onemap-data) only

**Why**: 
- Historical data vs active work mismatch
- Would double production database size
- Performance and cost concerns
- Most data not relevant to operations

**See**: `/OneMap/DATA_SYNC_STRATEGY_2025-01-31.md` for full analysis

## 🎯 SCRIPT ORGANIZATION COMPLETED (2025-01-31)
**Status**: ✅ FIXED - All 82+ scripts properly organized into directories
**Summary**: See `ORGANIZATION_COMPLETE_2025-01-31.md` for full details
**Key Fix**: Use `scripts/firebase-import/bulk-import-with-history.js` for imports (not basic script)

---

## Module Overview

### OneMap - Agent Payment Verification System

**Purpose**: Prevent duplicate payments to agents for pole permissions in fiber optic projects

**Business Context**: 
- Velocity Fibre installs fiber poles based on client-provided CSV data
- Client agents get permissions from homeowners at different addresses
- Agents are paid per pole permission obtained
- **Critical**: Must eliminate duplicate payment claims for the same pole

**Environment**: High-density informal settlements where:
- Street addresses are unreliable/informal
- GPS coordinates are the only reliable location data
- Multiple agents may claim the same pole

**Current Challenge**: 
- 1,811 poles (48%) appear at multiple locations (potential duplicate claims)
- 63% of records missing field agent names (can't verify who to pay)
- Need to verify legitimate claims before processing payments

**Tech Stack** (Inherited from FibreFlow):
- Frontend: Angular 20+ with Material Design
- Backend: Firebase/Firestore
- Analysis: Python scripts for data processing
- Version Control: jj (Jujutsu)

---

## antiHall Integration

### Validation Approach
Always validate claims with actual data before making statements.

**Current Validations**:
- ✓ Total records: 14,579 (verified)
- ✓ Unique properties: 14,579 (verified) 
- ✓ Duplicate poles: 1,811 at multiple addresses (verified)
- ✓ Workflow tracking via Flow Name Groups (verified)

### Tracking Hierarchy (CRITICAL UPDATE 2025-07-22)
The system now uses a **broader tracking hierarchy** to capture ALL entities, not just poles:

**Tracking Priority Order**:
1. **Pole Number** → Primary identifier when available (e.g., "LAW.P.B167")
2. **Drop Number** → Used when no pole assigned yet (e.g., "DR1234")
3. **Location Address** → For early stage records (e.g., "74 Market Street")
4. **Property ID** → Last resort for tracking (e.g., "12345")

**What This Means**:
- ✅ Early stage records WITHOUT poles ARE tracked
- ✅ Home sign-ups without pole numbers ARE included
- ✅ Survey requests at addresses ARE counted
- ✅ ALL workflow stages are captured, not just pole-assigned ones

**Example Tracking**:
```
June 1: Address "74 Market St" - "Survey Requested" ✅ Counted (tracked by address)
June 2: Drop DR1234 - "Home Sign Up" ✅ Counted (tracked by drop)
June 3: Pole LAW.P.B167 - "Permission Approved" ✅ Counted (tracked by pole)
```

**Pre-loading Structure**:
```javascript
trackingStatuses = new Map([
  ["pole:LAW.P.B167", { status, date, ... }],
  ["drop:DR1234", { status, date, ... }],
  ["address:74 Market Street", { status, date, ... }],
  ["property:12345", { status, date, ... }]
]);
```

### Key Scripts
1. `validate_analysis.py` - Validates all analysis claims
2. `analyze_and_export_complete.py` - Complete analysis with antiHall validation
3. `identify_true_duplicates.py` - Simple first-principles duplicate detection
4. `export_pole_conflicts.py` - Enhanced export with status tracking

### Validation Files Generated
- `antiHall_validation_proof.json` - Evidence for all claims
- `POLE_CONFLICT_MANAGEMENT_REPORT.md` - Main analysis report
- `field_verification_priority.csv` - For field teams

**Before ANY claim**: Run validation and check actual data

---

## Context Engineering

### Understanding the Data

**What Each Row Represents**:
- NOT a duplicate entry
- A workflow status update
- Part of installation lifecycle tracking

**Key Fields**:
- `Property ID`: Unique identifier (always unique)
- `Location Address`: Physical address (may have many properties)
- `Pole Number`: Infrastructure identifier (should be at ONE location only)
- `Flow Name Groups`: Cumulative workflow history
- `Status`: Current status in workflow

### Workflow Progression
```
1. Pole Permission: Approved
2. Home Sign Ups: Approved & Installation Scheduled  
3. Home Installation: In Progress
4. Home Installation: Installed
```

---

## Current Analysis Results

### ✅ What's Working
- Workflow tracking system functioning correctly
- All Property IDs are unique
- Audit trail maintained via Flow Name Groups

### ❌ Issues Identified

1. **Pole Location Conflicts**
   - 1,811 poles at multiple addresses
   - Example: LAW.P.D721 at 7 different locations

2. **Data Entry Issues**
   - "1 KWENA STREET": 662 entries - needs verification
   - 21 bulk entries at exact timestamps
   - 63% missing field agent names

### ❓ Needs Clarification
- Is "1 KWENA STREET" a large complex or data entry location?
- Are poles being reused/renumbered?
- Why are field agent names missing?

---

## Solution Approach

### Core Principle: GPS-Based Verification
- **IGNORE** address fields (unreliable in informal settlements)
- **USE** GPS coordinates as primary location identifier
- **FOCUS** on pole number + GPS to identify true duplicates

### Payment Verification Process
1. **Identify** all pole permissions by pole number
2. **Check** if multiple agents claim the same pole
3. **Verify** using GPS coordinates (not addresses)
4. **Flag** HIGH RISK cases for manual review
5. **Generate** reports for payment processing

### Key Analysis Outputs
- List of poles with multiple agent claims
- Agent names, dates, and GPS locations
- Risk assessment (HIGH/MEDIUM/LOW)
- Payment hold recommendations

## Solution Design Status

### Completed Analysis
- [x] Understand duplicate patterns
- [x] Identify workflow vs true duplicates  
- [x] Validate findings with antiHall
- [x] Create comprehensive reports
- [x] Understand business context (agent payments)
- [x] Identify GPS as reliable location source

### NEW: 1Map to FibreFlow Sync System (2025-07-21)
- [x] Import tracking system implemented
- [x] Complete CSV import (746 records) to Firebase staging
- [x] Data quality analysis (90/100 score)
- [x] Field mapping research and validation
- [x] Production sync script prepared

### Current Import Status: Lawley May Week 3 (2025-07-21)
- **Source**: `Lawley May Week 3 22052025 - First Report.csv`
- **Total Records**: 746 (100% imported to staging)
- **Ready for Production**: 543 records (have pole numbers)
- **Issues**: 203 missing pole numbers, 27 duplicate poles, 269 missing agents
- **Quality Score**: 90/100 🟢 Excellent
- **Directory**: `imports/2025-07-21_Lawley_May_Week3/`

### In Progress
- [ ] Production sync (543 records ready)
- [ ] Duplicate pole investigation
- [ ] Missing data resolution

### Future Actions
- [ ] Create OneMap module in FibreFlow UI
- [ ] Implement real-time duplicate prevention
- [ ] Automated payment verification system

---

## File Organization

```
OneMap/
├── CLAUDE.md (this file)
├── docs/                              # All documentation
│   ├── INDEX.md                      # Documentation index (NEW 2025-08-05)
│   ├── DATA_INTEGRITY_RESOLUTION_2025-08-05.md  # Main summary report
│   ├── VERIFICATION_STRATEGY_2025-08-05.md      # Cross-reference system
│   ├── FIXED_SCRIPT_READY_2025-08-05.md         # Import script docs
│   ├── GOOGLE_DRIVE_LOCATION.md      # Cloud storage info
│   ├── 1MAP_SYNC_ARCHITECTURE.md     # System design
│   ├── MAPPING_REVIEW_VS_LIVE_DB.md  # Field mappings
│   └── [30+ Analysis & Technical docs]
├── imports/                           # Import Tracking System
│   ├── INDEX.md                      # Master tracking index
│   └── 2025-07-21_Lawley_May_Week3/  # Current import
│       ├── IMPORT_MANIFEST.json      # Complete metadata
│       ├── README.md                 # Quick overview
│       ├── source/                   # Original CSV
│       ├── reports/                  # All 5 import reports
│       ├── scripts/                  # Processing scripts
│       └── logs/                     # Processing logs
├── downloads/                         # Original CSV downloads
│   └── Lawley May Week 3 22052025 - First Report.csv
├── Analysis/                          # Python analysis scripts
│   ├── analyze_duplicates.py
│   ├── reanalyze_with_workflow.py
│   └── validate_analysis.py
├── reports/                           # Generated reports
├── scripts/                           # Processing scripts
│   ├── process-1map-sync-simple.js   # CSV to staging
│   ├── complete-import-batch.js      # Batch completion
│   └── sync-to-production.js         # Production sync
└── split_data/                        # Chunked files
```

## 📍 Google Drive Location
**URL**: https://drive.google.com/drive/u/1/folders/1NzpzLYIvTLaSD--RdhRDQLfktCuHD-W3  
**Details**: See `docs/GOOGLE_DRIVE_LOCATION.md`

---

## Development Guidelines

### 1. First Principles
- Understand the problem completely
- Validate every assumption
- Ask for clarification when needed

### 2. antiHall Process
```python
# Before making any claim
claim = "1,811 poles at multiple locations"
validation = validate_with_data(claim)
if validation.verified:
    report_finding(claim, validation.evidence)
else:
    investigate_further()
```

### 3. Context Updates
When discovering new information:
1. Update this CLAUDE.md
2. Run validation scripts
3. Document in appropriate report

---

## Next Steps

1. **Immediate**: 
   - Await client clarification on "1 KWENA STREET"
   - Export pole conflict list for field verification

2. **Design Phase**:
   - Create pole registry system design
   - Plan OneMap integration with FibreFlow
   - Design validation rules

3. **Implementation**:
   - Start with pole location validation
   - Add to existing Pole Tracker module
   - Implement real-time checks

---

## Important Notes

- Each row is a workflow update, NOT a duplicate
- Flow Name Groups contains complete history
- Focus on pole location conflicts (real issue)
- Keep all records for audit trail

---

---

## Import Tracking System Usage

### For Current Import (2025-07-21):
```bash
# View current status
cat imports/INDEX.md

# Check specific import details
cd imports/2025-07-21_Lawley_May_Week3/
cat README.md
cat IMPORT_MANIFEST.json

# Re-run scripts if needed
node scripts/sync-to-production.js --dry-run
```

### For Future Imports:
1. Each new CSV gets its own dated directory
2. All reports automatically linked to source
3. Scripts preserved for reproducibility
4. Issues tracked from start to finish

---

*Last Updated: 2025-07-23*
*Status: ✅ CSV Processing Breakthrough - 100-1000x Performance Improvement*

> **📍 MAJOR UPDATE (2025-07-23)**: Discovered CSV-first processing beats Firebase by 100-1000x. 
> The 4 scripts created today (`split-csv-by-pole.js`, `compare-split-csvs.js`, 
> `process-split-chronologically.js`, `fix-csv-parsing.js`) are now the PRIMARY processing method.
> See `BREAKTHROUGH_NOTE_2025-07-23.md` for details.

---

## 🚀 NEW DEVELOPMENT PLAN (2025-07-23) - Direct Firebase Import Strategy

### Voice Note Summary from Kobus Discussion
**Key Insight**: Import problems were due to pre-processing attempts, not Firebase limitations. Solution is to import raw data first, then process in database.

📋 **Full Implementation Details**: See [`FIREBASE_IMPORT_DEVELOPMENT_PLAN.md`](./FIREBASE_IMPORT_DEVELOPMENT_PLAN.md) for complete technical specifications, code examples, and step-by-step setup instructions.

### Implementation Plan

#### 1. **Create Separate Firebase Database**
- **Database Name**: VF (Velocity Fibre)
- **Purpose**: Dedicated database for OneMap imports
- **Status**: To be implemented

#### 2. **Import Strategy (Changed Approach)**
**Old**: Pre-process → Import → Fail/Timeout
**New**: Import Raw → Process in Database → Success

**Steps**:
1. Upload CSV to Firebase Storage (not local)
2. Import directly from Storage to Firestore
3. Use Property ID (unique) for deduplication
4. Process/clean data AFTER it's in database

#### 3. **Google Tasks Setup**
- **When Needed**: For imports > 60 seconds
- **Purpose**: Handle long-running import operations
- **Alternative**: Direct uploads may not need this

#### 4. **Google Cloud CLI Integration**
- Install gcloud CLI for easier management
- Use for BigQuery operations
- Manage Firebase Storage uploads

#### 5. **BigQuery Setup (Parallel Track)**
- **Purpose**: Advanced analytics on imported data
- **Benefits**: SQL queries, data cleaning, aggregations
- **Integration**: Import to Firestore → Export to BigQuery

#### 6. **Firebase Storage Workflow**
**New Standard Process**:
```bash
# 1. Upload CSV to Firebase Storage
gsutil cp downloads/*.csv gs://vf-onemap-imports/

# 2. Import from Storage to Firestore
# (Script to be created)

# 3. No more local imports!
```

### Technical Architecture

```
Local CSV Files
    ↓
Firebase Storage (gs://vf-onemap-imports/)
    ↓
Cloud Function / Direct Import
    ↓
Firestore Database (VF)
    ↓
BigQuery (for analytics)
```

### Action Items
- [ ] Set up VF Firebase project/database
- [ ] Configure Firebase Storage bucket
- [ ] Create Storage → Firestore import function
- [ ] Install and configure gcloud CLI
- [ ] Set up BigQuery dataset
- [ ] Update all import scripts for new workflow
- [ ] Test with first CSV (earliest by date)

### Benefits of New Approach
1. **No Timeouts**: Storage → Firestore is server-side
2. **Scalable**: Handles any file size
3. **Reliable**: Using Google's infrastructure
4. **Analytics Ready**: Direct BigQuery integration
5. **Simple**: Import first, process later

---