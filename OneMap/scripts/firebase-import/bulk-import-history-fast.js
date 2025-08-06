#!/usr/bin/env node

/**
 * Fast OneMap CSV Import with Status History
 * Optimized version that batches reads for better performance
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../../credentials/vf-onemap-service-account.json');

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
  'Latitude', 'Longitude', 'Status Update'
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

async function importCSVWithHistoryFast(csvFileName) {
  try {
    console.log('🚀 Fast import with status history tracking...\n');
    
    const csvPath = path.join(__dirname, '../../downloads', csvFileName);
    const records = await parseCSV(csvPath);
    
    console.log(`📊 Found ${records.length} records to import\n`);
    
    const batchSize = 500;
    const importBatchId = `IMP_${Date.now()}`;
    const importDate = new Date().toISOString();
    let processed = 0;
    let statusChanges = 0;
    let newRecords = 0;
    
    // Extract date from filename
    const dateMatch = csvFileName.match(/(\d{2})(\d{2})(\d{4})/);
    const csvDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : importDate.split('T')[0];
    
    // First, fetch all existing records in one go
    console.log('📖 Loading existing records for comparison...');
    const existingSnapshot = await db.collection('vf-onemap-processed-records').get();
    const existingRecords = new Map();
    
    existingSnapshot.forEach(doc => {
      existingRecords.set(doc.id, doc.data());
    });
    
    console.log(`Found ${existingRecords.size} existing records\n`);
    
    // Process all records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const chunk = records.slice(i, i + batchSize);
      
      for (const record of chunk) {
        const propertyId = record['Property ID'];
        const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
        
        // Get existing data from our map (no additional reads)
        const existingData = existingRecords.get(propertyId);
        
        // Get current status from CSV
        const currentStatus = record['Status Update'] || record['Status'] || '';
        const currentAgent = record['Field Agent Name (pole permission)'] || '';
        
        // Build status history entry
        const statusEntry = {
          date: csvDate,
          status: currentStatus,
          agent: currentAgent,
          batchId: importBatchId,
          fileName: csvFileName,
          timestamp: importDate
        };
        
        let statusHistory = [];
        let isStatusChange = false;
        
        if (existingData) {
          // Preserve existing history
          statusHistory = existingData.statusHistory || [];
          
          // Check if status actually changed
          const lastStatus = existingData.currentStatus || existingData['Status Update'];
          if (lastStatus !== currentStatus && currentStatus) {
            statusHistory.push(statusEntry);
            isStatusChange = true;
            statusChanges++;
          }
        } else {
          // New record - add initial status to history
          if (currentStatus) {
            statusHistory = [statusEntry];
          }
          newRecords++;
        }
        
        const cleanRecord = {
          // Core fields
          propertyId: propertyId,
          'Property ID': propertyId,
          onemapNadId: record['1map NAD ID'] || '',
          
          // Current status (latest)
          currentStatus: currentStatus,
          currentAgent: currentAgent,
          
          // Status history array
          statusHistory: statusHistory,
          
          // Other fields
          'Status Update': currentStatus,
          flowNameGroups: record['Flow Name Groups'] || '',
          site: record['Site'] || '',
          sections: record['Sections'] || '',
          pons: record['PONs'] || '',
          locationAddress: record['Location Address'] || '',
          'Location Address': record['Location Address'] || '',
          poleNumber: record['Pole Number'] || '',
          'Pole Number': record['Pole Number'] || '',
          dropNumber: record['Drop Number'] || '',
          'Drop Number': record['Drop Number'] || '',
          standNumber: record['Stand Number'] || '',
          fieldAgentName: currentAgent,
          'Field Agent Name (pole permission)': currentAgent,
          lastModifiedDate: record['Last Modified Pole Permissions Date'] || '',
          
          // GPS fields
          latitude: record['Latitude'] || '',
          'GPS Latitude': record['Latitude'] || '',
          longitude: record['Longitude'] || '',
          'GPS Longitude': record['Longitude'] || '',
          
          // Import metadata
          importBatchId: importBatchId,
          fileName: csvFileName,
          lastImportDate: importDate,
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          
          // Track if this record had a status change
          hadStatusChangeInImport: isStatusChange
        };
        
        batch.set(docRef, cleanRecord, { merge: true });
      }
      
      await batch.commit();
      processed += chunk.length;
      console.log(`✅ Imported ${processed}/${records.length} records...`);
    }
    
    // Save enhanced import summary
    await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
      batchId: importBatchId,
      fileName: csvFileName,
      csvDate: csvDate,
      totalRecords: records.length,
      newRecords: newRecords,
      statusChanges: statusChanges,
      existingRecordsUpdated: records.length - newRecords,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    });
    
    console.log(`\n✨ Import completed with history tracking!`);
    console.log(`📁 Batch ID: ${importBatchId}`);
    console.log(`📊 Total records: ${processed}`);
    console.log(`🆕 New properties: ${newRecords}`);
    console.log(`🔄 Status changes detected: ${statusChanges}`);
    console.log(`📅 CSV Date: ${csvDate}`);
    console.log(`\n🔍 View data at: https://console.firebase.google.com/project/vf-onemap-data/firestore/data/vf-onemap-processed-records`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Command line usage
const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node bulk-import-history-fast.js <csv-filename>');
  console.log('Example: node bulk-import-history-fast.js "Lawley May Week 4 26052025.csv"');
  process.exit(1);
}

importCSVWithHistoryFast(csvFile);