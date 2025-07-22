#!/usr/bin/env node

/**
 * Simple June 5th Import
 * Just imports new records without complex first-instance checking
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function importJune5() {
  console.log('📊 Simple June 5th Import\n');
  
  // Read CSV
  const fileContent = await fs.readFile('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const cleanContent = fileContent.replace(/^\uFEFF/, '');
  
  const records = csv.parse(cleanContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true
  });
  
  console.log(`✅ Parsed ${records.length} records from June 5th CSV`);
  
  // Get existing Property IDs
  console.log('🔍 Checking existing records...');
  const existingIds = new Set();
  
  const snapshot = await db.collection('onemap-processing-staging')
    .select('property_id')
    .get();
  
  snapshot.forEach(doc => {
    existingIds.add(doc.id);
  });
  
  console.log(`📊 Found ${existingIds.size} existing records in staging`);
  
  // Process new records only
  let newCount = 0;
  let skipCount = 0;
  const batch = db.batch();
  const batchId = `IMP_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  
  for (const record of records) {
    const propertyId = record['Property ID'];
    
    if (existingIds.has(propertyId)) {
      skipCount++;
      continue;
    }
    
    // New record
    const docRef = db.collection('onemap-processing-staging').doc(propertyId);
    batch.set(docRef, {
      property_id: propertyId,
      current_data: record,
      import_batch_id: batchId,
      first_seen_date: admin.firestore.FieldValue.serverTimestamp(),
      last_updated_date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    newCount++;
    
    // Commit batch every 500 records
    if (newCount % 500 === 0) {
      await batch.commit();
      console.log(`  Imported ${newCount} new records...`);
    }
  }
  
  // Final commit
  await batch.commit();
  
  // Create import record
  await db.collection('onemap-processing-imports').doc(batchId).set({
    importId: batchId,
    importDate: admin.firestore.FieldValue.serverTimestamp(),
    fileName: 'Lawley June Week 1 05062025.csv',
    recordsProcessed: newCount,
    recordsSkipped: skipCount,
    status: 'completed'
  });
  
  console.log(`
✅ Import Complete!
- New records imported: ${newCount}
- Duplicate records skipped: ${skipCount}
- Total records processed: ${records.length}
- Batch ID: ${batchId}
  `);
}

importJune5().catch(console.error);