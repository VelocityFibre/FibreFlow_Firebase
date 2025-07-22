#!/usr/bin/env node

/**
 * Continue June 5th import from where it left off
 * Skips already imported records and processes remaining ones
 */

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function continueImport() {
  const batchId = `IMP_JUNE5_CONTINUE_${Date.now()}`;
  console.log(`🚀 Continuing June 5th Import`);
  console.log(`🏷️  Batch ID: ${batchId}\n`);
  
  // Parse CSV
  const fileContent = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const records = csv.parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  console.log(`📊 Total records in June 5th CSV: ${records.length}`);
  
  // Get already imported Property IDs from partial batch
  console.log('🔍 Checking already imported records...');
  const importedIds = new Set();
  
  // Get records from the partial import batch
  const partialBatch = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_1753204272721')
    .select('property_id')
    .get();
  
  partialBatch.forEach(doc => {
    importedIds.add(doc.data().property_id);
  });
  
  console.log(`✅ Found ${importedIds.size} already imported records from partial batch`);
  
  // Process remaining records
  const CHUNK_SIZE = 300; // Smaller chunks for safety
  let newCount = 0;
  let skipCount = 0;
  let batch = db.batch();
  let batchOps = 0;
  
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, Math.min(i + CHUNK_SIZE, records.length));
    
    // Check which ones exist (including from other imports)
    const existingIds = new Set([...importedIds]); // Start with already imported
    
    // Check in groups of 30 for any other existing records
    const propertyIds = chunk.map(r => r['Property ID']).filter(id => !importedIds.has(id));
    
    for (let j = 0; j < propertyIds.length; j += 30) {
      const idsToCheck = propertyIds.slice(j, j + 30);
      if (idsToCheck.length === 0) continue;
      
      const existing = await db.collection('onemap-processing-staging')
        .where('property_id', 'in', idsToCheck)
        .select('property_id')
        .get();
      
      existing.forEach(doc => existingIds.add(doc.data().property_id));
    }
    
    // Import only new ones
    for (const record of chunk) {
      const propertyId = record['Property ID'];
      
      if (existingIds.has(propertyId)) {
        skipCount++;
        continue;
      }
      
      // New record - add to batch
      const docRef = db.collection('onemap-processing-staging').doc(propertyId);
      batch.set(docRef, {
        property_id: propertyId,
        current_data: record,
        import_batch_id: batchId,
        first_seen_date: admin.firestore.FieldValue.serverTimestamp()
      });
      
      newCount++;
      batchOps++;
      
      // Commit batch if near limit
      if (batchOps >= 300) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
        console.log(`  Progress: ${i + chunk.length}/${records.length} checked, ${newCount} new imported...`);
      }
    }
  }
  
  // Final commit
  if (batchOps > 0) {
    await batch.commit();
  }
  
  // Update the original import record if found
  const originalImport = await db.collection('onemap-processing-imports')
    .doc('IMP_JUNE5_1753204272721')
    .get();
  
  if (originalImport.exists) {
    await originalImport.ref.update({
      status: 'completed_with_continuation',
      continuationBatchId: batchId,
      totalRecordsProcessed: importedIds.size + newCount
    });
  }
  
  // Save continuation import record
  await db.collection('onemap-processing-imports').doc(batchId).set({
    importId: batchId,
    importDate: admin.firestore.FieldValue.serverTimestamp(),
    fileName: 'Lawley June Week 1 05062025.csv',
    recordsProcessed: newCount,
    recordsSkipped: skipCount,
    totalInFile: records.length,
    isContinuation: true,
    originalBatchId: 'IMP_JUNE5_1753204272721',
    status: 'completed'
  });
  
  // Final count check
  const finalCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  // Generate report
  const report = `
# June 5th Import Continuation Complete

## Summary
- Original partial import: ${importedIds.size} records
- New records in continuation: ${newCount}
- Total June 5th records imported: ${importedIds.size + newCount}
- Duplicate records skipped: ${skipCount}
- Final staging count: ${finalCount.size}

## Batch IDs
- Original: IMP_JUNE5_1753204272721 (partial)
- Continuation: ${batchId}

## Status
✅ June 5th import is now complete
✅ All ${records.length} records from CSV have been processed
✅ Ready for change analysis between June 3rd and June 5th
`;
  
  console.log(report);
  
  // Save report
  fs.writeFileSync(`reports/june5_continuation_${batchId}.txt`, report);
  console.log(`\n📄 Report saved to: reports/june5_continuation_${batchId}.txt`);
  
  return { newCount, skipCount, batchId, totalImported: importedIds.size + newCount };
}

continueImport().catch(console.error);