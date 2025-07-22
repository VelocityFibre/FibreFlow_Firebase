#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../fibreflow-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://fibreflow-73daf.firebaseio.com'
  });
}

const db = admin.firestore();

async function countJune5InStaging() {
  console.log('=== JUNE 5TH STAGING DATA ===\n');
  
  // Check staging collection for records with June 5th import ID
  const stagingRef = db.collection('onemap-processing-staging');
  const june5ImportId = 'IMP_2025-07-22_1753170051183';
  
  console.log(`Counting records with import ID: ${june5ImportId}`);
  
  const june5Query = await stagingRef
    .where('import_id', '==', june5ImportId)
    .get();
    
  console.log(`\nRecords from June 5th import: ${june5Query.size}`);
  
  // Show a few sample records
  if (june5Query.size > 0) {
    console.log('\nSample records (first 3):');
    let count = 0;
    june5Query.forEach(doc => {
      if (count < 3) {
        const data = doc.data();
        console.log(`\n  Property ${data.property_id}:`);
        console.log(`    Status: ${data.status || 'No Status'}`);
        console.log(`    Pole: ${data.pole_number || 'No Pole'}`);
        console.log(`    Address: ${data.location_address || 'No Address'}`);
        count++;
      }
    });
  }
  
  // Get total count in staging
  console.log('\n=== TOTAL STAGING SUMMARY ===');
  const totalCount = await stagingRef.get();
  console.log(`Total records in staging: ${totalCount.size}`);
  
  // Count by import date pattern
  const importCounts = {};
  totalCount.forEach(doc => {
    const importId = doc.data().import_id;
    if (importId) {
      const date = importId.match(/IMP_(\d{4}-\d{2}-\d{2})/)?.[1] || 'unknown';
      importCounts[date] = (importCounts[date] || 0) + 1;
    }
  });
  
  console.log('\nRecords by import date:');
  Object.entries(importCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count} records`);
    });
}

countJune5InStaging()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });