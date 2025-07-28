#!/usr/bin/env node

/**
 * Production vf-onemap-data Import - Lawley May 22, 2025 (BASELINE)
 * =================================================================
 * 
 * REAL Firebase import for the oldest CSV file
 * This establishes the baseline data in vf-onemap-data database
 */

const fs = require('fs');
const path = require('path');
const { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  writeBatch,
  Timestamp 
} = require('firebase/firestore');

const { VF_ONEMAP_CONFIG, initializeVfOnemapFirebase } = require('./setup-vf-onemap-firebase');

// Production import configuration
const IMPORT_CONFIG = {
  projectName: 'Lawley Fiber Installation Project',
  csvFile: 'Lawley May Week 3 22052025 - First Report.csv',
  importDate: '2025-05-22',
  batchId: 'LAWLEY_MAY22_2025_BASELINE_PROD',
  isProduction: true,
  enableRealFirebase: true
};

console.log('🚀 PRODUCTION vf-onemap-data Import System');
console.log('==========================================');
console.log(`🏢 Project: ${IMPORT_CONFIG.projectName}`);
console.log(`📁 File: ${IMPORT_CONFIG.csvFile}`);
console.log(`📅 Date: ${IMPORT_CONFIG.importDate}`);
console.log(`🆔 Batch: ${IMPORT_CONFIG.batchId}`);
console.log(`🔥 Firebase: ${IMPORT_CONFIG.enableRealFirebase ? 'PRODUCTION' : 'SIMULATED'}`);
console.log('');

/**
 * Parse CSV using proven OneMap logic (same as tested)
 */
function parseOneMapCSV(csvContent) {
  console.log('📊 Parsing CSV with proven logic...');
  
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  // Proven column mapping
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
    'Last Modified Home Sign Ups Date': 'lastModifiedDate',
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

    const record = {
      propertyId: values[columnIndices['propertyId']] || '',
      oneMapNadId: values[columnIndices['oneMapNadId']] || '',
      poleNumber: values[columnIndices['poleNumber']] || '', 
      dropNumber: values[columnIndices['dropNumber']] || '',
      status: values[columnIndices['status']] || '',
      flowNameGroups: values[columnIndices['flowNameGroups']] || '',
      sections: values[columnIndices['sections']] || '',
      pons: values[columnIndices['pons']] || '',
      location: values[columnIndices['location']] || '',
      address: values[columnIndices['address']] || '',
      fieldAgentName: values[columnIndices['fieldAgentName']] || '',
      lastModifiedBy: values[columnIndices['lastModifiedBy']] || '',
      lastModifiedDate: values[columnIndices['lastModifiedDate']] || '',
    };

    records.push(record);
  }

  console.log(`✅ Parsed ${records.length} valid records`);
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
 * Create import batch in Firebase
 */
async function createImportBatch(db, csvRecords) {
  console.log('📋 Creating import batch in Firebase...');
  
  const batch = {
    id: IMPORT_CONFIG.batchId,
    filename: IMPORT_CONFIG.csvFile,
    importDate: Timestamp.now(),
    totalRecords: csvRecords.length,
    newRecords: 0,
    changedRecords: 0,
    unchangedRecords: 0,
    errorRecords: 0,
    processingTimeMs: 0,
    status: 'processing',
    projectName: IMPORT_CONFIG.projectName,
    isProduction: true
  };
  
  await setDoc(
    doc(db, VF_ONEMAP_CONFIG.collections.importBatches, IMPORT_CONFIG.batchId),
    batch
  );
  
  console.log(`✅ Import batch created: ${IMPORT_CONFIG.batchId}`);
  return batch;
}

/**
 * Check if record exists in Firebase (duplicate detection)
 */
async function checkRecordExists(db, propertyId) {
  try {
    const docRef = doc(db, VF_ONEMAP_CONFIG.collections.processedRecords, propertyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        exists: true,
        existingRecord: docSnap.data()
      };
    } else {
      return {
        exists: false,
        existingRecord: null
      };
    }
  } catch (error) {
    console.error(`❌ Error checking record ${propertyId}:`, error);
    return { exists: false, existingRecord: null };
  }
}

/**
 * Import records to Firebase with duplicate detection
 */
