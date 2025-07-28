#!/usr/bin/env node

/**
 * Duplicate Prevention System for VF OneMap
 * 
 * This module provides functions to prevent duplicate pole creation during imports.
 * It includes:
 * 1. Pre-import validation
 * 2. Existing pole lookup
 * 3. Safe upsert operations
 * 4. Batch duplicate checking
 */

const admin = require('firebase-admin');

// Initialize if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../credentials/vf-onemap-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'vf-onemap-data'
  });
}

const db = admin.firestore();

/**
 * Check if a pole already exists in the database
 * @param {string} poleNumber - The pole number to check
 * @returns {Promise<{exists: boolean, documentId: string|null, data: object|null}>}
 */
async function checkPoleExists(poleNumber) {
  if (!poleNumber || !poleNumber.trim()) {
    return { exists: false, documentId: null, data: null };
  }
  
  const normalizedPole = poleNumber.trim().toUpperCase();
  
  try {
    const snapshot = await db.collection('vf-onemap-processed-records')
      .where('poleNumber', '==', normalizedPole)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        exists: true,
        documentId: doc.id,
        data: doc.data()
      };
    }
    
    return { exists: false, documentId: null, data: null };
  } catch (error) {
    console.error(`Error checking pole ${poleNumber}:`, error);
    throw error;
  }
}

/**
 * Check multiple poles for duplicates in a single batch
 * @param {string[]} poleNumbers - Array of pole numbers to check
 * @returns {Promise<Map<string, {exists: boolean, documentId: string|null}>>}
 */
