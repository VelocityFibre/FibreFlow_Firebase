#!/usr/bin/env node

/**
 * OPTIMIZED IMPORT SCRIPT - Created 2025-08-05
 * 
 * Handles timeouts better with smaller batch sizes and progress updates
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

// Smaller batch size to avoid timeouts
const BATCH_SIZE = 100; // Reduced from 400

async function optimizedImport(csvFileName) {
  console.log(`\n🚀 OPTIMIZED IMPORT SCRIPT (2025-08-05): ${csvFileName}`);
  console.log('✅ Smaller batches (100 records)');
  console.log('✅ Better progress tracking');
  console.log('✅ Status history preserved\n');
  
  const csvPath = path.join(__dirname, '../../downloads/Lawley Raw Stats', csvFileName);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    return;
  }
  
  const importBatchId = `OPT_2025-08-05_${Date.now()}`;
  console.log(`Import Batch ID: ${importBatchId}\n`);
  
  const stats = {
    total: 0,
    new: 0,
    updated: 0,
    unchanged: 0,
    statusChanges: 0,
    errors: 0,
    processed: 0
  };
  
  // First, collect all records
  console.log('📊 Reading CSV file...');
  const recordsToProcess = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        stats.total++;
        
        const propertyId = (row['Property ID'] || row['﻿Property ID'] || '').toString().trim();
        
        if (!propertyId || propertyId.length < 3) {
          stats.errors++;
          return;
        }
        
        const csvRecord = {
          propertyId: propertyId,
          poleNumber: (row['Pole Number'] || '').toString().trim() || null,
          dropNumber: (row['Drop Number'] || '').toString().trim() || null,
          status: (row['Status'] || '').toString().trim() || null,
          flowNameGroups: (row['Flow Name Groups'] || '').toString().trim() || null,
          locationAddress: (row['Location Address'] || '').toString().trim() || null,
          site: (row['Site'] || '').toString().trim() || null,
          agent: (row['Field Agent Name (pole permission)'] || row['Field Agent Name'] || '').toString().trim() || null,
          sections: (row['Sections'] || '').toString().trim() || null,
          pons: (row['PONs'] || '').toString().trim() || null
        };
        
        recordsToProcess.push(csvRecord);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`✅ Parsed ${recordsToProcess.length} valid records from ${stats.total} total rows\n`);
  
  // Process in batches
  const totalBatches = Math.ceil(recordsToProcess.length / BATCH_SIZE);
  console.log(`Processing in ${totalBatches} batches of ${BATCH_SIZE} records each...\n`);
  
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const startIdx = batchNum * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, recordsToProcess.length);
    const batchRecords = recordsToProcess.slice(startIdx, endIdx);
    
    console.log(`\n📦 Batch ${batchNum + 1}/${totalBatches} (records ${startIdx + 1}-${endIdx})`);
    
    const batch = db.batch();
    
    // Process each record
    for (const csvRecord of batchRecords) {
      try {
        const docRef = db.collection('vf-onemap-processed-records').doc(csvRecord.propertyId);
        const existingDoc = await docRef.get();
        
        let statusHistory = [];
        let hadStatusChange = false;
        
        if (existingDoc.exists) {
          const existingData = existingDoc.data();
          statusHistory = existingData.statusHistory || [];
          
          if (existingData.status !== csvRecord.status) {
            const statusEntry = {
              date: new Date().toISOString(),
              fromStatus: existingData.status || 'No Status',
              toStatus: csvRecord.status || 'No Status',
              agent: csvRecord.agent || 'Unknown',
              importBatch: importBatchId,
              fileName: csvFileName,
              timestamp: admin.firestore.Timestamp.now()
            };
            statusHistory.push(statusEntry);
            hadStatusChange = true;
            stats.statusChanges++;
            stats.updated++;
            
            console.log(`  📝 Status change - ${csvRecord.propertyId}: ${statusEntry.fromStatus} → ${statusEntry.toStatus}`);
          } else {
            stats.unchanged++;
          }
        } else {
          const statusEntry = {
            date: new Date().toISOString(),
            fromStatus: 'Initial',
            toStatus: csvRecord.status || 'No Status',
            agent: csvRecord.agent || 'Unknown',
            importBatch: importBatchId,
            fileName: csvFileName,
            timestamp: admin.firestore.Timestamp.now()
          };
          statusHistory = [statusEntry];
          stats.new++;
          
          console.log(`  🆕 New property ${csvRecord.propertyId}`);
        }
        
        // Prepare final record
        const finalRecord = {
          ...csvRecord,
          statusHistory: statusHistory,
          currentStatus: csvRecord.status || 'No Status',
          hadStatusChangeInImport: hadStatusChange,
          lastImportBatch: importBatchId,
          sourceFile: csvFileName,
          lastModified: new Date(),
          lastModifiedDate: new Date().toISOString(),
          importTimestamp: admin.firestore.Timestamp.now()
        };
        
        batch.set(docRef, finalRecord);
        stats.processed++;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${csvRecord.propertyId}:`, error.message);
        stats.errors++;
      }
    }
    
    // Commit batch
    try {
      await batch.commit();
      console.log(`  ✅ Batch ${batchNum + 1} committed successfully`);
    } catch (error) {
      console.error(`  ❌ Batch ${batchNum + 1} commit failed:`, error);
      throw error;
    }
    
    // Progress update
    const progress = Math.round((stats.processed / recordsToProcess.length) * 100);
    console.log(`  📊 Overall progress: ${progress}% (${stats.processed}/${recordsToProcess.length})`);
  }
  
  // Update import tracking
  await db.collection('import-tracking').doc(importBatchId).set({
    importId: importBatchId,
    fileName: csvFileName,
    importDate: new Date(),
    stats: stats,
    status: 'completed'
  });
  
  // Update CSV processing log
  const logPath = path.join(__dirname, '../../CSV_PROCESSING_LOG.md');
  const logEntry = `\n| ${new Date().toLocaleDateString()} | ${csvFileName} | ${new Date().toISOString()} | Completed (Optimized) |`;
  fs.appendFileSync(logPath, logEntry);
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Records: ${stats.total}`);
  console.log(`✅ New: ${stats.new}`);
  console.log(`📝 Updated: ${stats.updated}`);
  console.log(`➖ Unchanged: ${stats.unchanged}`);
  console.log(`🔄 Status Changes: ${stats.statusChanges}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`✅ Processed: ${stats.processed}`);
  console.log(`\n🆔 Import Batch: ${importBatchId}`);
  console.log('='.repeat(50));
  
  return stats;
}

// Command line usage
if (require.main === module) {
  const csvFileName = process.argv[2];
  
  if (!csvFileName) {
    console.log('\n🚀 OPTIMIZED IMPORT SCRIPT (2025-08-05)');
    console.log('\nUsage: node bulk-import-optimized-2025-08-05.js "filename.csv"');
    console.log('\nFeatures:');
    console.log('  - Smaller batch size (100) to avoid timeouts');
    console.log('  - Better progress tracking');
    console.log('  - Full status history tracking');
    console.log('  - Complete document replacement');
    process.exit(1);
  }
  
  optimizedImport(csvFileName)
    .then(() => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizedImport };