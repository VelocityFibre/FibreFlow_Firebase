# Correct 1Map Import Approach

## Principle: One Property ID = One Record

### What we SHOULD do:

1. **Check Before Import**
   ```javascript
   // For each record in new CSV
   const exists = await db.collection('staging').doc(propertyId).get();
   
   if (!exists.exists) {
     // NEW record - import it
     await db.collection('staging').doc(propertyId).set({
       property_id: propertyId,
       current_data: record,
       first_seen: timestamp,
       last_updated: timestamp,
       import_history: [{
         batch_id: batchId,
         date: timestamp,
         action: 'created'
       }]
     });
   } else {
     // EXISTING record - check if data changed
     const existingData = exists.data();
     if (hasChanges(existingData.current_data, record)) {
       // Update with new data
       await exists.ref.update({
         previous_data: existingData.current_data,
         current_data: record,
         last_updated: timestamp,
         import_history: admin.firestore.FieldValue.arrayUnion({
           batch_id: batchId,
           date: timestamp,
           action: 'updated',
           changes: detectChanges(existingData.current_data, record)
         })
       });
     }
     // If no changes, skip (don't create duplicate)
   }
   ```

2. **Benefits of This Approach**
   - No duplicates in database
   - Still tracks full history via import_history array
   - Can see when each record was first seen and last updated
   - Can track what changed between imports
   - Database size stays manageable

3. **For Daily Imports**
   - Only process NEW Property IDs
   - Only update CHANGED records
   - Skip unchanged records entirely
   - Much faster processing

## Why Our Current Staging Has Duplicates:

1. **Early imports didn't use Property ID as document ID**
   - Used auto-generated IDs instead
   - Allowed same Property ID multiple times

2. **Timeout handling created partial imports**
   - Scripts would restart and re-import some records
   - No transaction-level deduplication

3. **We imported full CSV instead of just changes**
   - Should have compared first
   - Then only imported differences

## Recommendation:

For future imports, use the approach in `daily-import-simple.js` which:
- Uses Property ID as document ID (enforces uniqueness)
- Only imports truly NEW records
- Tracks changes properly
- Provides clear reporting

The "audit trail" should be in the import_history field of each record, NOT by having duplicate records!