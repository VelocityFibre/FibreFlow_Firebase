#!/usr/bin/env node

/**
 * SPOT CHECK VERIFICATION
 * Quick tool to verify a single property against CSV files
 * 
 * Usage: node spot-check-property.js 308025
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Initialize Firebase
const serviceAccount = require('../../credentials/vf-onemap-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function spotCheck(propertyId) {
  console.log(`\n🔍 SPOT CHECK FOR PROPERTY: ${propertyId}`);
  console.log('=' .repeat(50));
  
  // 1. Get database record
  console.log('\n📊 DATABASE RECORD:');
  const doc = await db.collection('vf-onemap-processed-records').doc(propertyId).get();
  
  if (!doc.exists) {
    console.log('❌ Property not found in database!');
    return;
  }
  
  const data = doc.data();
  console.log(`Current Status: ${data.currentStatus}`);
  console.log(`Status History: ${data.statusHistory ? data.statusHistory.length : 0} changes`);
  
  if (data.statusHistory) {
    data.statusHistory.forEach((change, i) => {
      console.log(`  ${i + 1}. ${change.fromStatus} → ${change.toStatus} (${change.date})`);
    });
  }
  
  // 2. Check CSV files
  console.log('\n📁 CSV FILE APPEARANCES:');
  const csvDir = path.join(__dirname, '../../downloads/Lawley Raw Stats');
  const csvFiles = fs.readdirSync(csvDir)
    .filter(f => f.endsWith('.csv'))
    .sort();
  
  const appearances = [];
  
  for (const fileName of csvFiles) {
    await new Promise((resolve) => {
      let found = false;
      fs.createReadStream(path.join(csvDir, fileName))
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          const id = (row['Property ID'] || row['﻿Property ID'] || '').toString().trim();
          if (id === propertyId) {
            found = true;
            appearances.push({
              fileName,
              status: (row['Status'] || '').toString().trim(),
              poleNumber: (row['Pole Number'] || '').toString().trim(),
              agent: (row['Field Agent Name'] || '').toString().trim()
            });
          }
        })
        .on('end', () => {
          if (!found) {
            console.log(`  ❌ Not in ${fileName}`);
          }
          resolve();
        });
    });
  }
  
  console.log(`\nFound in ${appearances.length} CSV files:`);
  appearances.forEach((app, i) => {
    console.log(`  ${i + 1}. ${app.fileName}`);
    console.log(`     Status: ${app.status}`);
    console.log(`     Pole: ${app.poleNumber || 'None'}`);
    console.log(`     Agent: ${app.agent || 'None'}`);
  });
  
  // 3. Verify status progression
  console.log('\n✅ VERIFICATION:');
  let previousStatus = null;
  let actualChanges = 0;
  
  for (const app of appearances) {
    if (previousStatus && previousStatus !== app.status) {
      actualChanges++;
      console.log(`  Change detected: ${previousStatus} → ${app.status}`);
    }
    previousStatus = app.status;
  }
  
  const dbChanges = data.statusHistory ? data.statusHistory.length - 1 : 0; // -1 for initial
  console.log(`\n📊 Summary:`);
  console.log(`  CSV shows ${actualChanges} status changes`);
  console.log(`  Database shows ${dbChanges} status changes`);
  console.log(`  Match: ${actualChanges === dbChanges ? '✅ YES' : '❌ NO'}`);
}

// Run
const propertyId = process.argv[2];
if (!propertyId) {
  console.log('Usage: node spot-check-property.js <propertyId>');
  console.log('Example: node spot-check-property.js 308025');
  process.exit(1);
}

spotCheck(propertyId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });