#!/usr/bin/env node

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

async function testSingleImport() {
  const csvPath = path.join(__dirname, '../../downloads/Lawley Raw Stats', 'Lawley May Week 3 22052025 - First Report.csv');
  
  console.log('Testing single record import...\n');
  
  let count = 0;
  const testRecord = await new Promise((resolve) => {
    fs.createReadStream(csvPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        count++;
        if (count === 1) {
          console.log('First row headers:', Object.keys(row));
        }
        if (count === 2) {
          resolve(row);
        }
      });
  });
  
  console.log('\nTest record:', testRecord);
  
  // Try to process it
  const propertyId = (testRecord['Property ID'] || testRecord['﻿Property ID'] || '').toString().trim();
  console.log(`\nProperty ID extracted: "${propertyId}"`);
  
  if (propertyId) {
    const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
    const existingDoc = await docRef.get();
    
    console.log(`\nDocument exists: ${existingDoc.exists}`);
    
    // Create test record
    const testData = {
      propertyId: propertyId,
      status: (testRecord['Status'] || '').toString().trim(),
      poleNumber: (testRecord['Pole Number'] || '').toString().trim(),
      statusHistory: [{
        date: new Date().toISOString(),
        fromStatus: 'Initial',
        toStatus: (testRecord['Status'] || '').toString().trim(),
        importBatch: 'TEST'
      }],
      lastModified: new Date()
    };
    
    console.log('\nAttempting to save:', testData);
    
    try {
      await docRef.set(testData);
      console.log('✅ Successfully saved!');
    } catch (error) {
      console.error('❌ Error saving:', error);
    }
  }
}

testSingleImport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });