#!/usr/bin/env node

/**
 * Validate Master CSV against Staging Database
 * 
 * Purpose: Compare the aggregated master CSV (source of truth) 
 * with what's in the staging database to identify discrepancies
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

// Initialize Firebase Admin for staging
const stagingServiceAccount = require('../../config/service-accounts/vf-onemap-data-key.json');
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(stagingServiceAccount),
  projectId: 'vf-onemap-data'
}, 'staging');

const stagingDb = stagingApp.firestore();

// Configuration
const CONFIG = {
  MASTER_CSV_PATH: '/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/master/master_csv_latest.csv',
  BATCH_SIZE: 100,
  REPORTS_DIR: '../reports'
};

/**
 * Read and parse the master CSV file
 */
async function readMasterCSV() {
  try {
    console.log('📄 Reading master CSV file...');
    const fileContent = await fs.readFile(CONFIG.MASTER_CSV_PATH, 'utf-8');
    
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`✅ Loaded ${records.length} records from master CSV`);
    return records;
  } catch (error) {
    console.error('❌ Error reading master CSV:', error);
    throw error;
  }
}

/**
 * Get all records from staging database
 */
async function getStagingRecords() {
  console.log('🔍 Fetching records from staging database...');
  const records = new Map();
  
  try {
    // Get processed records
    const processedSnapshot = await stagingDb.collection('vf-onemap-processed-records').get();
    console.log(`   Found ${processedSnapshot.size} processed records`);
    
    processedSnapshot.forEach(doc => {
      const data = doc.data();
      const key = `${data.propertyId}_${data.poleNumber}`;
      records.set(key, {
        id: doc.id,
        ...data,
        collection: 'vf-onemap-processed-records'
      });
    });
    
    // Get status changes for history
    const statusChangesSnapshot = await stagingDb.collection('vf-onemap-status-changes').get();
    console.log(`   Found ${statusChangesSnapshot.size} status change records`);
    
    return records;
  } catch (error) {
    console.error('❌ Error fetching staging records:', error);
    throw error;
  }
}

/**
 * Compare CSV record with staging record
 */
function compareRecords(csvRecord, stagingRecord) {
  const discrepancies = [];
  
  // Key fields to compare
  const fieldsToCompare = [
    { csv: 'Property ID', staging: 'propertyId', name: 'Property ID' },
    { csv: 'Pole Number', staging: 'poleNumber', name: 'Pole Number' },
    { csv: 'Drop Number', staging: 'dropNumber', name: 'Drop Number' },
    { csv: 'Status', staging: 'currentStatus', name: 'Status' },
    { csv: 'Field Agent Name (pole permission)', staging: 'fieldAgent', name: 'Field Agent' },
    { csv: 'Address', staging: 'locationAddress', name: 'Address' },
    { csv: 'PON', staging: 'pon', name: 'PON' },
    { csv: 'Zone', staging: 'zone', name: 'Zone' }
  ];
  
  fieldsToCompare.forEach(field => {
    const csvValue = (csvRecord[field.csv] || '').trim();
    const stagingValue = (stagingRecord[field.staging] || '').toString().trim();
    
    // Normalize for comparison
    const csvNormalized = normalizeValue(csvValue, field.name);
    const stagingNormalized = normalizeValue(stagingValue, field.name);
    
    if (csvNormalized !== stagingNormalized) {
      discrepancies.push({
        field: field.name,
        csvValue: csvValue,
        stagingValue: stagingValue || '(empty)',
        normalized: {
          csv: csvNormalized,
          staging: stagingNormalized
        }
      });
    }
  });
  
  return discrepancies;
}

/**
 * Normalize values for comparison
 */
function normalizeValue(value, fieldName) {
  if (!value) return '';
  
  let normalized = value.toString().trim().toUpperCase();
  
  // Field-specific normalization
  switch (fieldName) {
    case 'Drop Number':
      if (normalized === 'NO DROP ALLOCATED' || normalized === 'N/A') {
        return '';
      }
      break;
    case 'Status':
      // Status might have slight variations
      normalized = normalized.replace(/\s+/g, ' ');
      break;
    case 'Pole Number':
      // Remove extra spaces and ensure consistent format
      normalized = normalized.replace(/\s+/g, '');
      break;
  }
  
  return normalized;
}

/**
 * Main validation function
 */
