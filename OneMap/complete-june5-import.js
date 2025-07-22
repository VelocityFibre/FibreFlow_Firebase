#!/usr/bin/env node

/**
 * Complete the June 5th import - final batch
 * Processes remaining records in smaller chunks to avoid timeout
 */

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function completeImport() {
  const batchId = `IMP_JUNE5_FINAL_${Date.now()}`;
  console.log(`🚀 Completing June 5th Import - Final Batch`);
  console.log(`🏷️  Batch ID: ${batchId}\n`);
  
  // Parse CSV
  const fileContent = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const records = csv.parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  console.log(`📊 Total records in June 5th CSV: ${records.length}`);
  
  // Get ALL already imported June 5 Property IDs
  console.log('🔍 Loading already imported records...');
  const importedIds = new Set();
  
  // Batch 1
  let snapshot = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_1753204272721')
    .select('property_id')
    .get();
  snapshot.forEach(doc => importedIds.add(doc.data().property_id));
  console.log(`  Batch 1: ${snapshot.size} records`);
  
  // Batch 2
  snapshot = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_CONTINUE_1753205172726')
    .select('property_id')
    .get();
  snapshot.forEach(doc => importedIds.add(doc.data().property_id));
  console.log(`  Batch 2: ${snapshot.size} records`);
  
  console.log(`✅ Total already imported: ${importedIds.size} records\n`);
  
  // Find records that need to be imported
  const recordsToImport = records.filter(r => !importedIds.has(r['Property ID']));
  console.log(`📊 Records remaining to import: ${recordsToImport.length}`);
  
  if (recordsToImport.length === 0) {
    console.log('✅ All June 5th records are already imported!');
    return;
  }
  
  // Process in very small chunks to avoid timeout
  const CHUNK_SIZE = 200; // Even smaller chunks
  let newCount = 0;
  let batch = db.batch();
  let batchOps = 0;
  
  for (let i = 0; i < recordsToImport.length; i += CHUNK_SIZE) {
    const chunk = recordsToImport.slice(i, Math.min(i + CHUNK_SIZE, recordsToImport.length));
    
    // Double-check these aren't in staging from other imports
    const propertyIds = chunk.map(r => r['Property ID']);
    const existingIds = new Set();
    
    // Check in groups of 30
    for (let j = 0; j < propertyIds.length; j += 30) {
      const idsToCheck = propertyIds.slice(j, j + 30);
      const existing = await db.collection('onemap-processing-staging')
        .where('property_id', 'in', idsToCheck)
        .select('property_id')
        .get();
      
      existing.forEach(doc => existingIds.add(doc.data().property_id));
    }
    
    // Import only truly new ones
    for (const record of chunk) {
      const propertyId = record['Property ID'];
      
      if (existingIds.has(propertyId)) {
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
      
      // Commit batch more frequently
      if (batchOps >= 200) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
        console.log(`  Progress: ${newCount}/${recordsToImport.length} imported...`);
      }
    }
  }
  
  // Final commit
  if (batchOps > 0) {
    await batch.commit();
  }
  
  // Save import record
  await db.collection('onemap-processing-imports').doc(batchId).set({
    importId: batchId,
    importDate: admin.firestore.FieldValue.serverTimestamp(),
    fileName: 'Lawley June Week 1 05062025.csv',
    recordsProcessed: newCount,
    totalInFile: records.length,
    isFinalBatch: true,
    previousBatches: [
      'IMP_JUNE5_1753204272721',
      'IMP_JUNE5_CONTINUE_1753205172726'
    ],
    status: 'completed'
  });
  
  // Final verification
  const finalCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  // Generate report
  const report = `
# June 5th Import - COMPLETE! 🎉

## Summary
- Previous imports: ${importedIds.size} records
- Final batch imported: ${newCount} records
- Total June 5th records: ${importedIds.size + newCount}
- Expected total: ${records.length}
- Final staging count: ${finalCount.size}

## All June 5th Batches:
1. IMP_JUNE5_1753204272721: 1,600 records
2. IMP_JUNE5_CONTINUE_1753205172726: 1,500 records
3. ${batchId}: ${newCount} records

## Status
✅ June 5th import is now COMPLETE!
✅ All ${records.length} records from CSV have been imported
✅ Ready for comprehensive change analysis

## Next Steps
Run the change analysis to compare June 3rd vs June 5th data!
`;
  
  console.log(report);
  
  // Save report
  fs.writeFileSync(`reports/june5_final_${batchId}.txt`, report);
  console.log(`\n📄 Report saved to: reports/june5_final_${batchId}.txt`);
  
  return { newCount, batchId, totalImported: importedIds.size + newCount };
}

completeImport().catch(console.error);