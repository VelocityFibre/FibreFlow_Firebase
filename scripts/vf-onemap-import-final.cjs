#!/usr/bin/env node

/**
 * Final vf-onemap-data Import Script
 * ==================================
 * 
 * Uses existing service account to connect to vf-onemap-data
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Use the existing service account file
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize for vf-onemap-data project (different from service account project)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data',  // Target project
  databaseURL: 'https://vf-onemap-data.firebaseio.com'
});

const db = admin.firestore();
db.settings({ 
  projectId: 'vf-onemap-data'  // Ensure we're using the right project
});

// Collection names
const COLLECTIONS = {
  processedRecords: 'vf-onemap-processed-records',
  importBatches: 'vf-onemap-import-batches',
  preImportReports: 'vf-onemap-pre-import-reports',
  postImportReports: 'vf-onemap-post-import-reports'
};

// CSV parsing function
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  const columnMapping = {
    'Property ID': 'propertyId',
    '1map NAD ID': 'oneMapNadId',
    'Pole Number': 'poleNumber',
    'Drop Number': 'dropNumber',
    'Status': 'status',
    'Flow Name Groups': 'flowNameGroups',
    'Sections': 'sections',
    'PONs': 'pons',
    'Location': 'location',
    'Address': 'address',
    'Field Agent Name (Home Sign Ups)': 'fieldAgentName',
    'Last Modified Home Sign Ups By': 'lastModifiedBy',
    'Last Modified Home Sign Ups Date': 'lastModifiedDate'
  };

  const columnIndices = {};
  headers.forEach((header, index) => {
    Object.keys(columnMapping).forEach((key) => {
      if (header.includes(key)) {
        columnIndices[columnMapping[key]] = index;
      }
    });
  });

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCsvLine(lines[i]);
    if (!values[columnIndices['propertyId']]) continue;

    const record = {};
    Object.keys(columnMapping).forEach(key => {
      const field = columnMapping[key];
      record[field] = values[columnIndices[field]] || '';
    });

    records.push(record);
  }

  return records;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Main import function
 */
async function runImport() {
  const csvFile = 'Lawley May Week 3 22052025 - First Report.csv';
  const batchId = `IMPORT_MAY22_${Date.now()}`;
  const startTime = Date.now();
  
  console.log('🚀 vf-onemap-data Import Process');
  console.log('================================');
  console.log('📧 Admin: louis@velocityfibreapp.com');
  console.log('🗄️  Target Database: vf-onemap-data');
  console.log('🔐 Using service account authentication');
  console.log('');
  
  try {
    // Test connection
    console.log('🔄 Testing database connection...');
    const testDoc = db.collection('test').doc('connection-test');
    await testDoc.set({
      timestamp: admin.firestore.Timestamp.now(),
      test: true,
      source: 'vf-onemap-import'
    });
    console.log('✅ Successfully connected to vf-onemap-data!');
    console.log('');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../OneMap/downloads', csvFile);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvFile}`);
    }
    
    console.log(`📁 Reading: ${csvFile}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const csvRecords = parseCSV(csvContent);
    console.log(`📊 Parsed ${csvRecords.length} records`);
    console.log('');
    
    // Pre-import analysis
    console.log('📋 PRE-IMPORT CSV ANALYSIS');
    console.log('-------------------------');
    console.log(`File: ${csvFile}`);
    console.log(`Total Records: ${csvRecords.length}`);
    
    const propertyIds = new Set(csvRecords.map(r => r.propertyId));
    const withPoleNumbers = csvRecords.filter(r => r.poleNumber).length;
    const withDropNumbers = csvRecords.filter(r => r.dropNumber).length;
    
    console.log(`Unique Property IDs: ${propertyIds.size}`);
    console.log(`Records with Pole Numbers: ${withPoleNumbers} (${((withPoleNumbers / csvRecords.length) * 100).toFixed(1)}%)`);
    console.log(`Records with Drop Numbers: ${withDropNumbers} (${((withDropNumbers / csvRecords.length) * 100).toFixed(1)}%)`);
    console.log('');
    
    // Import records
    console.log('🔄 Importing records to vf-onemap-data...');
    const batch = db.batch();
    let batchCount = 0;
    let newRecords = 0;
    const MAX_BATCH_SIZE = 500;
    
    for (const record of csvRecords) {
      const docRef = db.collection(COLLECTIONS.processedRecords).doc(record.propertyId);
      
      const importRecord = {
        ...record,
        importDate: admin.firestore.Timestamp.now(),
        importBatchId: batchId,
        sourceFile: csvFile,
        lastUpdated: admin.firestore.Timestamp.now()
      };
      
      batch.set(docRef, importRecord, { merge: true });
      batchCount++;
      newRecords++;
      
      // Show progress
      if (newRecords % 100 === 0) {
        console.log(`  Processing: ${newRecords}/${csvRecords.length} records...`);
      }
      
      // Commit batch if reaching limit
      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`  📦 Committed batch of ${batchCount} operations`);
        batchCount = 0;
      }
    }
    
    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  📦 Committed final batch of ${batchCount} operations`);
    }
    
    // Create batch record
    await db.collection(COLLECTIONS.importBatches).doc(batchId).set({
      id: batchId,
      fileName: csvFile,
      importDate: admin.firestore.Timestamp.now(),
      status: 'completed',
      totalRecords: csvRecords.length,
      recordsImported: newRecords
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log('');
    console.log('✅ IMPORT COMPLETE');
    console.log('==================');
    console.log(`Total Records Imported: ${newRecords}`);
    console.log(`Processing Time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`Batch ID: ${batchId}`);
    console.log('');
    console.log('📊 POST-IMPORT DATABASE STATE');
    console.log('----------------------------');
    console.log(`Records in vf-onemap-processed-records: ${newRecords}`);
    console.log(`Import batch created: ${batchId}`);
    console.log('');
    console.log('🌐 View your data at:');
    console.log('https://console.firebase.google.com/project/vf-onemap-data/firestore/data/~2Fvf-onemap-processed-records');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('1. Process May 23, 2025 file (with duplicate detection)');
    console.log('2. Generate comparison reports');
    console.log('3. Continue with remaining daily files');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('');
    
    if (error.code === 7) {
      console.error('⚠️  PERMISSION DENIED');
      console.error('');
      console.error('This usually means:');
      console.error('1. The service account doesn\'t have access to vf-onemap-data project');
      console.error('2. You need to grant permissions in the Firebase Console');
      console.error('');
      console.error('To fix:');
      console.error('1. Go to https://console.firebase.google.com/project/vf-onemap-data/settings/iam');
      console.error('2. Add the service account email with "Editor" role');
      console.error('3. Service account email is in: fibreflow-service-account.json');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runImport();
}

module.exports = { runImport };