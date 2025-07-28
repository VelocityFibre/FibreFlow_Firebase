#!/usr/bin/env node

/**
 * Import OneMap CSV to vf-onemap-data
 * Handles the complex CSV structure with many columns
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Check if service account exists
const serviceAccountPath = path.join(__dirname, '../credentials/vf-onemap-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account not found at:', serviceAccountPath);
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Key fields we care about
const KEY_FIELDS = [
  'Property ID',
  '1map NAD ID', 
  'Status',
  'Flow Name Groups',
  'Site',
  'Sections',
  'PONs',
  'Location Address',
  'Pole Number',
  'Drop Number',
  'Stand Number',
  'Field Agent Name (pole permission)',
  'Last Modified Pole Permissions Date',
  'Latitude',
  'Longitude'
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
        // Parse headers - handle complex delimiter
        headers = line.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        console.log(`📊 Found ${headers.length} columns`);
        return;
      }

      // Parse data row
      const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length !== headers.length) {
        console.warn(`⚠️  Line ${lineNumber}: Expected ${headers.length} columns, got ${values.length}`);
        return;
      }

      const record = {};
      
      // Only extract key fields to reduce data size
      headers.forEach((header, index) => {
        if (KEY_FIELDS.includes(header) || header === 'Property ID') {
          record[header] = values[index] || '';
        }
      });

      // Must have Property ID
      if (record['Property ID']) {
        records.push(record);
      }
    });

    rl.on('close', () => {
      console.log(`✅ Parsed ${records.length} valid records`);
      resolve(records);
    });

    rl.on('error', reject);
  });
}

async function importCSV(csvFileName) {
  try {
    console.log('🚀 Starting import to vf-onemap-data...\n');
    
    const csvPath = path.join(__dirname, '../downloads', csvFileName);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV not found: ${csvPath}`);
    }
    
    // Parse CSV
    console.log('📄 Parsing CSV file...');
    const records = await parseCSV(csvPath);
    
    if (records.length === 0) {
      throw new Error('No valid records found in CSV');
    }
    
    console.log(`\n📊 Sample record:`, JSON.stringify(records[0], null, 2));
    
    // Import in batches
    const batchSize = 500;
    const importBatchId = `IMP_${Date.now()}`;
    let processed = 0;
    let newCount = 0;
    let updateCount = 0;
    
    console.log(`\n📤 Starting import with batch ID: ${importBatchId}\n`);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const chunk = records.slice(i, i + batchSize);
      
      for (const record of chunk) {
        const propertyId = record['Property ID'];
        const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
        
        // Check if exists
        const existing = await docRef.get();
        if (existing.exists) {
          updateCount++;
        } else {
          newCount++;
        }
        
        // Clean up the record
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
        processed++;
      }
      
      await batch.commit();
      console.log(`✅ Processed ${processed}/${records.length} records...`);
    }
    
    // Save import summary
    await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
      batchId: importBatchId,
      fileName: csvFileName,
      totalRecords: records.length,
      newRecords: newCount,
      updatedRecords: updateCount,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    });
    
    console.log(`\n✨ Import completed!`);
    console.log(`📁 Batch ID: ${importBatchId}`);
    console.log(`📊 Total: ${processed}, New: ${newCount}, Updated: ${updateCount}`);
    
    // Clean up
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Command line usage
const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node import-onemap-csv.js <csv-filename>');
  console.log('Example: node import-onemap-csv.js "Lawley May Week 3 22052025 - First Report.csv"');
  process.exit(1);
}

importCSV(csvFile);