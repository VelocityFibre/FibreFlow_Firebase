#!/usr/bin/env node

/**
 * Quick database status check for vf-onemap-data
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkStatus() {
  console.log('📊 VF-ONEMAP-DATA DATABASE STATUS');
  console.log('=================================\n');
  
  // Check import batches
  const batchesSnapshot = await db.collection('vf-onemap-import-batches').get();
  console.log('📁 IMPORT BATCHES:');
  batchesSnapshot.forEach(doc => {
    const batch = doc.data();
    console.log(`\n${batch.batchId}:`);
    console.log(`- File: ${batch.fileName}`);
    console.log(`- Records: ${batch.totalRecords}`);
    console.log(`- Status: ${batch.status}`);
    console.log(`- Imported: ${batch.importedAt ? new Date(batch.importedAt._seconds * 1000).toLocaleString() : 'Unknown'}`);
  });
  
  // Check actual records
  const recordsSnapshot = await db.collection('vf-onemap-processed-records').get();
  console.log(`\n📊 ACTUAL RECORDS IN DATABASE: ${recordsSnapshot.size}`);
  
  // Count by import batch
  const byBatch = {};
  recordsSnapshot.forEach(doc => {
    const data = doc.data();
    const batchId = data.importBatchId || 'Unknown';
    byBatch[batchId] = (byBatch[batchId] || 0) + 1;
  });
  
  console.log('\n📈 RECORDS BY IMPORT BATCH:');
  Object.entries(byBatch).forEach(([batchId, count]) => {
    console.log(`- ${batchId}: ${count} records`);
  });
  
  // Sample records
  console.log('\n📋 SAMPLE RECORDS (first 3):');
  let count = 0;
  recordsSnapshot.forEach(doc => {
    if (count < 3) {
      const data = doc.data();
      console.log(`\n${count + 1}. Property ID: ${data.propertyId}`);
      console.log(`   - Pole: ${data.poleNumber || 'None'}`);
      console.log(`   - Status: ${data.status || 'None'}`);
      console.log(`   - Import Batch: ${data.importBatchId}`);
      console.log(`   - File: ${data.fileName}`);
      count++;
    }
  });
  
  console.log('\n✅ DATABASE IS LIVE AND ACCESSIBLE');
  console.log('🔗 View in Firebase Console:');
  console.log('   https://console.firebase.google.com/project/vf-onemap-data/firestore/data/vf-onemap-processed-records');
  
  await admin.app().delete();
}

checkStatus().catch(console.error);