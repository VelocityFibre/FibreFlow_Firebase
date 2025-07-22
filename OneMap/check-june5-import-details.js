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

async function checkJune5Details() {
  console.log('=== JUNE 5TH IMPORT DETAILS ===\n');
  
  // Get the June 5th import document
  const importId = 'IMP_2025-07-22_1753170051183';
  const importDoc = await db.collection('onemap-processing-imports').doc(importId).get();
  
  if (!importDoc.exists) {
    console.log('June 5th import document not found!');
    return;
  }
  
  const data = importDoc.data();
  console.log('Import Details:');
  console.log(`  Import ID: ${importId}`);
  console.log(`  File: ${data.fileName}`);
  console.log(`  Status: ${data.status}`);
  console.log(`  Total Records: ${data.totalRecords || 'unknown'}`);
  console.log(`  Records Imported: ${data.recordsImported || 0}`);
  console.log(`  Error: ${data.error || 'none'}`);
  console.log(`  Started: ${data.startTime?.toDate() || 'unknown'}`);
  console.log(`  Completed: ${data.completionTime?.toDate() || 'not completed'}`);
  
  // Check if there's an error message
  if (data.error) {
    console.log(`\n⚠️  Import Error: ${data.error}`);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  if (data.status === 'completed' && data.recordsImported > 0) {
    console.log('✅ June 5th data successfully imported to staging');
    console.log(`   ${data.recordsImported} records imported`);
  } else if (data.status === 'processing') {
    console.log('⏳ June 5th import is still processing');
    console.log('   Status: May be stuck or failed without updating status');
    console.log('   Recommendation: Re-run the import');
  } else if (data.status === 'error') {
    console.log('❌ June 5th import failed with error');
    console.log('   Recommendation: Check error message and re-run import');
  } else {
    console.log('❓ June 5th import status unclear');
    console.log('   Recommendation: Re-run the import to ensure data is loaded');
  }
  
  console.log('\nTo import June 5th data:');
  console.log('node import-csv-efficient.js "downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv"');
}

checkJune5Details()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });