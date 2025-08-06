# Cross-Reference Verification Strategy

## Overview
A multi-layered verification system to ensure database integrity matches CSV source files.

## Verification Methods

### 1. **Real-Time Import Verification**
During import, the script already shows:
- Status changes detected
- New vs updated records
- Import statistics

### 2. **Post-Import Spot Checks**
```bash
# Check specific properties
node scripts/verification/spot-check-property.js 308025
node scripts/verification/spot-check-property.js 291411
```

### 3. **Batch Verification**
```bash
# Verify sample or all properties
node scripts/verification/cross-reference-system.js

# Check specific properties
node scripts/verification/cross-reference-system.js . "308025,291411,292578"
```

### 4. **Status Change Reports**
The system tracks:
- **CSV Timeline**: Exact status at each date
- **Database History**: Recorded status changes
- **Comparison**: Ensures they match

## Verification Points

### A. **Count Verification**
- Total properties in CSV vs Database
- Status changes per property
- Properties with/without changes

### B. **Sequence Verification**
- Status progression matches chronologically
- No backwards progressions
- No phantom changes

### C. **Current State Verification**
- Final status in database matches last CSV appearance
- All fields properly updated

## Automated Checks

### During Import
```
📝 Status change - Property 308025: In Progress → Scheduled
🆕 New property 291411: Approved
➖ Property 292578: No change (still Scheduled)
```

### After Import
```bash
# Run verification
node scripts/verification/cross-reference-system.js

# Output:
✅ 308025: All status changes match CSV source
✅ 291411: All status changes match CSV source
❌ 292578: Database has 3 changes, CSV shows 2
```

## Red Flags to Watch For

1. **More changes in DB than CSV** → Phantom changes
2. **Status regression** → Data corruption
3. **Missing properties** → Import failure
4. **Current status mismatch** → Latest update failed

## Verification Workflow

### After Each Import Batch:
1. Note the import statistics
2. Spot check 5-10 properties mentioned in logs
3. Run batch verification on sample
4. If issues found, investigate before continuing

### Daily Verification:
1. Run full verification on all properties
2. Generate verification report
3. Address any mismatches
4. Document findings

## Success Criteria

✅ **Perfect Import** when:
- All properties present
- Status history matches CSV timeline
- No phantom changes
- Current status accurate
- No backwards progressions

## Quick Commands

```bash
# After importing May files
node scripts/verification/spot-check-property.js 308025

# After importing June files  
node scripts/verification/cross-reference-system.js

# Check specific suspicious properties
node scripts/verification/spot-check-property.js 307935
node scripts/verification/spot-check-property.js 308220

# Generate full report
node scripts/verification/cross-reference-system.js > verification-report.txt
```

## Recovery Process

If verification fails:
1. **Identify** affected properties
2. **Clear** those specific records
3. **Re-import** affected CSV files
4. **Re-verify** until clean

## The Bottom Line

With this verification system:
- **Every import is validated**
- **Any discrepancy is caught**
- **Source of truth (CSV) is preserved**
- **Database integrity is guaranteed**

No more phantom changes, no more data corruption!