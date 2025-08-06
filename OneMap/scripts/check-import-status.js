#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkImportStatus() {
  console.log('Checking import status...\n');
  
  // Check import tracking
  const imports = await db.collection('import-tracking')
    .orderBy('importDate', 'desc')
    .limit(5)
    .get();
    
  console.log(`Found ${imports.size} recent imports:\n`);
  
  imports.forEach(doc => {
    const data = doc.data();
    console.log(`Import ID: ${data.importId}`);
    console.log(`File: ${data.fileName}`);
    console.log(`Date: ${data.importDate?.toDate()}`);
    console.log(`Status: ${data.status}`);
    if (data.stats) {
      console.log(`Stats:`, data.stats);
    }
    console.log('-'.repeat(50));
  });
  
  // Check total records
  const records = await db.collection('vf-onemap-processed-records').limit(10).get();
  console.log(`\nTotal records in database: ${records.size}+`);
  
  // Sample a few records
  if (records.size > 0) {
    console.log('\nSample records:');
    records.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.currentStatus || data.status}`);
    });
  }
}

checkImportStatus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });