# FibreFlow Sync Module

## 🚨 CRITICAL UPDATE - August 4, 2025

### NEW SYNC STRATEGY: Full Status History Tracking
- **USE**: `sync-full-status-history-v2.js` ✅
- **DO NOT USE**: Old scripts (archived) ❌
- **See**: `docs/SYNC_STRATEGY_UPDATE_2025-08-04.md` for details

### What Changed:
- **Before**: Only synced "Approved" status (snapshot)
- **Now**: Syncs ALL status changes from approval onwards (full timeline)
- **Benefit**: Complete lifecycle visibility in production

## Overview

This module synchronizes pole and drop data from the `vf-onemap-data` staging database to the `fibreflow-73daf` production database with COMPLETE status history tracking from approval through installation.

## Quick Start

### 1. Test Full History Sync (3 poles)
```bash
cd sync
node scripts/test-full-history-sync-v2.js
```

### 2. Run Full Status History Sync
```bash
# This syncs ALL 2,806 approved poles with complete history
node scripts/sync-full-status-history-v2.js
```

### 3. Monitor Progress
```bash
# In another terminal
node scripts/monitor-sync.js
```

### 4. Verify Results
```bash
node scripts/verify-all-approved-synced.js
```

## How It Works

### Data Flow
```
vf-onemap-data                    →  Sync Module  →     fibreflow-73daf
(Staging Database)                   (This Module)      (Production Database)
└─ vf-onemap-processed-records                          └─ planned-poles
                                                        └─ statusHistory
```

### Key Features

1. **One-way Sync**: Staging → Production only
2. **Manual Operation**: No automatic scheduling (by design)
3. **Status History**: Preserves all status changes for audit trail
4. **Conflict Detection**: Identifies duplicate poles before syncing
5. **Comprehensive Reporting**: Detailed logs and JSON reports

## Field Mappings

The sync maps fields from staging to production:

| Staging Field | Production Field | Description |
|--------------|------------------|-------------|
| poleNumber | poleNumber | Unique pole identifier |
| latitude | location.latitude | GPS latitude |
| longitude | location.longitude | GPS longitude |
| locationAddress | address | Physical address |
| pons | ponNumber | PON number |
| sections | zoneNumber | Zone number |
| site | projectName | Project name |
| status | importStatus | Current status |
| flowNameGroups | workflowGroup | Workflow groups |
| propertyId | propertyId | Property identifier |
| dropNumber | dropNumber | Drop number |
| fieldAgentName | fieldAgent | Field agent name |

## Status History Tracking

When multiple records exist for the same pole (different statuses), the system:
1. Uses the latest record as the current state
2. Creates status history entries for ALL records
3. Preserves complete audit trail

Example:
```
Pole LAW.P.C654:
- Current: "Pole Permission: Approved"
- History:
  - 2025-04-24: "Pole Permission: Approved" (Agent: wian)
  - 2025-04-25: "Home Installation: Declined"
```

## Scripts Reference

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-connection.js` | Verify database access | `npm run test:connection` |
| `test-sync-corrected.js` | Test with 5 records | `node scripts/test-sync-corrected.js` |
| `sync-with-status-history.js` | Sync with history tracking | `node scripts/sync-with-status-history.js` |
| `verify-sync.js` | Check synced data | `node scripts/verify-sync.js` |
| `verify-status-history.js` | Check status history | `node scripts/verify-status-history.js` |
| `check-staging-collections.js` | Explore staging DB | `node scripts/check-staging-collections.js` |

### Configuration Files

| File | Purpose |
|------|---------|
| `config/field-mappings.json` | Basic field mappings |
| `config/enhanced-field-mappings.json` | Extended mappings with history |
| `config/sync-rules.json` | Sync behavior configuration |
| `config/service-accounts/` | Firebase credentials (gitignored) |

## Reports

Sync reports are saved to `sync/reports/` with timestamps:
- `test-sync-[timestamp].json` - Basic sync results
- `sync-history-[timestamp].json` - Sync with history details

## Troubleshooting

### No Data in Staging
- Check collection name: `vf-onemap-processed-records` (not `poles`)
- Verify OneMap imports are running

### Authentication Errors
- Ensure service account files exist in `config/service-accounts/`
- Check file permissions

### Missing Pole Numbers
- Some records may not have pole numbers assigned
- These are skipped during sync

## Test Results Summary (2025-01-30)

✅ **Successfully tested with:**
- 36 poles synced
- 38 status history entries created
- 2 poles with multiple status records handled correctly
- Full audit trail preserved

## Next Steps

1. **Full Sync**: When ready, modify batch size in scripts for complete sync
2. **Conflict Resolution**: Build UI for manual conflict review
3. **Monitoring**: Create dashboard for sync statistics
4. **Automation**: Add scheduling when process is stable

## Security Notes

- Service accounts are gitignored
- Credentials never committed to repository
- Read-only access to staging
- Limited write access to production

## Support

For issues or questions:
1. Check `sync/CLAUDE.md` for detailed documentation
2. Review test results in `SYNC_TEST_RESULTS_2025-01-30.md`
3. Check sync reports in `reports/` directory

---

*Module created: 2025-01-30*  
*Status: Ready for manual production use*