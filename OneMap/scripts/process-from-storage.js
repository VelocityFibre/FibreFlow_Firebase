#!/usr/bin/env node

/**
 * Process CSV files from Firebase Storage to Firestore
 * Uses Property ID as unique identifier to avoid duplicates
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

// Process a single CSV file from Storage
async function processCSVFromStorage(fileName) {
  console.log(`\n📄 Processing: ${fileName}`);
  
  const file = bucket.file(fileName);
  const [exists] = await file.exists();
  
  if (!exists) {
    console.error(`❌ File not found: ${fileName}`);
    return;
  }

  const batch = db.batch();
  let recordCount = 0;
  let batchCount = 0;
  const errors = [];

  return new Promise((resolve, reject) => {
    file.createReadStream()
      .pipe(csv({
        separator: ';', // Based on your sample data
        headers: true
      }))
      .pipe(new Transform({
        objectMode: true,
        transform(record, encoding, callback) {
          try {
            // Use Property ID as document ID (ensures uniqueness)
            const propertyId = record['Property ID'];
            
            if (!propertyId) {
              errors.push(`Row ${recordCount + 1}: Missing Property ID`);
              callback();
              return;
            }

            const docRef = db.collection('raw_imports').doc(propertyId);
            
            // Add to batch with merge option (handles duplicates)
            batch.set(docRef, {
              ...record,
              _importedAt: admin.firestore.FieldValue.serverTimestamp(),
              _sourceFile: fileName,
              _importBatch: new Date().toISOString()
            }, { merge: true });

            recordCount++;
            batchCount++;

            // Commit batch every 400 documents (Firestore limit is 500)
            if (batchCount >= 400) {
              batch.commit()
                .then(() => {
                  console.log(`  ✓ Committed ${recordCount} records...`);
                  batchCount = 0;
                  callback();
                })
                .catch(err => {
                  errors.push(`Batch commit error: ${err.message}`);
                  callback(err);
                });
            } else {
              callback();
            }
          } catch (error) {
            errors.push(`Row ${recordCount + 1}: ${error.message}`);
            callback();
          }
        }
      }))
      .on('end', async () => {
        // Commit remaining records
        if (batchCount > 0) {
          await batch.commit();
        }
        
        console.log(`\n✅ Import Complete:`);
        console.log(`   - Records processed: ${recordCount}`);
        console.log(`   - Errors: ${errors.length}`);
        
        // Log import metadata
        await db.collection('import_logs').add({
          fileName,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          recordCount,
          errors,
          status: errors.length === 0 ? 'success' : 'completed_with_errors'
        });
        
        resolve({ recordCount, errors });
      })
      .on('error', reject);
  });
}

// List all CSV files in storage
async function listStorageFiles() {
  const [files] = await bucket.getFiles({
    prefix: 'csv-uploads/'
  });
  
  return files
    .filter(file => file.name.endsWith('.csv'))
    .map(file => file.name);
}

// Main execution
async function main() {
  try {
    console.log('🔍 Looking for CSV files in Firebase Storage...\n');
    
    const files = await listStorageFiles();
    
    if (files.length === 0) {
      console.log('No CSV files found in storage.');
      console.log('Upload files to: gs://vf-onemap-data.firebasestorage.app/csv-uploads/');
      return;
    }
    
    console.log(`Found ${files.length} CSV files:`);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    // Process first file
    console.log('\n🚀 Processing first file...');
    await processCSVFromStorage(files[0]);
    
    console.log('\n💡 To process all files, run:');
    console.log('   node scripts/batch-process-all.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}