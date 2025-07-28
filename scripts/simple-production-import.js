#!/usr/bin/env node

/**
 * Simple Production Import - vf-onemap-data Collections
 * =====================================================
 * 
 * Uses existing FibreFlow Firebase with dedicated vf-onemap collections
 * No separate project needed - just isolated collections
 */

const fs = require('fs');
const path = require('path');

// Use existing Firebase Admin SDK setup from FibreFlow
const admin = require('firebase-admin');

// Initialize Firebase Admin (using existing service account)
if (!admin.apps.length) {
  try {
    // Try to use existing service account or default credentials
    admin.initializeApp({
      projectId: 'fibreflow-73daf'
    });
  } catch (error) {
    console.log('⚠️  Using Firebase Admin without service account');
    console.log('💡 Will use existing FibreFlow authentication');
  }
}

const db = admin.firestore();

// vf-onemap collections in existing FibreFlow database
const VF_COLLECTIONS = {
  importBatches: 'vf-onemap-import-batches',
  processedRecords: 'vf-onemap-processed-records', 
  importReports: 'vf-onemap-import-reports',
  changeHistory: 'vf-onemap-change-history'
};

const IMPORT_CONFIG = {
  projectName: 'Lawley Fiber Installation Project',
  csvFile: 'Lawley May Week 3 22052025 - First Report.csv',
  importDate: '2025-05-22',
  batchId: 'LAWLEY_MAY22_2025_BASELINE',
  isBaseline: true
};

console.log('🚀 vf-onemap-data Import (Baseline)');
console.log('====================================');
console.log(`📋 Project: ${IMPORT_CONFIG.projectName}`);
console.log(`📁 File: ${IMPORT_CONFIG.csvFile}`);
console.log(`🆔 Batch: ${IMPORT_CONFIG.batchId}`);
console.log(`🔥 Database: FibreFlow with vf-onemap collections`);
console.log('');

/**
 * Parse CSV (proven logic)
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  const columnMapping = {
    'Property ID': 'propertyId',
    'Pole Number': 'poleNumber',
    'Drop Number': 'dropNumber', 
    'Status': 'status',
    'Field Agent Name (Home Sign Ups)': 'fieldAgentName',
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

    records.push({
      propertyId: values[columnIndices['propertyId']] || '',
      poleNumber: values[columnIndices['poleNumber']] || '',
      dropNumber: values[columnIndices['dropNumber']] || '',
      status: values[columnIndices['status']] || '',
      fieldAgentName: values[columnIndices['fieldAgentName']] || '',
      lastModifiedDate: values[columnIndices['lastModifiedDate']] || ''
    });
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
 * Import records with Firestore batch
 */
async function importToFirestore(records) {
  console.log('📤 Importing to Firestore...');
  
  const batch = db.batch();
  const importResults = {
    newRecords: [],
    errors: []
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    try {
      const importRecord = {
        ...record,
        importDate: admin.firestore.Timestamp.now(),
        importBatchId: IMPORT_CONFIG.batchId,
        isNew: true,
        hasChanges: false,
        sourceFile: IMPORT_CONFIG.csvFile,
        isBaseline: IMPORT_CONFIG.isBaseline
      };
      
      const docRef = db.collection(VF_COLLECTIONS.processedRecords).doc(record.propertyId);
      batch.set(docRef, importRecord);
      
      importResults.newRecords.push(importRecord);
      
      if (i % 100 === 0) {
        console.log(`📊 Prepared ${i}/${records.length} records...`);
      }
      
    } catch (error) {
      console.error(`❌ Error preparing ${record.propertyId}:`, error);
      importResults.errors.push({ record, error: error.message });
    }
  }
  
  // Commit batch
  console.log('💾 Committing batch to Firestore...');
  await batch.commit();
  console.log(`✅ Imported ${importResults.newRecords.length} records successfully`);
  
  return importResults;
}

/**
 * Create import batch record
 */
async function createBatchRecord(recordCount, results) {
  const batchRecord = {
    id: IMPORT_CONFIG.batchId,
    filename: IMPORT_CONFIG.csvFile,
    projectName: IMPORT_CONFIG.projectName,
    importDate: admin.firestore.Timestamp.now(),
    totalRecords: recordCount,
    newRecords: results.newRecords.length,
    changedRecords: 0,
    unchangedRecords: 0, 
    errorRecords: results.errors.length,
    status: 'completed',
    isBaseline: true,
    processingTimeMs: 0
  };
  
  await db.collection(VF_COLLECTIONS.importBatches).doc(IMPORT_CONFIG.batchId).set(batchRecord);
  console.log(`✅ Import batch record created: ${IMPORT_CONFIG.batchId}`);
  
  return batchRecord;
}

/**
 * Generate import report
 */
async function generateReport(batchRecord) {
  const report = {
    batchId: IMPORT_CONFIG.batchId,
    reportType: 'baseline-import',
    generatedDate: admin.firestore.Timestamp.now(),
    recordCount: batchRecord.newRecords,
    summary: {
      totalRecords: batchRecord.totalRecords,
      newRecords: batchRecord.newRecords,
      changedRecords: 0,
      unchangedRecords: 0,
      errorRecords: batchRecord.errorRecords
    },
    projectName: IMPORT_CONFIG.projectName,
    sourceFile: IMPORT_CONFIG.csvFile,
    isBaseline: true
  };
  
  await db.collection(VF_COLLECTIONS.importReports).add(report);
  console.log('✅ Import report generated');
  
  return report;
}

/**
 * Main import function
 */
async function runImport() {
  const startTime = Date.now();
  
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '../OneMap/downloads', IMPORT_CONFIG.csvFile);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    console.log(`📁 Reading: ${IMPORT_CONFIG.csvFile}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parseCSV(csvContent);
    console.log(`📊 Parsed ${records.length} valid records`);
    
    if (records.length === 0) {
      throw new Error('No valid records found');
    }
    
    // Import to Firestore
    const results = await importToFirestore(records);
    
    // Create batch record
    const batchRecord = await createBatchRecord(records.length, results);
    
    // Generate report
    const report = await generateReport(batchRecord);
    
    const processingTime = Date.now() - startTime;
    
    console.log('');
    console.log('🎉 BASELINE IMPORT COMPLETED!');
    console.log('============================');
    console.log(`📊 Results:`);
    console.log(`   Total Records: ${report.summary.totalRecords}`);
    console.log(`   New Records: ${report.summary.newRecords}`);
    console.log(`   Error Records: ${report.summary.errorRecords}`);
    console.log(`   Processing Time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log('');
    console.log('🎯 Collections Created:');
    console.log(`   ✅ ${VF_COLLECTIONS.processedRecords} (${report.summary.newRecords} records)`);
    console.log(`   ✅ ${VF_COLLECTIONS.importBatches} (1 batch)`);
    console.log(`   ✅ ${VF_COLLECTIONS.importReports} (1 report)`);
    console.log('');
    console.log('📋 Ready for Next Test:');
    console.log(`   🔄 Process May 23, 2025 file`);
    console.log(`   🔍 Test duplicate detection`);
    console.log(`   📈 Validate change tracking`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run import
if (require.main === module) {
  runImport();
}

module.exports = { runImport, parseCSV, VF_COLLECTIONS, IMPORT_CONFIG };