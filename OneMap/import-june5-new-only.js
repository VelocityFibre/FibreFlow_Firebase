#!/usr/bin/env node

/**
 * Import only NEW records from June 5th
 * Simple and efficient - no complex tracking
 */

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function importNewOnly() {
  const batchId = `IMP_JUNE5_${Date.now()}`;
  console.log(`🚀 Importing NEW June 5th Records Only`);
  console.log(`🏷️  Batch ID: ${batchId}\n`);
  
  // Parse CSV
  const fileContent = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const records = csv.parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  console.log(`📊 Total records in June 5th CSV: ${records.length}`);
  
  // Process in chunks to check what's new
  const CHUNK_SIZE = 500;
  let newCount = 0;
  let skipCount = 0;
  let batch = db.batch();
  let batchOps = 0;
  
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, Math.min(i + CHUNK_SIZE, records.length));
    const propertyIds = chunk.map(r => r['Property ID']);
    
    // Check which ones exist (in groups of 30 due to Firestore limit)
    const existingIds = new Set();
    for (let j = 0; j < propertyIds.length; j += 30) {
      const idsToCheck = propertyIds.slice(j, j + 30);
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
      if (batchOps >= 400) {
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
  
  // Save import record
  await db.collection('onemap-processing-imports').doc(batchId).set({
    importId: batchId,
    importDate: admin.firestore.FieldValue.serverTimestamp(),
    fileName: 'Lawley June Week 1 05062025.csv',
    recordsProcessed: newCount,
    recordsSkipped: skipCount,
    totalInFile: records.length,
    status: 'completed'
  });
  
  // Generate simple report
  const report = `
# June 5th Import Complete

## Summary
- Total records in CSV: ${records.length}
- New records imported: ${newCount}
- Duplicate records skipped: ${skipCount}
- Batch ID: ${batchId}

## What This Means
- The staging database now contains June 5th data
- ${newCount} new Property IDs were added
- Ready for further analysis
`;
  
  console.log(report);
  
  // Save report
  fs.writeFileSync(`reports/june5_import_${batchId}.txt`, report);
  console.log(`\n📄 Report saved to: reports/june5_import_${batchId}.txt`);
  
  return { newCount, skipCount, batchId };
}

importNewOnly().catch(console.error);