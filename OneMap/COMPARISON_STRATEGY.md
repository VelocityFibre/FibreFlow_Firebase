# OneMap Comparison Strategy - CSV vs Staging Database

## Recommended Approach: Compare to Staging Database

### Why Staging Database is Better Than CSV-to-CSV:

1. **Single Source of Truth**
   - Staging DB maintains the current state of all records
   - No need to juggle multiple CSV files
   - Eliminates confusion about which CSV has what data

2. **Efficient Processing**
   - Database queries are faster than parsing large CSVs repeatedly
   - Can index by Property ID, Pole Number, Address for quick lookups
   - Bulk operations for better performance

3. **Complete History**
   - Staging DB can track when each record was first imported
   - Maintains import batch information
   - Can query historical data easily

4. **Better Change Detection**
   ```javascript
   // With Staging DB:
   const existingRecord = await db.collection('onemap-staging').doc(propertyId).get();
   if (!existingRecord.exists) {
     // New record
   } else {
     // Check for changes
   }
   
   // vs CSV comparison (messy):
   // Need to load entire CSV into memory
   // Parse and search through thousands of records
   ```

5. **Audit Trail**
   - Know exactly when each record was imported
   - Track which import batch brought each record
   - Can rollback bad imports if needed

## Recommended Daily Workflow:

```
1. Morning: Download new CSV from OneMap
   ↓
2. Run: import-onemap-daily.js
   - Reads new CSV
   - Compares each record against staging DB
   - Identifies new records and changes
   - Imports only new/changed data
   ↓
3. Generate daily change report
   - X new poles added
   - Y status changes
   - Z drops installed
   ↓
4. Staging DB now contains latest data
   - Ready for tomorrow's comparison
   - Historical data preserved
```

## Implementation Example:

```javascript
async function processDaily(csvPath) {
  const csv = await parseCSV(csvPath);
  const report = {
    new_records: 0,
    status_changes: 0,
    pole_assignments: 0,
    drops_added: 0,
    details: []
  };
  
  for (const record of csv) {
    // Check if Property ID exists
    const existing = await db.collection('onemap-staging')
      .doc(record.property_id)
      .get();
    
    if (!existing.exists) {
      // New record - import it
      await importNewRecord(record);
      report.new_records++;
    } else {
      // Existing record - check for pole/address changes
      const changes = await checkForChanges(record, existing.data());
      if (changes.length > 0) {
        report.details.push(changes);
      }
    }
  }
  
  return report;
}
```

## Benefits Over CSV-to-CSV:

1. **Scalability**: Works well even with millions of records
2. **Reliability**: Database handles concurrent access, transactions
3. **Flexibility**: Can query by any field combination
4. **Performance**: Indexed lookups vs full file scans
5. **Maintainability**: Cleaner code, less file management

## When to Use CSV-to-CSV:

Only for:
- Initial analysis/exploration
- One-time comparisons
- When database is unavailable
- Quick ad-hoc checks

For production daily imports: **Always use Staging Database approach**