# Sync Strategy Update - August 4, 2025

## 🚨 IMPORTANT: New Full Status History Sync Strategy

### Previous Strategy (Deprecated)
- **Script**: `sync-with-status-history.js` (OLD - DO NOT USE)
- **Limitation**: Only synced poles at "Pole Permission: Approved" status
- **Result**: No visibility of post-approval status changes (installations, completions)
- **Last Run**: August 1, 2025 (234 poles, incomplete)

### New Strategy (Active)
- **Script**: `sync-full-status-history-v2.js` (USE THIS)
- **Capability**: Syncs ALL status changes from approval onwards
- **Benefits**: 
  - Full lifecycle visibility (approval → installation → completion)
  - Tracks all post-approval statuses
  - Maintains complete timeline in production

## 📋 Current Sync Status (August 4, 2025)

### Staging Database (vf-onemap-data)
- **Total Approved Poles**: 2,806 unique poles
- **Collections**:
  - `vf-onemap-processed-records`: Current status
  - `vf-onemap-status-changes`: Complete history

### Production Database (fibreflow-73daf)
- **Previously Synced**: 778 poles (partial, snapshot only)
- **Pending Full Sync**: 2,806 poles with complete history

## 🎯 How to Run the Full Status History Sync

```bash
cd /home/ldp/VF/Apps/FibreFlow/sync
node scripts/sync-full-status-history-v2.js
```

### What This Sync Does:
1. Finds all poles that have ever been approved (2,806 poles)
2. Retrieves their COMPLETE status history
3. Syncs all status changes to production
4. Creates `statusHistory` subcollection for each pole
5. Tracks post-approval statuses like:
   - "Pole Installed"
   - "Drop Installed"
   - "Home Installation: In Progress"
   - "Home Installation: Complete"

### Expected Results:
- **Duration**: ~20-30 minutes for 2,806 poles
- **Output**: Complete timeline for each pole
- **Report**: `FULL_STATUS_HISTORY_SYNC_2025-08-04` in Firestore

## 🗂️ Script Archive Structure

### Active Scripts (USE THESE)
```
sync/scripts/
├── sync-full-status-history-v2.js     ✅ PRIMARY SYNC SCRIPT
├── test-full-history-sync-v2.js       ✅ Test before running
├── check-sync-progress.js              ✅ Monitor progress
├── monitor-sync.js                     ✅ Real-time dashboard
└── verify-all-approved-synced.js      ✅ Verify completion
```

### Archived Scripts (DO NOT USE)
```
sync/scripts/archive/
├── sync-with-status-history.js        ❌ OLD - Limited to approved only
├── sync-remaining-poles.js            ❌ OLD - Continuation script
├── sync-all-approved-poles.js         ❌ OLD - Snapshot approach
├── test-sync.js                       ❌ OLD - Test script
└── create-pre-sync-report.js          ❌ OLD - Pre-sync analysis
```

## 📊 Key Differences

| Aspect | Old Strategy | New Strategy |
|--------|--------------|--------------|
| Script | sync-with-status-history.js | sync-full-status-history-v2.js |
| Scope | Only "Approved" status | ALL statuses from approval onwards |
| History | Snapshot at approval | Complete timeline |
| Post-Approval | ❌ Not tracked | ✅ Fully tracked |
| Use Case | Initial sync | Full lifecycle tracking |

## 🔍 Monitoring & Verification

### During Sync:
```bash
# In another terminal
node scripts/monitor-sync.js
```

### After Sync:
```bash
# Verify all approved poles are synced
node scripts/verify-all-approved-synced.js
```

### Check Report:
- Firebase Console → fibreflow-73daf → sync-reports
- Document ID: `FULL_STATUS_HISTORY_SYNC_2025-08-04`

## 📝 Important Notes

1. **One-Way Sync**: Changes only flow from staging → production
2. **No Data Loss**: Existing production data is preserved (merge: true)
3. **Idempotent**: Safe to run multiple times
4. **Performance**: ~10 poles/second processing rate

## 🚀 Next Steps

1. Run the full status history sync
2. Verify all 2,806 poles have complete history
3. Set up regular sync for new status changes
4. Archive old scripts to prevent confusion

---

**Last Updated**: August 4, 2025
**Author**: Sync Agent
**Script Version**: v2.0