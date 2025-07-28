#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Initialize with god mode credentials
const serviceAccount = require('../credentials/vf-onemap-god-mode.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data',
  storageBucket: 'vf-onemap-data.firebasestorage.app'
});

const db = admin.firestore();
const storage = admin.storage();

async function importCSV(csvFileName) {
  console.log('🚀 GOD MODE IMPORT - Full Access Enabled\n');
  
  const csvPath = path.join(__dirname, '../downloads', csvFileName);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`📊 Found ${records.length} records to import\n`);
  
  const batch = db.batch();
  const importBatchId = `IMP_${Date.now()}`;
  let count = 0;
  
  for (const record of records) {
    const propertyId = record['Property ID'];
    if (!propertyId) continue;
    
    const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
    batch.set(docRef, {
      ...record,
      importBatchId,
      importedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    count++;
    
    // Commit every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✅ Imported ${count} records...`);
    }
  }
  
  await batch.commit();
  
  // Save import summary
  await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
    batchId: importBatchId,
    fileName: csvFileName,
    totalRecords: records.length,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'completed'
  });
  
  console.log(`\n✨ Import completed! ${count} records imported`);
  console.log(`📁 Batch ID: ${importBatchId}`);
}

// Run if called directly
if (require.main === module) {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.log('Usage: node import-with-god-mode.js <csv-filename>');
    process.exit(1);
  }
  importCSV(csvFile).catch(console.error);
}

module.exports = { importCSV };
