# Sync Validation System Summary

## Purpose
Ensure data accuracy by comparing the master CSV (source of truth) with the staging database before syncing to production.

## Quick Start
```bash
# Run validation
cd /home/ldp/VF/Apps/FibreFlow/sync
./validation/run-validation.sh
```

## What It Does

### 1. **Reads Master CSV**
- Location: `OneMap/GraphAnalysis/data/master/master_csv_latest.csv`
- This is the aggregated CSV from all daily files
- Contains complete status history

### 2. **Queries Staging Database**
- Database: `vf-onemap-data`
- Collections: `vf-onemap-processed-records` and `vf-onemap-status-changes`

### 3. **Compares Records**
Field-by-field comparison of:
- Property ID
- Pole Number
- Drop Number
- Status
- Field Agent
- Address
- PON
- Zone

### 4. **Reports Discrepancies**
- **Missing in Staging**: Records in CSV but not in database
- **Extra in Staging**: Records in database but not in CSV
- **Field Mismatches**: Same record but different values

### 5. **Creates Safe-to-Sync List**
Only records that pass validation are marked safe for production sync

## Validation Results

### ✅ PASS Scenarios:
- All CSV records exist in staging
- Field values match (after normalization)
- No extra records in staging

### ⚠️ FAIL Scenarios:
- Missing records in staging
- Field value mismatches
- Unexpected records in staging

## Reports Location
`sync/validation/reports/validation_YYYY-MM-DD_timestamp.json`

## Next Steps After Validation

### If Validation PASSES:
```bash
# Continue with sync to production
node sync/scripts/sync-full-status-history-v2.js
```

### If Validation FAILS:
1. Review the validation report
2. Identify root cause of discrepancies
3. Either:
   - Re-import missing records to staging
   - Update master CSV if staging is correct
   - Investigate data quality issues
4. Re-run validation
5. Only proceed when validation passes

## Important Notes

1. **Master CSV is Source of Truth**: The aggregated CSV from OneMap daily files
2. **Staging is Intermediate**: Should match master CSV exactly
3. **Production is Final**: Only validated, approved data should sync

## Common Issues & Solutions

### Issue: "Master CSV not found"
**Solution**: Run the CSV aggregation first
```bash
cd OneMap/GraphAnalysis
./CREATE_MASTER_CSV.sh
```

### Issue: Many missing records
**Solution**: Re-import the CSV files to staging
```bash
cd OneMap/scripts
node import-all-csvs-to-staging.js
```

### Issue: Status mismatches
**Solution**: Check if status history tracking is working correctly
The master CSV should have the latest status for each record

---

**Remember**: Never sync to production without passing validation first!