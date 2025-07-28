# First Sync Execution Checklist - February 1, 2025

## 📊 Pre-Sync Summary

### Current Status
- **Already synced to production**: 36 poles
- **Ready to sync**: 175 unique poles (180 records)
- **Will be skipped**: 120 records (39 already synced + 81 no pole number)
- **Estimated sync time**: 18 seconds

### Data Quality
- **170 poles** with "Pole Permission: Approved" ✅
- **10 poles** with installation progress statuses
- **2 poles** with multiple status changes (conflicts to review)

### Conflicts to Review
1. **LAW.P.C512**: 2 records (Approved → In Progress)
2. **LAW.P.C603**: 2 records (In Progress → Approved)

## ⚠️ IMPORTANT: Sync Configuration

**Current batch size in sync script**: 50 poles
**Recommended for first sync**: Start with 50, then increase

To modify batch size, edit line 104 in `sync-with-status-history.js`:
```javascript
const poleGroups = await getRecordsGroupedByPole(50); // Change 50 to desired batch
```

## ✅ Pre-Sync Checklist

### 1. System Verification
- [x] Service accounts configured
- [x] Both databases accessible
- [x] Pre-sync report generated
- [ ] Review conflicts (2 poles)
- [ ] Decide on batch size

### 2. Backup & Safety
- [ ] Note current production count: 7,247 poles
- [ ] Save pre-sync report: `reports/pre-sync-report-1754029843818.json`
- [ ] Confirm rollback plan (if needed)

### 3. Sync Parameters
- [ ] Batch size decision: 50 (default) or 175 (all)?
- [ ] Confirm field mappings are correct
- [ ] Review status history tracking

## 🚀 Execution Steps

### Step 1: Final Pre-Sync Check
```bash
# Verify current state
cd /home/ldp/VF/Apps/FibreFlow/sync
node scripts/prepare-next-sync.js
```

### Step 2: Execute Sync (Choose One)

**Option A: Conservative (50 poles) - RECOMMENDED**
```bash
# Use default batch size
node scripts/sync-with-status-history.js
```

**Option B: Full Sync (175 poles)**
```bash
# First edit the script to change line 104:
# const poleGroups = await getRecordsGroupedByPole(175);
node scripts/sync-with-status-history.js
```

### Step 3: Monitor Progress
Watch the console output for:
- ✓ Pole sync confirmations
- Status history entries created
- Any error messages

### Step 4: Verify Results
```bash
# Check what was synced
node scripts/verify-sync.js

# Check specific poles
node scripts/verify-status-history.js
```

## 📋 Post-Sync Verification

### 1. Verify Numbers
- [ ] Production poles increased by expected amount
- [ ] Status history entries created
- [ ] No duplicate poles

### 2. Spot Check Poles
- [ ] Check LAW.P.A033 (first in list)
- [ ] Check LAW.P.C512 (conflict pole)
- [ ] Check random pole from middle

### 3. Generate Post-Sync Report
```bash
# Create summary of what was synced
node scripts/create-post-sync-report.js  # If available
```

## 🔍 Monitoring Commands

```bash
# Real-time monitoring during sync
watch -n 2 'node scripts/check-sync-progress.js'  # If available

# Check production database directly
node -e "
const admin = require('firebase-admin');
const app = admin.initializeApp({
  credential: admin.credential.cert(require('./config/service-accounts/fibreflow-73daf-key.json')),
  projectId: 'fibreflow-73daf'
});
const db = app.firestore();
db.collection('planned-poles').count().get().then(c => {
  console.log('Total poles in production:', c.data().count);
  process.exit(0);
});
"
```

## 🚨 Rollback Plan (If Needed)

If issues occur:
1. **Stop the sync** immediately (Ctrl+C)
2. **Document** what was synced before stopping
3. **Check** production for partial sync
4. **Decision**: Continue or rollback

Rollback query (if needed):
```javascript
// Remove recently synced poles
await productionDb
  .collection('planned-poles')
  .where('lastSyncDate', '>', timestamp)
  .where('lastSyncedFrom', '==', 'vf-onemap-data')
  .get()
  .then(snapshot => {
    // Review before deleting
  });
```

## 📝 Notes & Decisions

### Conflict Resolution
- **LAW.P.C512**: Latest status is "In Progress" (use this)
- **LAW.P.C603**: Latest status is "Approved" (seems like regression?)

### Recommendations
1. Start with 50 poles to verify process
2. Monitor closely for first batch
3. If successful, run again with larger batch
4. Document any issues or observations

## ✅ Ready to Sync?

Once you've reviewed this checklist:
1. Confirm batch size
2. Have monitoring ready
3. Execute sync command
4. Monitor progress
5. Verify results

**Good luck with the first sync!** 🚀