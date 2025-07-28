#!/usr/bin/env node

/**
 * Import CSV Data from FibreFlow Storage to VF OneMap
 * 
 * This script reads CSV files directly from FibreFlow's storage bucket
 * No need to copy files - we read them directly!
 * 
 * Benefits:
 * - Janice uploads through FibreFlow (authenticated)
 * - Scripts read from FibreFlow storage (service account)
 * - Same speed as local storage
 * - No duplicate storage costs
 */

require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');
const csv = require('csv-parser');
const { Transform } = require('stream');

// Initialize VF OneMap Admin SDK for writing to database
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize FibreFlow Storage for reading files
const { Storage } = require('@google-cloud/storage');
const fibreflowStorage = new Storage({
  projectId: 'fibreflow-73daf',
  keyFilename: '../credentials/vf-onemap-service-account.json' // Service account can read from both
});

const fibreflowBucket = fibreflowStorage.bucket('fibreflow-73daf.firebasestorage.app');

// Import a single CSV file from FibreFlow Storage
async function importCSVFromFibreFlow(fileName) {
  console.log(`\n📄 Reading from FibreFlow Storage: ${fileName}`);
  console.log(`📍 Source: gs://fibreflow-73daf.firebasestorage.app/${fileName}`);
  console.log(`🎯 Target: VF OneMap Database (raw_onemap_data collection)`);
  
  const file = fibreflowBucket.file(fileName);
  const [exists] = await file.exists();
  
  if (!exists) {
    console.error(`❌ File not found in FibreFlow storage: ${fileName}`);
    return { totalRecords: 0, newRecords: 0, duplicates: 0 };
  }

  let batch = db.batch();
  let totalRecords = 0;
  let newRecords = 0;
  let duplicates = 0;
  let batchCount = 0;

  return new Promise((resolve, reject) => {
    file.createReadStream()
      .pipe(csv({
        separator: ';', // OneMap CSV format
        headers: true
      }))
      .pipe(new Transform({
        objectMode: true,
        async transform(record, encoding, callback) {
          try {
            // Use Property ID as unique identifier
            const propertyId = record['Property ID'];
            
            if (!propertyId) {
              console.warn(`⚠️  Row ${totalRecords + 1}: Missing Property ID - skipping`);
              totalRecords++;
              callback();
              return;
            }

            // Check if this Property ID already exists
            const docRef = db.collection('raw_onemap_data').doc(propertyId);
            const docSnapshot = await docRef.get();
            
            if (docSnapshot.exists) {
              // DUPLICATE - Skip this record
              duplicates++;
              totalRecords++;
              callback();
              return;
            }

            // NEW RECORD - Add to batch
            batch.set(docRef, {
              ...record, // Import ALL fields AS-IS
              _propertyId: propertyId,
              _importedAt: admin.firestore.FieldValue.serverTimestamp(),
              _sourceFile: fileName,
              _sourceBucket: 'fibreflow-73daf.firebasestorage.app',
              _importDate: new Date().toISOString().split('T')[0]
            });

            newRecords++;
            totalRecords++;
            batchCount++;

            // Commit batch every 400 documents
            if (batchCount >= 400) {
              await batch.commit();
              console.log(`  ✓ Imported ${newRecords} new records so far...`);
              batch = db.batch();
              batchCount = 0;
            }
            
            callback();
          } catch (error) {
            console.error(`❌ Error at row ${totalRecords + 1}: ${error.message}`);
            callback();
          }
        }
      }))
      .on('end', async () => {
        // Commit remaining records
        if (batchCount > 0) {
          await batch.commit();
        }
        
        console.log(`\n✅ Import Complete for ${fileName}:`);
        console.log(`   - Total records in file: ${totalRecords}`);
        console.log(`   - NEW records imported: ${newRecords}`);
        console.log(`   - DUPLICATES skipped: ${duplicates}`);
        
        // Log import summary
        await db.collection('import_logs').add({
          fileName,
          sourceBucket: 'fibreflow-73daf.firebasestorage.app',
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          totalRecords,
          newRecords,
          duplicates,
          status: 'raw_import_complete'
        });
        
        resolve({ totalRecords, newRecords, duplicates });
      })
      .on('error', reject);
  });
}

// List CSV files in FibreFlow storage
async function listFibreFlowCSVFiles() {
  console.log('🔍 Checking FibreFlow Storage for CSV files...');
  
  const [files] = await fibreflowBucket.getFiles({
    prefix: 'csv-uploads/'
  });
  
  return files
    .filter(file => file.name.endsWith('.csv'))
    .map(file => file.name)
    .sort(); // Sort by filename
}

// Main execution
async function main() {
  try {
    console.log('🚀 FibreFlow → VF OneMap Import Process\n');
    console.log('📋 Process:');
    console.log('   1. Read CSV files from FibreFlow Storage');
    console.log('   2. Import to VF OneMap Database');
    console.log('   3. Use Property ID for deduplication');
    console.log('   4. Track all imports in import_logs\n');
    
    const files = await listFibreFlowCSVFiles();
    
    if (files.length === 0) {
      console.log('No CSV files found in FibreFlow storage.');
      console.log('\n💡 Upload files through: https://fibreflow-73daf.web.app/analytics/pole-permissions/upload');
      return;
    }
    
    console.log(`\nFound ${files.length} CSV files in FibreFlow:`);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    // Process all files
    console.log('\n🚀 Starting import process...');
    let totalImported = 0;
    
    for (const file of files) {
      const result = await importCSVFromFibreFlow(file);
      totalImported += result.newRecords;
    }
    
    console.log('\n📊 Final Summary:');
    console.log(`   Total files processed: ${files.length}`);
    console.log(`   Total records imported: ${totalImported}`);
    console.log(`   Database: VF OneMap (raw_onemap_data collection)`);
    console.log('\n💡 Next step: Run processing script for Hein\'s specification');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}