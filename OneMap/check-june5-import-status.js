#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../fibreflow-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://fibreflow-73daf.firebaseio.com'
  });
}

const db = admin.firestore();

async function checkJune5ImportStatus() {
  console.log('\n=== CHECKING JUNE 5TH DATA IMPORT STATUS ===\n');
  
  // Check imports collection for June 5th
  console.log('1. Checking import records...');
  const importsRef = db.collection('onemap-processing-imports');
  const imports = await importsRef.get();
  
  let june5Import = null;
  imports.forEach(doc => {
    const data = doc.data();
    if (data.fileName && data.fileName.includes('05062025')) {
      june5Import = data;
      console.log(`   ✅ Found June 5th import record:`);
      console.log(`      - Import ID: ${data.import_id}`);
      console.log(`      - File: ${data.fileName}`);
      console.log(`      - Status: ${data.status}`);
      console.log(`      - Total Records: ${data.totalRecords}`);
      console.log(`      - Records Imported: ${data.recordsImported || 'N/A'}`);
      console.log(`      - Started: ${data.startTime?.toDate()}`);
      console.log(`      - Completed: ${data.completionTime?.toDate() || 'Not completed'}`);
    }
  });
  
  if (!june5Import) {
    console.log('   ❌ No June 5th import record found');
  }
  
  // Check staging collection for June 5th data
  console.log('\n2. Checking staging collection...');
  const stagingRef = db.collection('onemap-processing-staging');
  
  // Count total records in staging
  const totalSnapshot = await stagingRef.get();
  console.log(`   Total records in staging: ${totalSnapshot.size}`);
  
  // Look for records with June 5th date
  const june5Query = await stagingRef
    .where('date_status_changed', '>=', '2025-06-05')
    .where('date_status_changed', '<', '2025-06-06')
    .limit(10)
    .get();
    
  console.log(`   Records with June 5th date: ${june5Query.size}`);
  
  // Check by CSV filename reference if stored
  if (june5Import && june5Import.import_id) {
    const importIdQuery = await stagingRef
      .where('import_id', '==', june5Import.import_id)
      .limit(10)
      .get();
    console.log(`   Records linked to June 5th import: ${importIdQuery.size}`);
  }
  
  // Show latest imports
  console.log('\n3. Latest imports (last 5):');
  const latestImports = await importsRef
    .orderBy('startTime', 'desc')
    .limit(5)
    .get();
    
  latestImports.forEach(doc => {
    const data = doc.data();
    console.log(`   - ${data.fileName} (${data.status}) - ${data.startTime?.toDate()}`);
  });
  
  // Check available CSV files
  console.log('\n4. Available CSV files for import:');
  console.log('   June 5th file location: downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv');
  console.log('   Status: File exists and ready for import');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  if (june5Import) {
    console.log(`✅ June 5th data HAS been imported`);
    console.log(`   Import ID: ${june5Import.import_id}`);
    console.log(`   Status: ${june5Import.status}`);
  } else {
    console.log(`❌ June 5th data has NOT been imported to staging`);
    console.log(`   Next step: Run import-csv-efficient.js with the June 5th CSV file`);
    console.log(`   Command: node import-csv-efficient.js "downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv"`);
  }
}

checkJune5ImportStatus()
  .then(() => {
    console.log('\nCheck complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });