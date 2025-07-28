#!/usr/bin/env node

/**
 * Enhanced OneMap CSV Import with Duplicate Prevention
 * This version prevents duplicate poles from being created
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import duplicate prevention functions
const {
  checkPoleExists,
  validateImportForDuplicates,
  upsertPoleRecord,
  mergeNonEmptyFields
} = require('../prevent-duplicate-poles');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../../credentials/vf-onemap-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'vf-onemap-data'
  });
}

const db = admin.firestore();

// Key fields we care about
const KEY_FIELDS = [
  'Property ID', '1map NAD ID', 'Status', 'Flow Name Groups',
  'Site', 'Sections', 'PONs', 'Location Address',
  'Pole Number', 'Drop Number', 'Stand Number',
  'Field Agent Name (pole permission)', 'Last Modified Pole Permissions Date',
  'Latitude', 'Longitude', 'Status Update',
  'Field Agent Name (Home Sign Ups)'
];

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const allValues = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = [];
    let isFirstLine = true;

    rl.on('line', (line) => {
      allValues.push(line);
      
      if (isFirstLine) {
        headers = line.split(',').map(h => h.trim());
        isFirstLine = false;
      } else {
        const values = line.split(',').map(v => v.trim());
        const record = {};
        
        headers.forEach((header, index) => {
          if (KEY_FIELDS.includes(header)) {
            const camelCaseKey = header
              .replace(/[()]/g, '')
              .split(' ')
              .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join('');
            
            record[camelCaseKey] = values[index] || '';
          }
        });
        
        if (record.propertyId) {
          records.push(record);
        }
      }
    });

    rl.on('close', () => {
      resolve({ records, allHeaders: headers, allValues });
    });

    rl.on('error', reject);
  });
}

function extractDateFromFilename(filename) {
  const match = filename.match(/(\d{4})\s*-\s*(\d{2})\s*-\s*(\d{2})|(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{4})|(\w+)\s+(\d{1,2})/i);
  
  if (match) {
    if (match[1] && match[2] && match[3]) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    } else if (match[4] && match[5] && match[6]) {
      return `${match[6]}-${match[4]}-${match[5]}`;
    } else if (match[7] && match[8]) {
      const monthMap = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };
      const month = monthMap[match[7].toLowerCase().substring(0, 3)];
      const day = match[8].padStart(2, '0');
      return month ? `2025-${month}-${day}` : null;
    }
  }
  
  return null;
}

async function importCSVWithDuplicatePrevention(csvFileName) {
  try {
    console.log('🚀 Enhanced import with duplicate prevention...\n');
    
    const csvPath = path.join(__dirname, '../../downloads', csvFileName);
    const { records, allHeaders, allValues } = await parseCSV(csvPath);
    
    console.log(`📊 Found ${records.length} records to import\n`);
    
    // Extract date from filename
    const csvDate = extractDateFromFilename(csvFileName);
    if (!csvDate) {
      console.error('❌ Could not extract date from filename. Expected format: YYYY-MM-DD or "May 26"');
      process.exit(1);
    }
    
    // Validate records for duplicates
    console.log('🔍 Checking for duplicate poles...\n');
    const validation = await validateImportForDuplicates(records);
    
    if (validation.report.duplicateRecords > 0) {
      console.log(`\n⚠️  Found ${validation.report.duplicateRecords} duplicate records`);
      console.log(`   - Duplicates in CSV: ${validation.report.duplicatesInCSV.size} poles`);
      console.log(`   - Existing in database: ${validation.report.existingPoles.size} poles`);
      
      // Ask user what to do
      console.log('\nOptions:');
      console.log('1. Skip duplicates (only import new poles)');
      console.log('2. Update existing poles with new data');
      console.log('3. Cancel import');
      
      // For automated scripts, default to updating
      const updateExisting = true; // Change this based on your needs
      
      if (updateExisting) {
        console.log('\n✅ Proceeding with update of existing poles...\n');
      } else {
        console.log('\n✅ Skipping duplicates, only importing new poles...\n');
        records = validation.valid;
      }
    }
    
    // Process import with duplicate prevention
    const batchSize = 500;
    const importBatchId = `IMP_${Date.now()}`;
    const importDate = new Date().toISOString();
    let processed = 0;
    let created = 0;
    let updated = 0;
    let statusChanges = 0;
    let errors = 0;
    
    // Create import batch record
    await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
      batchId: importBatchId,
      fileName: csvFileName,
      csvDate: csvDate,
      totalRecords: records.length,
      status: 'processing',
      startedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)}...`);
      
      const promises = batch.map(async (record) => {
        try {
          processed++;
          
          // Check if pole exists
          const poleNumber = record.poleNumber || '';
          let existingDoc = null;
          
          if (poleNumber) {
            const poleCheck = await checkPoleExists(poleNumber);
            if (poleCheck.exists) {
              existingDoc = poleCheck;
            }
          }
          
          // If no pole number or pole doesn't exist, check by property ID
          if (!existingDoc) {
            const docRef = db.collection('vf-onemap-processed-records').doc(record.propertyId);
            const doc = await docRef.get();
            if (doc.exists) {
              existingDoc = {
                exists: true,
                documentId: doc.id,
                data: doc.data()
              };
            }
          }
          
          // Prepare data for upsert
          const importData = {
            ...record,
            importBatchId: importBatchId,
            importTimestamp: importDate,
            csvDate: csvDate
          };
          
          if (existingDoc && existingDoc.exists) {
            // Update existing record
            const mergedData = mergeNonEmptyFields(existingDoc.data, importData);
            
            // Check for status change
            if (existingDoc.data.statusUpdate !== record.statusUpdate && record.statusUpdate) {
              statusChanges++;
              
              // Create status change record
              await db.collection('vf-onemap-status-changes').add({
                propertyId: record.propertyId,
                poleNumber: record.poleNumber || existingDoc.data.poleNumber || '',
                fromStatus: existingDoc.data.statusUpdate || 'Unknown',
                toStatus: record.statusUpdate,
                changeDate: csvDate,
                importTimestamp: importDate,
                importBatch: importBatchId,
                sourceFile: csvFileName,
                agent: record.fieldAgentNamePolePermission || ''
              });
            }
            
            await db.collection('vf-onemap-processed-records')
              .doc(existingDoc.documentId)
              .set(mergedData);
            
            updated++;
          } else {
            // Create new record
            await db.collection('vf-onemap-processed-records')
              .doc(record.propertyId)
              .set(importData);
            
            created++;
            
            // Create initial status record if has status
            if (record.statusUpdate) {
              await db.collection('vf-onemap-status-changes').add({
                propertyId: record.propertyId,
                poleNumber: record.poleNumber || '',
                fromStatus: 'New',
                toStatus: record.statusUpdate,
                changeDate: csvDate,
                importTimestamp: importDate,
                importBatch: importBatchId,
                sourceFile: csvFileName,
                agent: record.fieldAgentNamePolePermission || ''
              });
            }
          }
        } catch (error) {
          errors++;
          console.error(`Error processing record ${record.propertyId}:`, error.message);
        }
      });
      
      await Promise.all(promises);
      
      console.log(`Processed: ${processed}/${records.length} (Created: ${created}, Updated: ${updated}, Errors: ${errors})`);
    }
    
    // Update import batch status
    await db.collection('vf-onemap-import-batches').doc(importBatchId).update({
      recordsProcessed: processed,
      newRecords: created,
      updatedRecords: updated,
      statusChanges: statusChanges,
      errors: errors,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    });
    
    console.log(`\n✨ Import completed with duplicate prevention!`);
    console.log(`📁 Batch ID: ${importBatchId}`);
    console.log(`📊 Total processed: ${processed}`);
    console.log(`🆕 New records: ${created}`);
    console.log(`🔄 Updated records: ${updated}`);
    console.log(`📈 Status changes: ${statusChanges}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (validation.report.duplicateRecords > 0) {
      console.log(`\n📋 Duplicate Summary:`);
      console.log(`   Prevented ${validation.report.duplicatesInCSV.size} CSV duplicates`);
      console.log(`   Updated ${validation.report.existingPoles.size} existing poles`);
    }
    
    console.log(`\n🔍 View data at: https://console.firebase.google.com/project/vf-onemap-data/firestore/data/vf-onemap-processed-records`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Check command line arguments
if (process.argv.length < 3) {
  console.log('Usage: node bulk-import-with-duplicate-prevention.js <csv-filename>');
  console.log('Example: node bulk-import-with-duplicate-prevention.js "Lawley 2025-05-26.csv"');
  process.exit(1);
}

const csvFileName = process.argv[2];
importCSVWithDuplicatePrevention(csvFileName);