# Migration Testing Checklist

## Pre-Migration Setup ✅

### Firebase TEST Project
- [ ] Created `fibreflow-test` project in Firebase Console
- [ ] Downloaded service account JSON
- [ ] Placed in `TEST-fibreflow/migrator/service-account.json`
- [ ] Verified file contains `"project_id": "fibreflow-test"`

### Airtable Credentials
- [ ] Generated API token from https://airtable.com/create/tokens
- [ ] Added to `.env` file
- [ ] Verified base ID is correct: `appkYMgaK0cHVu4Zg`

### Environment Verification
- [ ] Run `node verify-setup.js` - all checks pass
- [ ] Confirmed in TEST directory: `pwd` shows `/TEST-fibreflow/migrator`
- [ ] No production credentials in TEST directory

## Phase 1: Dry Run Testing 🧪

### Initial Dry Run
```bash
npm run migrate -- --dry-run
```
- [ ] Command completes without errors
- [ ] Output shows "Dry run - skipping Firebase write"
- [ ] JSON files created in `output/` directory

### Review Sample Data
- [ ] Open `output/customers-sample.json`
- [ ] Verify field transformations:
  - [ ] Client Type is lowercase with underscores
  - [ ] Contact Info parsed into object
  - [ ] All required fields present
  - [ ] airtableId field included

### Table by Table Dry Run
```bash
npm run migrate customers -- --dry-run
npm run migrate staff -- --dry-run
npm run migrate projects -- --dry-run
```
- [ ] Each table processes successfully
- [ ] Record counts match expectations
- [ ] No transformation errors

## Phase 2: TEST Environment Migration 🔄

### Start Small
```bash
npm run migrate customers -- --batch-size 5
```
- [ ] Only 5 records migrated
- [ ] Check Firebase Console: https://console.firebase.google.com/project/fibreflow-test
- [ ] Verify in Firestore > customers collection:
  - [ ] Records have correct structure
  - [ ] Nested fields (contactInfo) properly formatted
  - [ ] Timestamps added (createdAt, updatedAt)
  - [ ] airtableId field present

### Duplicate Prevention Test
```bash
npm run migrate customers -- --batch-size 5
```
- [ ] Run same command again
- [ ] Should show "Skipping X duplicate records"
- [ ] No duplicates in Firebase

### Full Table Migration
```bash
npm run migrate customers
```
- [ ] All customer records migrated
- [ ] Final count matches Airtable count
- [ ] No errors in console

### Relationship Verification
```bash
npm run migrate staff
npm run migrate projects
```
- [ ] Staff records have correct structure
- [ ] Project records reference correct customer IDs
- [ ] Denormalized fields (like customerName) populated

## Phase 3: Data Validation 📊

### Record Counts
| Table | Airtable Count | Firebase Count | Match? |
|-------|----------------|----------------|--------|
| customers | ___ | ___ | [ ] |
| staff | ___ | ___ | [ ] |
| projects | ___ | ___ | [ ] |

### Sample Record Verification
For each table, pick 3 random records and verify:
- [ ] All fields migrated correctly
- [ ] Data types preserved
- [ ] Special characters handled
- [ ] Null/empty values handled appropriately

### Query Testing
In Firebase Console, test queries:
```javascript
// Find all active projects
where('status', '==', 'in_progress')

// Find customer by name
where('name', '==', 'Test Customer')

// Check for orphaned records
where('customerId', '==', null)
```

## Phase 4: Application Testing 🚀

### Connect Test App
- [ ] Create test version of your app
- [ ] Point to `fibreflow-test` Firebase project
- [ ] Test basic functionality:
  - [ ] Customer list loads
  - [ ] Project details display
  - [ ] No console errors
  - [ ] Performance acceptable

### Edge Cases
- [ ] Records with special characters display correctly
- [ ] Empty fields don't break UI
- [ ] Large text fields render properly
- [ ] Date fields show correct format

## Phase 5: Performance Check ⚡

### Migration Performance
- [ ] Record migration time for each table
- [ ] Monitor Firebase quota usage
- [ ] Check for rate limiting issues

### Query Performance
- [ ] Test app response times
- [ ] Check Firestore indexes needed
- [ ] Monitor read/write costs

## Ready for Production? 🎯

### Final Checks
- [ ] All TEST validations passed
- [ ] No data quality issues found
- [ ] Application works with migrated data
- [ ] Team reviewed sample data
- [ ] Rollback plan documented

### Production Prep
- [ ] Schedule migration window
- [ ] Notify team/users if needed
- [ ] Backup production data
- [ ] Prepare PROD-fibreflow directory
- [ ] Have this checklist ready for PROD

## Post-Migration 🎉

### Immediate Verification
- [ ] Spot check 10 random records
- [ ] Verify latest records migrated
- [ ] Test critical app functions
- [ ] Monitor error logs

### Documentation
- [ ] Record total migration time
- [ ] Note any issues encountered
- [ ] Document any manual fixes needed
- [ ] Update team on completion

---

## Common Issues & Solutions

### "Permission denied" error
- Check service account has correct permissions
- Verify project ID matches

### "Duplicate key" errors
- Run with duplicate checking enabled (default)
- Check for unique constraints

### Transformation errors
- Review error logs for specific fields
- Check data types match mapping
- Handle edge cases in transform functions

### Missing data
- Verify Airtable API key has access to all tables
- Check field IDs haven't changed
- Review skip fields configuration

---

Remember: **Always test in TEST environment first!** 🧪