#!/usr/bin/env node

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkProgress() {
  console.log('🔍 Checking June 5th Import Progress\n');
  
  // Get all import batches
  const imports = await db.collection('onemap-processing-imports')
    .where('fileName', '==', 'Lawley June Week 1 05062025.csv')
    .orderBy('importDate', 'asc')
    .get();
  
  console.log('Import Batches:');
  let totalImported = 0;
  imports.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.importId}: ${data.recordsProcessed} records (${data.status})`);
    totalImported += data.recordsProcessed || 0;
  });
  
  // Check actual count in staging
  const stagingCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  // Check June 5 specific records
  const june5Batch1 = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_1753204272721')
    .select()
    .get();
  
  const june5Batch2 = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_CONTINUE_1753205172726')
    .select()
    .get();
  
  console.log('\nCurrent Status:');
  console.log(`- Total records in staging: ${stagingCount.size}`);
  console.log(`- June 5 batch 1: ${june5Batch1.size} records`);
  console.log(`- June 5 batch 2: ${june5Batch2.size} records`);
  console.log(`- Total June 5 imported: ${june5Batch1.size + june5Batch2.size}`);
  console.log(`- Expected June 5 total: 6,039`);
  console.log(`- Remaining to import: ${6039 - (june5Batch1.size + june5Batch2.size)}`);
  
  // Sample check
  console.log('\nChecking if more June 5 records exist...');
  const sampleIds = ['253456', '254000', '254500', '255000', '255500'];
  for (const id of sampleIds) {
    const doc = await db.collection('onemap-processing-staging').doc(id).get();
    console.log(`Property ${id}: ${doc.exists ? 'EXISTS' : 'NOT FOUND'}`);
  }
}

checkProgress().catch(console.error);