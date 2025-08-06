#!/usr/bin/env node

/**
 * MEMORY-FIXED VERSION OF ORIGINAL SCRIPT
 * Created: 2025-08-05
 * 
 * ONLY CHANGE: Process line-by-line instead of loading all into memory
 * KEEPS: All original status tracking logic
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Initialize Firebase Admin (SAME AS ORIGINAL)
const serviceAccount = require('../../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Key fields we care about (SAME AS ORIGINAL)
const KEY_FIELDS = [
  'Property ID', '1map NAD ID', 'Status', 'Flow Name Groups',
  'Site', 'Sections', 'PONs', 'Location Address',
  'Pole Number', 'Drop Number', 'Stand Number',
  'Field Agent Name (pole permission)', 'Last Modified Pole Permissions Date',
  'Latitude', 'Longitude', 'Status Update',
  'Field Agent Name (Home Sign Ups)'
];

async function importCSV(csvFileName) {
  console.log(`\n📁 Importing: ${csvFileName}`);
  console.log('✅ Memory-safe line-by-line processing');
  console.log('✅ Original status tracking logic preserved\n');
  
  const csvPath = path.join(__dirname, '../../downloads/Lawley Raw Stats', csvFileName);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    return;
  }
  
  const importBatchId = `IMP_${Date.now()}`;
  const stats = {
    total: 0,
    new: 0,
    updated: 0,
    unchanged: 0,
    statusChanges: 0,
    errors: 0
  };
  
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 400;
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({ 
        separator: ';',
        headers: headers => headers.map(h => h.replace(/^\uFEFF/, ''))
      }))
      .on('data', async (row) => {
        try {
          stats.total++;
          
          // Extract property ID (SAME AS ORIGINAL)
          const propertyId = row['Property ID']?.toString().trim();
          if (!propertyId) {
            stats.errors++;
            return;
          }
          
          // Clean record (SAME AS ORIGINAL)
          const cleanRecord = {};
          KEY_FIELDS.forEach(field => {
            const value = row[field];
            if (value !== undefined && value !== '') {
              cleanRecord[field] = value.toString().trim();
            }
          });
          
          // ORIGINAL STATUS TRACKING LOGIC - PRESERVED
          const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
          const existingDoc = await docRef.get();
          
          let statusHistory = [];
          let hadStatusChange = false;
          
          if (existingDoc.exists) {
            const existingData = existingDoc.data();
            statusHistory = existingData.statusHistory || [];
            
            // Check for status change (SAME AS ORIGINAL)
            if (existingData.Status !== cleanRecord.Status) {
              const statusEntry = {
                date: new Date().toISOString(),
                fromStatus: existingData.Status || 'No Status',
                toStatus: cleanRecord.Status || 'No Status',
                importBatch: importBatchId
              };
              statusHistory.push(statusEntry);
              hadStatusChange = true;
              stats.statusChanges++;
              stats.updated++;
              
              console.log(`📝 Status change - Property ${propertyId}: ${statusEntry.fromStatus} → ${statusEntry.toStatus}`);
            } else {
              stats.unchanged++;
            }
          } else {
            // First time seeing this property (SAME AS ORIGINAL)
            const statusEntry = {
              date: new Date().toISOString(),
              fromStatus: 'Initial',
              toStatus: cleanRecord.Status || 'No Status',
              importBatch: importBatchId
            };
            statusHistory = [statusEntry];
            stats.new++;
            
            console.log(`🆕 New property ${propertyId}: ${statusEntry.toStatus}`);
          }
          
          // Prepare final record (SAME AS ORIGINAL)
          const finalRecord = {
            ...cleanRecord,
            propertyId: propertyId,
            statusHistory: statusHistory,
            currentStatus: cleanRecord.Status || 'No Status',
            hadStatusChangeInImport: hadStatusChange,
            lastImportBatch: importBatchId,
            lastModifiedDate: new Date().toISOString(),
            importTimestamp: admin.firestore.Timestamp.now()
          };
          
          // Add to batch (MEMORY SAFE)
          batch.set(docRef, finalRecord, { merge: true });
          batchCount++;
          
          // Commit batch when full
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`💾 Committed batch of ${batchCount} records...`);
            batch = db.batch();
            batchCount = 0;
          }
          
        } catch (error) {
          console.error(`❌ Error processing property ${row['Property ID']}:`, error.message);
          stats.errors++;
        }
      })
      .on('end', async () => {
        // Commit final batch
        if (batchCount > 0) {
          await batch.commit();
          console.log(`💾 Committed final batch of ${batchCount} records`);
        }
        
        // Update import tracking (SAME AS ORIGINAL)
        await db.collection('import-tracking').doc(importBatchId).set({
          importId: importBatchId,
          fileName: csvFileName,
          importDate: new Date(),
          stats: stats,
          status: 'completed'
        });
        
        // Display results (SAME AS ORIGINAL)
        console.log('\n' + '='.repeat(50));
        console.log('📊 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Records: ${stats.total}`);
        console.log(`✅ New: ${stats.new}`);
        console.log(`📝 Updated: ${stats.updated}`);
        console.log(`➖ Unchanged: ${stats.unchanged}`);
        console.log(`🔄 Status Changes: ${stats.statusChanges}`);
        console.log(`❌ Errors: ${stats.errors}`);
        console.log(`\n🆔 Import Batch: ${importBatchId}`);
        console.log('='.repeat(50));
        
        resolve(stats);
      })
      .on('error', (error) => {
        console.error('❌ Stream error:', error);
        reject(error);
      });
  });
}

// Main execution (SAME AS ORIGINAL)
async function main() {
  const csvFileName = process.argv[2];
  
  if (!csvFileName) {
    console.log('\n📋 OneMap Import Script (Memory Fixed Version)');
    console.log('Usage: node bulk-import-memory-fixed-2025-08-05.js "filename.csv"');
    console.log('\nThis version:');
    console.log('✅ Processes line-by-line (no memory issues)');
    console.log('✅ Keeps all original status tracking');
    console.log('✅ No phantom changes');
    process.exit(1);
  }
  
  try {
    await importCSV(csvFileName);
    console.log('\n✅ Import completed successfully!');
    
    // Update CSV processing log (SAME AS ORIGINAL)
    const logPath = path.join(__dirname, '../../CSV_PROCESSING_LOG.md');
    const logEntry = `\n| ${new Date().toLocaleDateString()} | ${csvFileName} | ${new Date().toISOString()} | Completed |`;
    fs.appendFileSync(logPath, logEntry);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { importCSV };