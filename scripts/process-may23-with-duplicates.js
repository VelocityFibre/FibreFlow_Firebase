#!/usr/bin/env node

/**
 * Process May 23, 2025 Data with Duplicate Detection
 * ==================================================
 * 
 * Tests the vf-onemap-data import system with real May 23 data
 * Should detect any duplicates from May 22 baseline
 */

const fs = require('fs');
const path = require('path');

// Import the database state from May 22 baseline
const { VF_DATABASE, parseCSV, detectChanges } = require('./demo-production-import');

// First, run the May 22 baseline to populate the database
const { runDemoImport } = require('./demo-production-import');

const MAY23_CONFIG = {
  projectName: 'Lawley Fiber Installation Project',
  csvFile: 'Lawley May Week 3 23052025.csv',
  importDate: '2025-05-23',
  batchId: 'LAWLEY_MAY23_2025_IMPORT',
  isBaseline: false
};

console.log('🚀 Processing May 23, 2025 Data');
console.log('================================');
console.log(`📋 Project: ${MAY23_CONFIG.projectName}`);
console.log(`📁 File: ${MAY23_CONFIG.csvFile}`);
console.log(`🆔 Batch: ${MAY23_CONFIG.batchId}`);
console.log('');

/**
 * Process May 23 data with duplicate detection
 */
async function processMay23Data() {
  const startTime = Date.now();
  
  try {
    // First establish May 22 baseline
    console.log('📊 Step 1: Establishing May 22 baseline...');
    console.log('=========================================');
    await runDemoImport();
    
    console.log('');
    console.log('📊 Step 2: Processing May 23 data...');
    console.log('===================================');
    
    // Read May 23 CSV file
    const csvPath = path.join(__dirname, '../OneMap/downloads', MAY23_CONFIG.csvFile);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${MAY23_CONFIG.csvFile}`);
    }
    
    console.log(`📁 Reading: ${MAY23_CONFIG.csvFile}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV using proven logic
    const csvRecords = parseCSV(csvContent);
    console.log(`📊 Parsed ${csvRecords.length} valid records from May 23 file`);
    
    // Process with duplicate detection
    const results = await processWithDuplicateDetection(csvRecords);
    
    // Create batch record
    const batchRecord = await createImportBatch(csvRecords.length, results);
    
    // Generate comprehensive report
    const report = await generateDailyReport(results, batchRecord);
    
    const processingTime = Date.now() - startTime;
    
    // Display final summary
    displayFinalSummary(results, report, processingTime);
    
  } catch (error) {
    console.error('❌ May 23 processing failed:', error);
    process.exit(1);
  }
}

/**
 * Process records with duplicate detection
 */
