# How to Use the Sync Module

## Prerequisites

✅ Service accounts are already configured (found and copied from existing locations)
✅ Dependencies installed (`npm install` completed)
✅ Both databases accessible

## Daily Usage Guide

### 1. Check What's New in Staging

First, see what data is available to sync:

```bash
cd sync
node scripts/check-staging-collections.js
```

This shows:
- What collections exist
- How many records are available
- Sample data structure

### 2. Test Connection

Always verify connections before syncing:

```bash
npm run test:connection
```

Expected output:
```
✅ Staging connected!
✅ Production connected!
📈 Database Statistics:
   Staging: X records
   Production: Y records
```

### 3. Run a Small Test First

Before full sync, test with a few records:

```bash
node scripts/test-sync-corrected.js
```

This will:
- Sync only 5 records
- Show what would be synced
- Create a test report

### 4. Run Full Sync with History

When ready for more records:

```bash
node scripts/sync-with-status-history.js
```

Default: 50 records. To change, edit the script line:
```javascript
const poleGroups = await getRecordsGroupedByPole(50); // Change 50 to desired number
```

### 5. Verify the Sync

Check what was synced:

```bash
# Check basic sync
node scripts/verify-sync.js

# Check status history
node scripts/verify-status-history.js
```

### 6. Review Reports

Check the generated reports:

```bash
# List all reports
ls -la reports/

# View latest report
cat reports/sync-history-*.json | jq '.'
```

## Common Scenarios

### Scenario 1: Daily Sync
```bash
cd sync
npm run test:connection
node scripts/sync-with-status-history.js
node scripts/verify-status-history.js
```

### Scenario 2: Check Specific Pole
Modify `verify-sync.js` to check specific poles:
```javascript
const polesToCheck = ['LAW.P.C654', 'YOUR.POLE.HERE'];
```

### Scenario 3: Full Database Sync
Edit `sync-with-status-history.js`:
```javascript
// Change from:
const poleGroups = await getRecordsGroupedByPole(50);
// To:
const poleGroups = await getRecordsGroupedByPole(999999); // All records
```

## Understanding the Output

### Sync Output Example
```
📊 Poles with multiple records (status changes):
   LAW.P.C654: 2 records
     - Pole Permission: Approved (239252)
     - Home Installation: Declined (239274)
```

This means:
- Pole LAW.P.C654 appears in 2 different records
- First was approved for pole permission
- Later declined for home installation
- Both statuses are preserved in history

### Status History Output
```
📜 Status History (2 entries):
   1. Status: Home Installation: Declined
      Field Agent: Unknown
      Property ID: 239274
      Timestamp: Wed Jul 30 2025
```

This shows the complete audit trail for the pole.

## Monitoring Sync Health

### Check for Issues

1. **Records without pole numbers**:
   - These are skipped
   - Normal for early-stage records

2. **Duplicate poles**:
   - Handled automatically
   - Creates status history
   - Latest status becomes current

3. **Sync failures**:
   - Check error messages
   - Verify connections
   - Check Firebase quotas

### Performance Metrics

From test results:
- ~10 records/second processing speed
- 36 poles = ~4 seconds
- Full 12,000 records ≈ 20 minutes

## Best Practices

1. **Always test first** with small batches
2. **Review reports** before large syncs
3. **Monitor duplicates** - they indicate status changes
4. **Keep reports** for audit trail
5. **Run manually** until process is refined

## Troubleshooting

### "No poles found"
- Check you're using correct collection: `vf-onemap-processed-records`
- Verify staging database has data

### "Permission denied"
- Check service accounts in `config/service-accounts/`
- Verify Firebase permissions

### "Timeout errors"
- Reduce batch size in script
- Check network connection

## Advanced Usage

### Custom Field Mappings
Edit `config/enhanced-field-mappings.json` to add fields:
```json
"newField": "targetField"
```

### Filter Specific Records
Modify sync scripts to add filters:
```javascript
.where('site', '==', 'LAWLEY')
.where('status', '==', 'Pole Permission: Approved')
```

### Export Sync Data
Reports are in JSON format, easy to process:
```bash
# Convert to CSV
cat reports/sync-*.json | jq -r '.syncedRecords[] | [.poleNumber, .location] | @csv'
```

---

**Remember**: This is a manual process by design. Take your time, verify results, and build confidence before scaling up.