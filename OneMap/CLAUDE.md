# OneMap Module - Context Engineering Document

## Quick Start for Claude

**Philosophy**: First principles thinking. Understand the problem completely before solving.

**Essential Commands**:
- `python3 analyze_duplicates.py` - Original duplicate analysis
- `python3 reanalyze_with_workflow.py` - Workflow-aware analysis
- `python3 validate_analysis.py` - antiHall validation
- `python3 analyze_gps_duplicates.py` - GPS-based duplicate detection (PRIMARY)
- `python3 split_large_csv.py` - Split large files for processing

**Current Status**: Business context understood, implementing GPS-based payment verification

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

### In Progress
- [ ] GPS-based duplicate analysis script
- [ ] Payment verification reports
- [ ] Agent accountability tracking

### Future Actions
- [ ] Create OneMap module in FibreFlow
- [ ] Implement real-time duplicate prevention
- [ ] Automated payment verification system

---

## File Organization

```
OneMap/
├── CLAUDE.md (this file)
├── Raw Data/
│   ├── Lawley_Project_Louis.csv (original)
│   └── Lawley_Essential.csv (filtered)
├── Analysis/
│   ├── analyze_duplicates.py
│   ├── reanalyze_with_workflow.py
│   └── validate_analysis.py
├── Reports/
│   ├── REANALYSIS_SUMMARY.md (latest findings)
│   ├── WORKFLOW_REANALYSIS_REPORT.md
│   └── POLE_DUPLICATE_ANALYSIS.md
├── Tools/
│   ├── split_large_csv.py
│   └── filter_essential_columns.py
└── split_data/ (chunked files)
```

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

*Last Updated: 2025-01-09*
*Status: Analysis Complete, Awaiting Design Approval*