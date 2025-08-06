#!/usr/bin/env node

/**
 * Safer Import Strategy - Line by Line Processing
 * No massive in-memory storage, proper validation
 */

const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../../credentials/vf-onemap-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

/**
 * Process CSV line by line without loading everything into memory
 */
async function processCSVLineByLine(csvPath, batchId) {
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let lineNumber = 0;
  let recordBuffer = [];
  const BATCH_SIZE = 100; // Process 100 records at a time
  
  const stats = {
    total: 0,
    newRecords: 0,
    statusChanges: 0,
    errors: 0,
    validationFailures: []
  };

  for await (const line of rl) {
    lineNumber++;
    
    // First line is headers
    if (lineNumber === 1) {
      headers = line.split(';');
      continue;
    }

    // Skip empty lines
    if (!line.trim()) continue;

    // Parse record
    const values = line.split(';');
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });

    // Add to buffer
    recordBuffer.push(record);
    
    // Process batch when buffer is full
    if (recordBuffer.length >= BATCH_SIZE) {
      await processBatch(recordBuffer, batchId, stats);
      recordBuffer = [];
    }
  }

  // Process remaining records
  if (recordBuffer.length > 0) {
    await processBatch(recordBuffer, batchId, stats);
  }

  return stats;
}

/**
 * Process a batch of records
 */
async function processBatch(records, batchId, stats) {
  const batch = db.batch();
  
  for (const record of records) {
    try {
      const propertyId = record['Property ID'];
      if (!propertyId) {
        stats.errors++;
        continue;
      }

      // Get ONLY this specific record from database
      const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
      const existingDoc = await docRef.get();
      const existingData = existingDoc.exists ? existingDoc.data() : null;

      // Process the record
      const result = await processRecord(record, existingData, batchId);
      
      if (result.isValid) {
        // Use set without merge - complete replacement
        batch.set(docRef, result.data);
        
        if (result.isNew) stats.newRecords++;
        if (result.statusChanged) stats.statusChanges++;
        stats.total++;
      } else {
        stats.validationFailures.push({
          propertyId,
          reason: result.reason
        });
      }
      
    } catch (error) {
      stats.errors++;
      console.error(`Error processing property ${record['Property ID']}: ${error.message}`);
    }
  }

  // Commit the batch
  await batch.commit();
  console.log(`✅ Processed batch of ${records.length} records`);
}

/**
 * Process individual record with validation
 */
async function processRecord(csvRecord, existingData, batchId) {
  const currentStatus = csvRecord['Status'] || csvRecord['Status Update'] || '';
  const propertyId = csvRecord['Property ID'];
  
  // Validation
  if (!propertyId) {
    return { isValid: false, reason: 'Missing Property ID' };
  }

  // Build complete record - ALL fields explicit
  const completeRecord = {
    propertyId: propertyId,
    currentStatus: currentStatus,
    
    // Location fields
    poleNumber: csvRecord['Pole Number'] || null,
    dropNumber: csvRecord['Drop Number'] || null,
    locationAddress: csvRecord['Location Address'] || null,
    
    // Agent fields
    fieldAgentName: csvRecord['Field Agent Name (pole permission)'] || null,
    
    // Timestamps
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    importBatchId: batchId,
    
    // Initialize or update status history
    statusHistory: []
  };

  let isNew = !existingData;
  let statusChanged = false;

  // Handle status history properly
  if (existingData && existingData.statusHistory) {
    // Copy existing history
    completeRecord.statusHistory = [...existingData.statusHistory];
    
    // Check if status actually changed
    const lastEntry = completeRecord.statusHistory[completeRecord.statusHistory.length - 1];
    const lastStatus = lastEntry ? lastEntry.status : existingData.currentStatus;
    
    if (currentStatus && currentStatus !== lastStatus) {
      // Validate the status transition
      if (isValidStatusTransition(lastStatus, currentStatus)) {
        completeRecord.statusHistory.push({
          date: new Date().toISOString().split('T')[0],
          status: currentStatus,
          previousStatus: lastStatus,
          batchId: batchId,
          agent: completeRecord.fieldAgentName
        });
        statusChanged = true;
      } else {
        return { 
          isValid: false, 
          reason: `Invalid status transition: ${lastStatus} → ${currentStatus}` 
        };
      }
    }
  } else if (currentStatus) {
    // New record with status
    completeRecord.statusHistory = [{
      date: new Date().toISOString().split('T')[0],
      status: currentStatus,
      batchId: batchId,
      agent: completeRecord.fieldAgentName
    }];
  }

  return {
    isValid: true,
    data: completeRecord,
    isNew: isNew,
    statusChanged: statusChanged
  };
}

/**
 * Validate status transitions
 */
function isValidStatusTransition(oldStatus, newStatus) {
  // Define valid transitions
  const validTransitions = {
    'Home Sign Ups: Approved & Installation Scheduled': [
      'Home Installation: In Progress',
      'Home Installation: Installed',
      'Home Sign Ups: Declined'
    ],
    'Home Installation: In Progress': [
      'Home Installation: Installed',
      'Home Sign Ups: Approved & Installation Scheduled', // Rescheduled
      'Home Installation: Failed'
    ],
    'Pole Permission: Approved': [
      'Home Sign Ups: Approved & Installation Scheduled',
      'Pole Permission: Declined'
    ]
  };

  // If no old status, any status is valid (new record)
  if (!oldStatus) return true;
  
  // Check if transition is valid
  const allowedTransitions = validTransitions[oldStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Generate detailed import report
 */
async function generateImportReport(stats, batchId) {
  const report = {
    batchId: batchId,
    timestamp: new Date().toISOString(),
    summary: {
      totalProcessed: stats.total,
      newRecords: stats.newRecords,
      statusChanges: stats.statusChanges,
      errors: stats.errors,
      validationFailures: stats.validationFailures.length
    },
    validationDetails: stats.validationFailures
  };

  // Save report
  const reportPath = path.join(__dirname, '../../reports', `import_${batchId}.json`);
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Import Report:');
  console.log(`Total Processed: ${stats.total}`);
  console.log(`New Records: ${stats.newRecords}`);
  console.log(`Status Changes: ${stats.statusChanges}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Validation Failures: ${stats.validationFailures.length}`);
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Main execution
if (require.main === module) {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.log('Usage: node safer-import-strategy.js <csv-file>');
    process.exit(1);
  }

  const batchId = `IMP_${Date.now()}`;
  console.log(`🚀 Starting safe import with batch ID: ${batchId}\n`);

  processCSVLineByLine(csvFile, batchId)
    .then(stats => generateImportReport(stats, batchId))
    .catch(error => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}