async function checkPolesExistBatch(poleNumbers) {
  const results = new Map();
  
  // Initialize all poles as not existing
  poleNumbers.forEach(pole => {
    if (pole && pole.trim()) {
      results.set(pole.trim().toUpperCase(), { exists: false, documentId: null });
    }
  });
  
  // Filter valid pole numbers
  const validPoles = poleNumbers
    .filter(p => p && p.trim())
    .map(p => p.trim().toUpperCase());
  
  if (validPoles.length === 0) return results;
  
  try {
    // Query in batches of 10 (Firestore 'in' query limit)
    for (let i = 0; i < validPoles.length; i += 10) {
      const batch = validPoles.slice(i, i + 10);
      
      const snapshot = await db.collection('vf-onemap-processed-records')
        .where('poleNumber', 'in', batch)
        .get();
      
      snapshot.forEach(doc => {
        const poleNumber = doc.data().poleNumber;
        if (poleNumber) {
          results.set(poleNumber.toUpperCase(), {
            exists: true,
            documentId: doc.id
          });
        }
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error checking poles batch:', error);
    throw error;
  }
}

/**
 * Upsert a pole record - update if exists, create if not
 * @param {object} poleData - The pole data to save
 * @param {object} options - Options for the upsert operation
 * @returns {Promise<{action: string, documentId: string}>}
 */
async function upsertPoleRecord(poleData, options = {}) {
  const { 
    mergeData = true, // If true, merge with existing. If false, replace.
    usePropertyIdAsDocId = true // If true, use propertyId as document ID
  } = options;
  
  if (!poleData.poleNumber || !poleData.poleNumber.trim()) {
    throw new Error('Pole number is required');
  }
  
  const normalizedPole = poleData.poleNumber.trim().toUpperCase();
  poleData.poleNumber = normalizedPole;
  
  try {
    // Check if pole exists
    const existing = await checkPoleExists(normalizedPole);
    
    if (existing.exists) {
      // Update existing document
      const updateData = mergeData 
        ? mergeNonEmptyFields(existing.data, poleData)
        : poleData;
      
      await db.collection('vf-onemap-processed-records')
        .doc(existing.documentId)
        .set(updateData, { merge: mergeData });
      
      return {
        action: 'updated',
        documentId: existing.documentId
      };
    } else {
      // Create new document
      let docRef;
      
      if (usePropertyIdAsDocId && poleData.propertyId) {
        // Use propertyId as document ID
        docRef = db.collection('vf-onemap-processed-records').doc(poleData.propertyId);
        await docRef.set(poleData);
      } else {
        // Auto-generate document ID
        docRef = await db.collection('vf-onemap-processed-records').add(poleData);
      }
      
      return {
        action: 'created',
        documentId: docRef.id
      };
    }
  } catch (error) {
    console.error('Error upserting pole:', error);
    throw error;
  }
}

/**
 * Merge non-empty fields from new data into existing data
 * @param {object} existing - Existing document data
 * @param {object} newData - New data to merge
 * @returns {object} Merged data
 */
function mergeNonEmptyFields(existing, newData) {
  const merged = { ...existing };
  
  for (const [key, value] of Object.entries(newData)) {
    // Only update if new value is not empty
    if (value !== null && value !== undefined && value !== '') {
      // Special handling for arrays and objects
      if (Array.isArray(value) && value.length > 0) {
        merged[key] = value;
      } else if (typeof value === 'object' && Object.keys(value).length > 0) {
        merged[key] = value;
      } else if (typeof value !== 'object') {
        merged[key] = value;
      }
    }
  }
  
  // Ensure we always keep certain fields from existing if not in new data
  const preserveFields = ['createdAt', 'importBatchId', 'originalPropertyId'];
  preserveFields.forEach(field => {
    if (existing[field] && !newData[field]) {
      merged[field] = existing[field];
    }
  });
  
  // Add/update timestamp
  merged.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
  
  return merged;
}

/**
 * Validate CSV data for duplicate poles before import
 * @param {array} records - Array of records to validate
 * @returns {Promise<{valid: array, duplicates: array, report: object}>}
 */
async function validateImportForDuplicates(records) {
  console.log(`\n🔍 Validating ${records.length} records for duplicates...`);
  
  const report = {
    totalRecords: records.length,
    validRecords: 0,
    duplicateRecords: 0,
    recordsWithoutPoles: 0,
    existingPoles: new Map(),
    duplicatesInCSV: new Map()
  };
  
  const valid = [];
  const duplicates = [];
  const poleNumbers = [];
  const csvPoleMap = new Map();
  
  // First pass: check for duplicates within the CSV
  records.forEach((record, index) => {
    const poleNumber = record.poleNumber || record['Pole Number'] || '';
    
    if (!poleNumber || !poleNumber.trim()) {
      report.recordsWithoutPoles++;
      valid.push(record); // Records without poles are valid
      return;
    }
    
    const normalizedPole = poleNumber.trim().toUpperCase();
    record.normalizedPoleNumber = normalizedPole;
    
    if (csvPoleMap.has(normalizedPole)) {
      // Duplicate within CSV
      if (!report.duplicatesInCSV.has(normalizedPole)) {
        report.duplicatesInCSV.set(normalizedPole, [csvPoleMap.get(normalizedPole)]);
      }
      report.duplicatesInCSV.get(normalizedPole).push(index);
      duplicates.push(record);
      report.duplicateRecords++;
    } else {
      csvPoleMap.set(normalizedPole, index);
      poleNumbers.push(normalizedPole);
    }
  });
  
  // Second pass: check against database
  const existingPoles = await checkPolesExistBatch(poleNumbers);
  
  // Process results
  records.forEach(record => {
    if (!record.normalizedPoleNumber) return; // Already processed
    
    const poleNumber = record.normalizedPoleNumber;
    const existingPole = existingPoles.get(poleNumber);
    
    if (existingPole && existingPole.exists) {
      // Existing pole in database
      report.existingPoles.set(poleNumber, existingPole.documentId);
      record.existingDocumentId = existingPole.documentId;
      record.isDuplicate = true;
      duplicates.push(record);
      report.duplicateRecords++;
    } else if (!report.duplicatesInCSV.has(poleNumber)) {
      // Valid new pole
      valid.push(record);
      report.validRecords++;
    }
  });
  
  // Generate summary
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log(`Total records: ${report.totalRecords}`);
  console.log(`Valid new records: ${report.validRecords}`);
  console.log(`Duplicate records: ${report.duplicateRecords}`);
  console.log(`Records without poles: ${report.recordsWithoutPoles}`);
  console.log(`Duplicates within CSV: ${report.duplicatesInCSV.size} poles`);
  console.log(`Existing poles in database: ${report.existingPoles.size}`);
  
  return { valid, duplicates, report };
}

/**
 * Import records with duplicate prevention
 * @param {array} records - Records to import
 * @param {object} options - Import options
 * @returns {Promise<object>} Import results
 */
async function importWithDuplicatePrevention(records, options = {}) {
  const {
    batchSize = 500,
    updateExisting = true,
    validateFirst = true
  } = options;
  
  let recordsToProcess = records;
  let validationReport = null;
  
  // Validate first if requested
  if (validateFirst) {
    const validation = await validateImportForDuplicates(records);
    validationReport = validation.report;
    
    if (updateExisting) {
      // Process all records (including duplicates for updates)
      recordsToProcess = records;
    } else {
      // Only process new records
      recordsToProcess = validation.valid;
    }
  }
  
  console.log(`\n📥 Importing ${recordsToProcess.length} records...`);
  
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  };
  
  // Process in batches
  for (let i = 0; i < recordsToProcess.length; i += batchSize) {
    const batch = recordsToProcess.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recordsToProcess.length/batchSize)}...`);
    
    // Use Promise.all for parallel processing within batch
    const batchPromises = batch.map(async (record) => {
      try {
        const result = await upsertPoleRecord(record, {
          mergeData: updateExisting,
          usePropertyIdAsDocId: true
        });
        
        if (result.action === 'created') {
          results.created++;
        } else {
          results.updated++;
        }
      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          record: record.propertyId || record.poleNumber,
          error: error.message
        });
      }
    });
    
    await Promise.all(batchPromises);
  }
  
  console.log('\n✅ IMPORT COMPLETE:');
  console.log(`Created: ${results.created} new records`);
  console.log(`Updated: ${results.updated} existing records`);
  console.log(`Errors: ${results.errors}`);
  
  return {
    ...results,
    validationReport
  };
}

// Export functions for use in other scripts
module.exports = {
  checkPoleExists,
  checkPolesExistBatch,
  upsertPoleRecord,
  mergeNonEmptyFields,
  validateImportForDuplicates,
  importWithDuplicatePrevention
};

// If run directly, show usage
if (require.main === module) {
  console.log('\n📚 Duplicate Prevention System for VF OneMap');
  console.log('=' .repeat(60));
  console.log('\nThis module provides functions to prevent duplicate poles.');
  console.log('\nUsage in your import scripts:');
  console.log('\nconst { importWithDuplicatePrevention } = require("./prevent-duplicate-poles");');
  console.log('\nconst results = await importWithDuplicatePrevention(records, {');
  console.log('  updateExisting: true,  // Update existing poles');
  console.log('  validateFirst: true,   // Validate before import');
  console.log('  batchSize: 500        // Process in batches');
  console.log('});');
  console.log('\nAvailable functions:');
  console.log('- checkPoleExists(poleNumber)');
  console.log('- checkPolesExistBatch(poleNumbers[])');
  console.log('- upsertPoleRecord(poleData, options)');
  console.log('- validateImportForDuplicates(records)');
  console.log('- importWithDuplicatePrevention(records, options)');
}