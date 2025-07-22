#!/usr/bin/env node

/**
 * STEP 1: Import Raw CSV Data from Firebase Storage to Firestore
 * 
 * IMPORTANT: This script imports CSV data AS-IS without any filtering or processing
 * - Uses Property ID as unique identifier to prevent duplicates
 * - File A imports all records
 * - File B only imports NEW records (not in File A)
 * - File C only imports NEW records (not in A or B)
 * - And so on...
 * 
 * Processing according to Hein's specification happens AFTER import in a separate step
 */

require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');
const csv = require('csv-parser');
const { Transform } = require('stream');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vf-onemap-data.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Import a single CSV file - RAW DATA, NO PROCESSING
async function importRawCSV(fileName) {
  console.log(`\n📄 Importing RAW data from: ${fileName}`);
  console.log(`⚠️  Note: Importing AS-IS, no filtering or processing`);
  
  const file = bucket.file(fileName);
  const [exists] = await file.exists();
  
  if (!exists) {
    console.error(`❌ File not found: ${fileName}`);
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
        separator: ';', // Based on your OneMap CSV format
        headers: true
      }))
      .pipe(new Transform({
        objectMode: true,
        async transform(record, encoding, callback) {
          try {
            // CRITICAL: Use Property ID as unique identifier
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
              _propertyId: propertyId, // Ensure we have this field
              _importedAt: admin.firestore.FieldValue.serverTimestamp(),
              _sourceFile: fileName,
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

// List CSV files in storage (sorted by name/date)
async function listCSVFiles() {
  const [files] = await bucket.getFiles({
    prefix: 'csv-uploads/'
  });
  
  return files
    .filter(file => file.name.endsWith('.csv'))
    .map(file => file.name)
    .sort(); // Sort by filename (which includes dates)
}

// Main execution
async function main() {
  try {
    console.log('🔍 RAW CSV IMPORT - Step 1: Import AS-IS with deduplication\n');
    console.log('📋 Process:');
    console.log('   1. Import all records from first CSV');
    console.log('   2. Import only NEW records from subsequent CSVs');
    console.log('   3. Use Property ID for deduplication');
    console.log('   4. NO filtering or processing (that\'s Step 2)\n');
    
    const files = await listCSVFiles();
    
    if (files.length === 0) {
      console.log('No CSV files found in storage.');
      return;
    }
    
    console.log(`Found ${files.length} CSV files (sorted by date):`);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    // Import first file
    console.log('\n🚀 Importing first file (all records)...');
    const result = await importRawCSV(files[0]);
    
    console.log('\n📊 Summary:');
    console.log(`   Collection: raw_onemap_data`);
    console.log(`   Documents: ${result.newRecords}`);
    console.log('\n💡 Next steps:');
    console.log('   1. To import remaining files: node scripts/import-all-raw.js');
    console.log('   2. To process data per Hein\'s spec: node scripts/process-pole-permissions.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}