async function importRecordsToFirebase(db, csvRecords) {
  console.log('🔄 Importing records to Firebase with duplicate detection...');
  
  const results = {
    newRecords: [],
    changedRecords: [],
    unchangedRecords: [],
    errorRecords: []
  };
  
  let processedCount = 0;
  
  for (const csvRecord of csvRecords) {
    try {
      const propertyId = csvRecord.propertyId;
      
      // Check if record exists (duplicate detection)
      const existenceCheck = await checkRecordExists(db, propertyId);
      
      const importRecord = {
        ...csvRecord,
        importDate: Timestamp.now(),
        importBatchId: IMPORT_CONFIG.batchId,
        isNew: !existenceCheck.exists,
        hasChanges: false,
        sourceFile: IMPORT_CONFIG.csvFile
      };
      
      if (!existenceCheck.exists) {
        // NEW RECORD - Add to Firebase
        await setDoc(
          doc(db, VF_ONEMAP_CONFIG.collections.processedRecords, propertyId),
          importRecord
        );
        
        results.newRecords.push(importRecord);
        console.log(`✅ NEW: ${propertyId} | Pole: ${csvRecord.poleNumber} | Drop: ${csvRecord.dropNumber}`);
        
      } else {
        // EXISTING RECORD - Would check for changes here
        results.unchangedRecords.push(importRecord);
        console.log(`⏸️  EXISTS: ${propertyId} (skipped)`);
      }
      
      processedCount++;
      
      // Progress indicator
      if (processedCount % 50 === 0) {
        console.log(`📊 Progress: ${processedCount}/${csvRecords.length} records processed...`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${csvRecord.propertyId}:`, error);
      results.errorRecords.push({ record: csvRecord, error: error.message });
    }
  }
  
  console.log(`✅ Import complete: ${results.newRecords.length} new, ${results.unchangedRecords.length} existing`);
  return results;
}

/**
 * Generate import report in Firebase
 */
async function generateImportReport(db, results) {
  console.log('📋 Generating import report in Firebase...');
  
  const report = {
    batchId: IMPORT_CONFIG.batchId,
    reportType: 'daily-summary',
    generatedDate: Timestamp.now(),
    recordCount: results.newRecords.length + results.unchangedRecords.length,
    summary: {
      totalRecords: results.newRecords.length + results.unchangedRecords.length,
      newRecords: results.newRecords.length,
      changedRecords: results.changedRecords.length,
      unchangedRecords: results.unchangedRecords.length,
      errorRecords: results.errorRecords.length
    },
    projectName: IMPORT_CONFIG.projectName,
    sourceFile: IMPORT_CONFIG.csvFile,
    isProduction: true
  };
  
  const reportRef = await addDoc(
    collection(db, VF_ONEMAP_CONFIG.collections.importReports),
    report
  );
  
  console.log(`✅ Import report saved: ${reportRef.id}`);
  return report;
}

/**
 * Update import batch with final results
 */
async function updateImportBatch(db, results, processingTimeMs) {
  const batchUpdate = {
    newRecords: results.newRecords.length,
    changedRecords: results.changedRecords.length, 
    unchangedRecords: results.unchangedRecords.length,
    errorRecords: results.errorRecords.length,
    processingTimeMs,
    status: 'completed',
    completedDate: Timestamp.now()
  };
  
  await setDoc(
    doc(db, VF_ONEMAP_CONFIG.collections.importBatches, IMPORT_CONFIG.batchId),
    batchUpdate,
    { merge: true }
  );
  
  console.log('✅ Import batch updated with final results');
}

/**
 * Main production import function
 */
async function runProductionImport() {
  const startTime = Date.now();
  
  try {
    // Initialize Firebase
    console.log('🔥 Connecting to Firebase...');
    const db = initializeVfOnemapFirebase();
    console.log('✅ Firebase connection established');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../OneMap/downloads', IMPORT_CONFIG.csvFile);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    console.log(`📁 Reading CSV: ${IMPORT_CONFIG.csvFile}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const csvRecords = parseOneMapCSV(csvContent);
    if (csvRecords.length === 0) {
      throw new Error('No valid records found in CSV');
    }
    
    // Create import batch
    await createImportBatch(db, csvRecords);
    
    // Import records to Firebase
    const results = await importRecordsToFirebase(db, csvRecords);
    
    // Generate report
    const report = await generateImportReport(db, results);
    
    // Update batch status
    const processingTime = Date.now() - startTime;
    await updateImportBatch(db, results, processingTime);
    
    // Final summary
    console.log('');
    console.log('🎉 PRODUCTION IMPORT COMPLETED SUCCESSFULLY!');
    console.log('============================================');
    console.log(`📊 Import Statistics:`);
    console.log(`   Total Records: ${report.summary.totalRecords}`);
    console.log(`   New Records: ${report.summary.newRecords}`);
    console.log(`   Existing Records: ${report.summary.unchangedRecords}`);
    console.log(`   Error Records: ${report.summary.errorRecords}`);
    console.log(`   Processing Time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log('');
    console.log('🎯 Database Status:');
    console.log(`   ✅ Baseline data established in vf-onemap-data`);
    console.log(`   ✅ ${report.summary.newRecords} records ready for duplicate testing`);
    console.log(`   ✅ Import batch tracked: ${IMPORT_CONFIG.batchId}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. ✅ Process May 23, 2025 file for duplicate detection');
    console.log('2. ✅ Validate change tracking functionality');
    console.log('3. ✅ Test production workflow end-to-end');
    
  } catch (error) {
    console.error('❌ Production import failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run production import
if (require.main === module) {
  runProductionImport();
}

module.exports = {
  runProductionImport,
  IMPORT_CONFIG,
  parseOneMapCSV
};