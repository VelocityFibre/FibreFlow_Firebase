/**
 * IMPORT VALIDATION SCRIPT - Created 2025-08-05
 * Purpose: Compare database records against source CSV files
 * Ensures no phantom changes were created during import
 */

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../credentials/vf-onemap-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function validateProperty(propertyId, csvFiles) {
  console.log(`\n🔍 Validating Property ${propertyId}`);
  console.log('=' .repeat(50));
  
  // Get status changes from database
  const statusChanges = await db.collection('vf-onemap-status-changes')
    .where('propertyId', '==', propertyId)
    .orderBy('changeDate', 'asc')
    .get();
  
  console.log(`\n📊 Database shows ${statusChanges.size} status changes:`);
  statusChanges.forEach(doc => {
    const change = doc.data();
    console.log(`  [${change.changeDate}] ${change.fromStatus} → ${change.toStatus}`);
  });
  
  // Now check CSV files
  console.log(`\n📄 Checking CSV files:`);
  
  const csvStatuses = [];
  
  for (const csvFile of csvFiles) {
    const csvPath = path.join(__dirname, '../../downloads/Lawley Raw Stats', csvFile.file);
    
    if (!fs.existsSync(csvPath)) continue;
    
    await new Promise((resolve) => {
      fs.createReadStream(csvPath)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          const propId = (row['Property ID'] || row['﻿Property ID'] || '').toString().trim();
          if (propId === propertyId) {
            csvStatuses.push({
              date: csvFile.date,
              file: csvFile.file,
              status: (row['Status'] || '').toString().trim()
            });
          }
        })
        .on('end', resolve);
    });
  }
  
  // Show CSV progression
  console.log(`\nCSV Status Progression:`);
  let lastStatus = null;
  csvStatuses.forEach(entry => {
    const changed = lastStatus && lastStatus !== entry.status;
    console.log(`  [${entry.date}] ${entry.status} ${changed ? '← CHANGED' : ''}`);
    lastStatus = entry.status;
  });
  
  // Count real changes in CSV
  let realChanges = 0;
  for (let i = 1; i < csvStatuses.length; i++) {
    if (csvStatuses[i].status !== csvStatuses[i-1].status) {
      realChanges++;
    }
  }
  
  console.log(`\n✅ CSV shows ${realChanges} real status changes`);
  console.log(`📊 Database shows ${statusChanges.size} status changes`);
  
  if (realChanges === statusChanges.size) {
    console.log('✅ MATCH! No phantom changes detected');
  } else {
    console.log('❌ MISMATCH! Possible phantom changes');
  }
}

async function runValidation() {
  console.log('🎯 IMPORT ACCURACY VALIDATION - 2025-08-05');
  console.log('==========================================\n');
  
  // Properties to validate (our known problematic ones)
  const testProperties = ['308025', '291411', '292578', '307935', '308220'];
  
  // CSV files in order
  const csvFiles = [
    { file: 'Lawley June Week 2 13062025.csv', date: '2025-06-13' },
    { file: 'Lawley June Week 3 20062025.csv', date: '2025-06-20' },
    { file: 'Lawley June Week 3 22062025.csv', date: '2025-06-22' },
    { file: 'Lawley June Week 4 23062025.csv', date: '2025-06-23' }
  ];
  
  console.log('Validating properties:', testProperties.join(', '));
  console.log('Against CSV files:', csvFiles.map(f => f.date).join(', '));
  
  for (const propertyId of testProperties) {
    await validateProperty(propertyId, csvFiles);
  }
  
  // Summary statistics
  console.log('\n\n📊 VALIDATION SUMMARY');
  console.log('====================');
  
  const totalStatusChanges = await db.collection('vf-onemap-status-changes').count().get();
  console.log(`Total status changes in database: ${totalStatusChanges.data().count}`);
  
  const totalRecords = await db.collection('vf-onemap-processed-records').count().get();
  console.log(`Total records in database: ${totalRecords.data().count}`);
  
  process.exit(0);
}

// Command line usage
if (require.main === module) {
  runValidation();
}

module.exports = { validateProperty };