async function validateMasterCSVToStaging() {
  console.log('\n🚀 Starting Master CSV to Staging Validation');
  console.log('=' * 60);
  
  const startTime = Date.now();
  const validationResults = {
    timestamp: new Date().toISOString(),
    summary: {
      csvRecords: 0,
      stagingRecords: 0,
      matched: 0,
      missingInStaging: 0,
      extraInStaging: 0,
      withDiscrepancies: 0
    },
    missingRecords: [],
    extraRecords: [],
    discrepancies: []
  };
  
  try {
    // Step 1: Read master CSV
    const csvRecords = await readMasterCSV();
    validationResults.summary.csvRecords = csvRecords.length;
    
    // Step 2: Get staging records
    const stagingRecords = await getStagingRecords();
    validationResults.summary.stagingRecords = stagingRecords.size;
    
    // Step 3: Compare records
    console.log('\n📊 Comparing records...');
    const stagingKeys = new Set(stagingRecords.keys());
    
    for (const csvRecord of csvRecords) {
      const key = `${csvRecord['Property ID']}_${csvRecord['Pole Number']}`;
      
      if (stagingRecords.has(key)) {
        // Record exists in both - check for discrepancies
        const stagingRecord = stagingRecords.get(key);
        const discrepancies = compareRecords(csvRecord, stagingRecord);
        
        if (discrepancies.length > 0) {
          validationResults.discrepancies.push({
            key,
            propertyId: csvRecord['Property ID'],
            poleNumber: csvRecord['Pole Number'],
            discrepancies
          });
          validationResults.summary.withDiscrepancies++;
        } else {
          validationResults.summary.matched++;
        }
        
        // Remove from staging keys to track extras
        stagingKeys.delete(key);
      } else {
        // Missing in staging
        validationResults.missingRecords.push({
          propertyId: csvRecord['Property ID'],
          poleNumber: csvRecord['Pole Number'],
          status: csvRecord['Status'],
          address: csvRecord['Address']
        });
        validationResults.summary.missingInStaging++;
      }
    }
    
    // Check for extra records in staging
    stagingKeys.forEach(key => {
      const stagingRecord = stagingRecords.get(key);
      validationResults.extraRecords.push({
        key,
        propertyId: stagingRecord.propertyId,
        poleNumber: stagingRecord.poleNumber,
        status: stagingRecord.currentStatus
      });
      validationResults.summary.extraInStaging++;
    });
    
    // Step 4: Generate report
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Validation completed in ${duration} seconds`);
    
    // Display summary
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('=' * 60);
    console.log(`CSV Records: ${validationResults.summary.csvRecords}`);
    console.log(`Staging Records: ${validationResults.summary.stagingRecords}`);
    console.log(`Perfectly Matched: ${validationResults.summary.matched}`);
    console.log(`Missing in Staging: ${validationResults.summary.missingInStaging}`);
    console.log(`Extra in Staging: ${validationResults.summary.extraInStaging}`);
    console.log(`With Discrepancies: ${validationResults.summary.withDiscrepancies}`);
    
    // Save detailed report
    const reportPath = path.join(CONFIG.REPORTS_DIR, `validation_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Show sample issues
    if (validationResults.missingRecords.length > 0) {
      console.log('\n⚠️  Sample Missing Records (first 5):');
      validationResults.missingRecords.slice(0, 5).forEach(record => {
        console.log(`   - ${record.poleNumber} (Property: ${record.propertyId}, Status: ${record.status})`);
      });
    }
    
    if (validationResults.discrepancies.length > 0) {
      console.log('\n⚠️  Sample Discrepancies (first 5):');
      validationResults.discrepancies.slice(0, 5).forEach(item => {
        console.log(`   - ${item.poleNumber}:`);
        item.discrepancies.forEach(disc => {
          console.log(`     ${disc.field}: CSV="${disc.csvValue}" vs Staging="${disc.stagingValue}"`);
        });
      });
    }
    
    return validationResults;
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    throw error;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateMasterCSVToStaging()
    .then(results => {
      // Exit with error code if issues found
      const hasIssues = results.summary.missingInStaging > 0 || 
                       results.summary.withDiscrepancies > 0 ||
                       results.summary.extraInStaging > 0;
      process.exit(hasIssues ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { validateMasterCSVToStaging };