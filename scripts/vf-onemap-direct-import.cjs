#!/usr/bin/env node

/**
 * Direct Import to vf-onemap-data Firebase
 * ========================================
 * 
 * Uses Firebase Admin SDK with authenticated CLI session
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize admin app for vf-onemap-data project
admin.initializeApp({
  projectId: 'vf-onemap-data',
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

// Collection names
const COLLECTIONS = {
  processedRecords: 'vf-onemap-processed-records',
  importBatches: 'vf-onemap-import-batches',
  importReports: 'vf-onemap-import-reports',
  changeHistory: 'vf-onemap-change-history',
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
 * Generate Pre-Import Report
 */
async function generatePreImportReport(csvRecords, fileName) {
  console.log('📋 Generating Pre-Import CSV Analysis Report...');
  
  const analysis = {
    fileName,
    analysisDate: admin.firestore.Timestamp.now(),
    totalRecords: csvRecords.length,
    validRecords: 0,
    invalidRecords: 0,
    duplicatesWithinCSV: 0,
    fieldAnalysis: {
      withPropertyId: 0,
      withPoleNumber: 0,
      withDropNumber: 0,
      withStatus: 0,
      withAgent: 0
    },
    statusBreakdown: {},
    propertyIdList: []
  };

  // Analyze records
  const propertyIdsSeen = new Set();
  const duplicatePropertyIds = new Set();

  csvRecords.forEach(record => {
    if (record.propertyId) {
      analysis.validRecords++;
      
      if (propertyIdsSeen.has(record.propertyId)) {
        duplicatePropertyIds.add(record.propertyId);
        analysis.duplicatesWithinCSV++;
      }
      propertyIdsSeen.add(record.propertyId);
      
      // Field analysis
      if (record.propertyId) analysis.fieldAnalysis.withPropertyId++;
      if (record.poleNumber) analysis.fieldAnalysis.withPoleNumber++;
      if (record.dropNumber) analysis.fieldAnalysis.withDropNumber++;
      if (record.status) analysis.fieldAnalysis.withStatus++;
      if (record.fieldAgentName) analysis.fieldAnalysis.withAgent++;
      
      // Status breakdown
      if (record.status) {
        analysis.statusBreakdown[record.status] = (analysis.statusBreakdown[record.status] || 0) + 1;
      }
    } else {
      analysis.invalidRecords++;
    }
  });

  analysis.propertyIdList = Array.from(propertyIdsSeen);

  // Save pre-import report
  const preImportRef = await db.collection(COLLECTIONS.preImportReports).add(analysis);
  
  console.log('✅ Pre-Import Report saved:', preImportRef.id);
  
  // Display summary
  console.log('');
  console.log('📊 PRE-IMPORT CSV ANALYSIS');
  console.log('-------------------------');
  console.log(`File: ${fileName}`);
  console.log(`Total Records: ${analysis.totalRecords}`);
  console.log(`Valid Records: ${analysis.validRecords}`);
  console.log(`Invalid Records: ${analysis.invalidRecords}`);
  console.log(`Duplicates within CSV: ${analysis.duplicatesWithinCSV}`);
  console.log('');
  console.log('Field Coverage:');
  console.log(`  Property IDs: ${analysis.fieldAnalysis.withPropertyId} (${((analysis.fieldAnalysis.withPropertyId / analysis.totalRecords) * 100).toFixed(1)}%)`);
  console.log(`  Pole Numbers: ${analysis.fieldAnalysis.withPoleNumber} (${((analysis.fieldAnalysis.withPoleNumber / analysis.totalRecords) * 100).toFixed(1)}%)`);
  console.log(`  Drop Numbers: ${analysis.fieldAnalysis.withDropNumber} (${((analysis.fieldAnalysis.withDropNumber / analysis.totalRecords) * 100).toFixed(1)}%)`);
  console.log('');
  
  return { reportId: preImportRef.id, analysis };
}

/**
 * Import records with duplicate detection
 */
