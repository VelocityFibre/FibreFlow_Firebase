#!/usr/bin/env node

/**
 * Bulk import OneMap CSV to vf-onemap-data
 * Optimized for speed - no individual checks
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Key fields we care about
const KEY_FIELDS = [
  'Property ID', '1map NAD ID', 'Status', 'Flow Name Groups',
  'Site', 'Sections', 'PONs', 'Location Address',
  'Pole Number', 'Drop Number', 'Stand Number',
  'Field Agent Name (pole permission)', 'Last Modified Pole Permissions Date',
  'Latitude', 'Longitude'
];

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = null;
    let lineNumber = 0;

    rl.on('line', (line) => {
      lineNumber++;
      
      // Skip BOM if present
      if (lineNumber === 1 && line.charCodeAt(0) === 0xFEFF) {
        line = line.substr(1);
      }
      
      if (!headers) {
        headers = line.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        return;
      }

      const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length !== headers.length) {
        return; // Skip malformed rows
      }

      const record = {};
      headers.forEach((header, index) => {
        if (KEY_FIELDS.includes(header)) {
          record[header] = values[index] || '';
        }
      });

      if (record['Property ID']) {
        records.push(record);
      }
    });

    rl.on('close', () => {
      resolve(records);
    });

    rl.on('error', reject);
  });
}

async function importCSV(csvFileName) {
  try {
    console.log('🚀 Bulk import to vf-onemap-data...\n');
    
    const csvPath = path.join(__dirname, '../downloads', csvFileName);
    const records = await parseCSV(csvPath);
    
    console.log(`📊 Found ${records.length} records to import\n`);
    
    const batchSize = 500;
    const importBatchId = `IMP_${Date.now()}`;
    let processed = 0;
    
    // Process all records in batches without checking
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const chunk = records.slice(i, i + batchSize);
      
      for (const record of chunk) {
        const propertyId = record['Property ID'];
        const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
        
        const cleanRecord = {
          propertyId: propertyId,
          onemapNadId: record['1map NAD ID'] || '',
          status: record['Status'] || '',
          flowNameGroups: record['Flow Name Groups'] || '',
          site: record['Site'] || '',
          sections: record['Sections'] || '',
          pons: record['PONs'] || '',
          locationAddress: record['Location Address'] || '',
          poleNumber: record['Pole Number'] || '',
          dropNumber: record['Drop Number'] || '',
          standNumber: record['Stand Number'] || '',
          fieldAgentName: record['Field Agent Name (pole permission)'] || '',
          lastModifiedDate: record['Last Modified Pole Permissions Date'] || '',
          latitude: record['Latitude'] || '',
          longitude: record['Longitude'] || '',
          importBatchId: importBatchId,
          fileName: csvFileName,
          importedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(docRef, cleanRecord, { merge: true });
      }
      
      await batch.commit();
      processed += chunk.length;
      console.log(`✅ Imported ${processed}/${records.length} records...`);
    }
    
    // Save import summary
    await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
      batchId: importBatchId,
      fileName: csvFileName,
      totalRecords: records.length,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    });
    
    console.log(`\n✨ Import completed!`);
    console.log(`📁 Batch ID: ${importBatchId}`);
    console.log(`📊 Total records: ${processed}`);
    console.log(`\n🔍 View data at: https://console.firebase.google.com/project/vf-onemap-data/firestore/data/vf-onemap-processed-records`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line usage
const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node bulk-import-onemap.js <csv-filename>');
  process.exit(1);
}

importCSV(csvFile);