async function processWithDuplicateDetection(csvRecords) {
  console.log('🔄 Processing with duplicate detection...');
  
  const results = {
    newRecords: [],
    changedRecords: [],
    unchangedRecords: [],
    duplicatesDetected: [],
    errorRecords: []
  };

  let duplicateCount = 0;
  let changeCount = 0;
  
  for (let i = 0; i < csvRecords.length; i++) {
    const record = csvRecords[i];
    
    try {
      // Check if record exists in database (duplicate detection)
      const existingRecord = VF_DATABASE['vf-onemap-processed-records'].get(record.propertyId);
      
      const importRecord = {
        ...record,
        importDate: new Date().toISOString(),
        importBatchId: MAY23_CONFIG.batchId,
        isNew: !existingRecord,
        hasChanges: false,
        sourceFile: MAY23_CONFIG.csvFile
      };

      if (!existingRecord) {
        // NEW RECORD
        VF_DATABASE['vf-onemap-processed-records'].set(record.propertyId, importRecord);
        results.newRecords.push(importRecord);
        
        if (results.newRecords.length <= 5) {
          console.log(`✅ NEW: Property ${record.propertyId} | Pole: ${record.poleNumber || 'N/A'}`);
        }
        
      } else {
        // DUPLICATE DETECTED
        duplicateCount++;
        const changes = detectChanges(record, existingRecord);
        
        if (changes.length > 0) {
          // CHANGED RECORD
          changeCount++;
          importRecord.hasChanges = true;
          importRecord.changesSummary = changes;
          
          // Update database with new version
          VF_DATABASE['vf-onemap-processed-records'].set(record.propertyId, importRecord);
          results.changedRecords.push({
            record: importRecord,
            changes,
            previousVersion: existingRecord
          });
          
          if (results.changedRecords.length <= 3) {
            console.log(`🔄 CHANGED: Property ${record.propertyId} | Changes: ${changes.slice(0, 2).join(', ')}`);
          }
          
          // Track in change history
          const changeRecord = {
            propertyId: record.propertyId,
            changeDate: new Date().toISOString(),
            changeType: 'updated',
            fieldChanges: changes,
            previousVersion: existingRecord,
            currentVersion: importRecord,
            batchId: MAY23_CONFIG.batchId
          };
          
          const changeId = `change_${record.propertyId}_${Date.now()}`;
          VF_DATABASE['vf-onemap-change-history'].set(changeId, changeRecord);
          
        } else {
          // UNCHANGED DUPLICATE
          results.unchangedRecords.push(importRecord);
        }
        
        results.duplicatesDetected.push({
          propertyId: record.propertyId,
          hasChanges: changes.length > 0,
          changesCount: changes.length
        });
      }
      
      // Progress indicator
      if (i % 100 === 0 && i > 0) {
        console.log(`📊 Progress: ${i}/${csvRecords.length} | Duplicates: ${duplicateCount} | Changes: ${changeCount}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${record.propertyId}:`, error);
      results.errorRecords.push({ record, error: error.message });
    }
  }
  
  console.log('');
  console.log(`✅ Processing complete:`);
  console.log(`   New Records: ${results.newRecords.length}`);
  console.log(`   Changed Records: ${results.changedRecords.length}`);
  console.log(`   Unchanged Duplicates: ${results.unchangedRecords.length}`);
  console.log(`   Total Duplicates Detected: ${results.duplicatesDetected.length}`);
  
  return results;
}

/**
 * Create import batch record
 */
async function createImportBatch(recordCount, results) {
  const batchRecord = {
    id: MAY23_CONFIG.batchId,
    filename: MAY23_CONFIG.csvFile,
    projectName: MAY23_CONFIG.projectName,
    importDate: new Date().toISOString(),
    totalRecords: recordCount,
    newRecords: results.newRecords.length,
    changedRecords: results.changedRecords.length,
    unchangedRecords: results.unchangedRecords.length,
    errorRecords: results.errorRecords.length,
    status: 'completed'
  };
  
  VF_DATABASE['vf-onemap-import-batches'].set(MAY23_CONFIG.batchId, batchRecord);
  console.log(`✅ Import batch record created: ${MAY23_CONFIG.batchId}`);
  
  return batchRecord;
}

/**
 * Generate comprehensive daily report
 */
async function generateDailyReport(results, batchRecord) {
  const report = {
    id: `report_${MAY23_CONFIG.batchId}`,
    batchId: MAY23_CONFIG.batchId,
    reportType: 'daily-import',
    generatedDate: new Date().toISOString(),
    importDate: MAY23_CONFIG.importDate,
    summary: {
      totalRecords: batchRecord.totalRecords,
      newRecords: batchRecord.newRecords,
      changedRecords: batchRecord.changedRecords,
      unchangedRecords: batchRecord.unchangedRecords,
      errorRecords: batchRecord.errorRecords,
      duplicatesDetected: results.duplicatesDetected.length
    },
    projectName: MAY23_CONFIG.projectName,
    sourceFile: MAY23_CONFIG.csvFile
  };
  
  VF_DATABASE['vf-onemap-import-reports'].set(report.id, report);
  console.log('✅ Daily import report generated');
  
  return report;
}

/**
 * Display final summary
 */
function displayFinalSummary(results, report, processingTime) {
  console.log('');
  console.log('📊 MAY 23, 2025 IMPORT SUMMARY');
  console.log('==============================');
  console.log(`📁 Source File: ${MAY23_CONFIG.csvFile}`);
  console.log(`🆔 Batch ID: ${MAY23_CONFIG.batchId}`);
  console.log(`⏱️  Processing Time: ${(processingTime / 1000).toFixed(2)}s`);
  console.log('');
  
  console.log('📈 Import Results:');
  console.log(`   Total Records Processed: ${report.summary.totalRecords}`);
  console.log(`   ✅ New Records: ${report.summary.newRecords}`);
  console.log(`   🔄 Changed Records: ${report.summary.changedRecords}`);
  console.log(`   ⏸️  Unchanged Duplicates: ${report.summary.unchangedRecords}`);
  console.log(`   🔍 Total Duplicates: ${report.summary.duplicatesDetected}`);
  console.log(`   ❌ Errors: ${report.summary.errorRecords}`);
  console.log('');
  
  // Database totals
  console.log('💾 Database Status:');
  console.log(`   Total Records: ${VF_DATABASE['vf-onemap-processed-records'].size}`);
  console.log(`   Import Batches: ${VF_DATABASE['vf-onemap-import-batches'].size}`);
  console.log(`   Import Reports: ${VF_DATABASE['vf-onemap-import-reports'].size}`);
  console.log(`   Change History: ${VF_DATABASE['vf-onemap-change-history'].size}`);
  console.log('');
  
  // Sample changes if any
  if (results.changedRecords.length > 0) {
    console.log('🔄 Sample Changes Detected:');
    results.changedRecords.slice(0, 3).forEach((item, i) => {
      console.log(`   ${i + 1}. Property ${item.record.propertyId}:`);
      item.changes.slice(0, 2).forEach(change => {
        console.log(`      - ${change}`);
      });
    });
    console.log('');
  }
  
  console.log('📊 Reports Generated:');
  console.log(`   ✅ Batch Record: ${MAY23_CONFIG.batchId}`);
  console.log(`   ✅ Import Report: ${report.id}`);
  console.log(`   ✅ Change History: ${results.changedRecords.length} entries`);
  console.log('');
  
  console.log('✅ MAY 23 PROCESSING COMPLETE!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Process May 24, 2025 file (continue daily imports)');
  console.log('2. Generate weekly summary reports');
  console.log('3. Connect to real Firebase vf-onemap-data project');
}

// Run the process
if (require.main === module) {
  processMay23Data();
}

module.exports = { processMay23Data, MAY23_CONFIG };