async function importRecordsToFirebase(csvRecords, batchId, fileName) {
  console.log('');
  console.log('🔄 Importing records to vf-onemap-data Firebase...');
  
  const results = {
    newRecords: [],
    changedRecords: [],
    unchangedRecords: [],
    errorRecords: []
  };

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const record of csvRecords) {
    try {
      const docRef = db.collection(COLLECTIONS.processedRecords).doc(record.propertyId);
      const doc = await docRef.get();
      
      const importRecord = {
        ...record,
        importDate: admin.firestore.Timestamp.now(),
        importBatchId: batchId,
        sourceFile: fileName,
        lastUpdated: admin.firestore.Timestamp.now()
      };

      if (!doc.exists) {
        // NEW RECORD
        batch.set(docRef, importRecord);
        results.newRecords.push(record);
        batchCount++;
      } else {
        // Check for changes
        const existingData = doc.data();
        const hasChanges = JSON.stringify(existingData) !== JSON.stringify(importRecord);
        
        if (hasChanges) {
          // CHANGED RECORD
          batch.update(docRef, importRecord);
          results.changedRecords.push({ record, changes: ['Updated'] });
          batchCount++;
        } else {
          // UNCHANGED
          results.unchangedRecords.push(record);
        }
      }

      // Commit batch if reaching limit
      if (batchCount >= MAX_BATCH_SIZE - 10) {
        await batch.commit();
        console.log(`📦 Committed batch of ${batchCount} operations`);
        batchCount = 0;
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${record.propertyId}:`, error);
      results.errorRecords.push({ record, error: error.message });
    }
  }

  // Commit remaining batch operations
  if (batchCount > 0) {
    await batch.commit();
    console.log(`📦 Committed final batch of ${batchCount} operations`);
  }

  console.log('✅ Import completed');
  return results;
}

/**
 * Generate Post-Import Report
 */
async function generatePostImportReport(results, batchId, preImportAnalysis) {
  console.log('');
  console.log('📋 Generating Post-Import Database State Report...');
  
  const report = {
    batchId,
    reportDate: admin.firestore.Timestamp.now(),
    preImportReportId: preImportAnalysis.reportId,
    importResults: {
      newRecords: results.newRecords.length,
      changedRecords: results.changedRecords.length,
      unchangedRecords: results.unchangedRecords.length,
      errorRecords: results.errorRecords.length,
      totalProcessed: results.newRecords.length + results.changedRecords.length + results.unchangedRecords.length
    }
  };

  // Save post-import report
  const postImportRef = await db.collection(COLLECTIONS.postImportReports).add(report);
  
  console.log('✅ Post-Import Report saved:', postImportRef.id);
  
  // Display summary
  console.log('');
  console.log('📊 POST-IMPORT DATABASE STATE');
  console.log('----------------------------');
  console.log(`New Records Added: ${report.importResults.newRecords}`);
  console.log(`Records Updated: ${report.importResults.changedRecords}`);
  console.log(`Unchanged Records: ${report.importResults.unchangedRecords}`);
  console.log(`Errors: ${report.importResults.errorRecords}`);
  console.log('');
  
  return { reportId: postImportRef.id, report };
}

/**
 * Main import function
 */
async function runDirectImport() {
  const csvFile = 'Lawley May Week 3 22052025 - First Report.csv';
  const batchId = `IMPORT_${Date.now()}`;
  const startTime = Date.now();
  
  console.log('🚀 vf-onemap-data Direct Import');
  console.log('===============================');
  console.log('📧 Admin: louis@velocityfibreapp.com');
  console.log('🗄️  Database: vf-onemap-data');
  console.log('');
  
  try {
    // Test connection first
    console.log('🔄 Testing database connection...');
    const testCollection = db.collection('test');
    await testCollection.doc('connection-test').set({
      timestamp: admin.firestore.Timestamp.now(),
      test: true
    });
    console.log('✅ Database connection successful!');
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
    
    // Generate pre-import report
    const preImportResult = await generatePreImportReport(csvRecords, csvFile);
    
    // Create import batch record
    const batchDoc = {
      id: batchId,
      fileName: csvFile,
      importDate: admin.firestore.Timestamp.now(),
      status: 'processing',
      totalRecords: csvRecords.length,
      preImportReportId: preImportResult.reportId
    };
    
    await db.collection(COLLECTIONS.importBatches).doc(batchId).set(batchDoc);
    
    // Import records
    const importResults = await importRecordsToFirebase(csvRecords, batchId, csvFile);
    
    // Update batch status
    await db.collection(COLLECTIONS.importBatches).doc(batchId).update({
      status: 'completed',
      completedDate: admin.firestore.Timestamp.now(),
      newRecords: importResults.newRecords.length,
      changedRecords: importResults.changedRecords.length,
      unchangedRecords: importResults.unchangedRecords.length,
      errorRecords: importResults.errorRecords.length
    });
    
    // Generate post-import report
    const postImportResult = await generatePostImportReport(importResults, batchId, preImportResult);
    
    const processingTime = Date.now() - startTime;
    
    console.log('');
    console.log('✅ IMPORT COMPLETE');
    console.log('==================');
    console.log(`Processing Time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`Pre-Import Report: ${preImportResult.reportId}`);
    console.log(`Post-Import Report: ${postImportResult.reportId}`);
    console.log(`Batch ID: ${batchId}`);
    console.log('');
    console.log('📊 View your data at:');
    console.log('https://console.firebase.google.com/project/vf-onemap-data/firestore/data/~2Fvf-onemap-processed-records');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('');
    console.error('📋 Troubleshooting:');
    console.error('1. Make sure you have set GOOGLE_APPLICATION_CREDENTIALS');
    console.error('2. Run: export GOOGLE_APPLICATION_CREDENTIALS=""');
    console.error('3. Ensure you are logged in: firebase login');
    console.error('4. Check project access: firebase projects:list');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  // Set environment to use Firebase CLI credentials
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
  runDirectImport();
}

module.exports = { runDirectImport };