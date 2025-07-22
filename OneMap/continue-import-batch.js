#!/usr/bin/env node

/**
 * Continue incomplete imports with batch processing
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../fibreflow-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://fibreflow-73daf.firebaseio.com'
  });
}

const db = admin.firestore();

async function continueImport(importId, csvFilePath) {
  console.log(`🔄 Continuing import ${importId}...`);
  
  try {
    // Read CSV file
    const fileContent = await fs.readFile(csvFilePath, 'utf-8');
    const allRecords = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`📊 Total records in CSV: ${allRecords.length}`);
    
    // Get already imported records
    const importedSnapshot = await db.collection('onemap-processing-staging')
      .where('import_id', '==', importId)
      .get();
    
    const importedIds = new Set();
    importedSnapshot.forEach(doc => {
      const data = doc.data();
      // Check both mapped_data.propertyId and raw propertyId
      const propertyId = data.mapped_data?.propertyId || data.propertyId || data.property_id;
      if (propertyId) {
        importedIds.add(propertyId);
      }
    });
    
    console.log(`✅ Already imported: ${importedIds.size} records`);
    
    // Filter records to import
    const recordsToImport = allRecords.filter(record => {
      const propertyId = record['Property ID'] || record['﻿Property ID'];
      return propertyId && !importedIds.has(propertyId);
    });
    
    console.log(`📋 Records to import: ${recordsToImport.length}`);
    
    if (recordsToImport.length === 0) {
      console.log('✅ All records already imported!');
      await updateImportStatus(importId, 'completed', allRecords.length);
      return;
    }
    
    // Process in batches
    const BATCH_SIZE = 100; // Reduced from 500 to avoid transaction size limit
    let totalImported = importedIds.size;
    
    for (let i = 0; i < recordsToImport.length; i += BATCH_SIZE) {
      const batch = recordsToImport.slice(i, i + BATCH_SIZE);
      const writeBatch = db.batch();
      
      for (const record of batch) {
        const propertyId = record['Property ID'] || record['﻿Property ID'];
        const recordId = `PROP_${propertyId}_${importId}`;
        const docRef = db.collection('onemap-processing-staging').doc(recordId);
        
        const mappedData = mapToFibreFlow(record);
        
        writeBatch.set(docRef, {
          id: recordId,
          import_id: importId,
          raw_data: record,
          mapped_data: mappedData,
          status: 'new',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      await writeBatch.commit();
      totalImported += batch.length;
      
      console.log(`✅ Imported ${totalImported}/${allRecords.length} records (${Math.round(totalImported/allRecords.length * 100)}%)...`);
    }
    
    // Update import status
    await updateImportStatus(importId, 'completed', allRecords.length);
    
    console.log(`\n✅ Import completed!`);
    console.log(`Total records imported: ${totalImported}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await updateImportStatus(importId, 'error', 0);
  }
}

function mapToFibreFlow(record) {
  const propertyId = record['Property ID'] || record['﻿Property ID'];
  
  const mapped = {
    // Core identifiers
    propertyId: propertyId,
    oneMapNadId: record['1map NAD ID'],
    
    // Status and workflow
    status: record['Status'],
    flowNameGroups: record['Flow Name Groups'],
    
    // Location info
    site: record['Site'],
    locationAddress: record['Location Address'],
    
    // Pole and drop info
    poleNumber: record['Pole Number'],
    dropNumber: record['Drop Number'],
    
    // GPS coordinates
    gpsLatitude: parseFloat(record['Pole Permissions - Actual Device Location (Latitude)'] || 
                           record['Latitude'] || 0),
    gpsLongitude: parseFloat(record['Pole Permissions - Actual Device Location (Longitude)'] || 
                            record['Longitude'] || 0),
    
    // Field agent
    fieldAgentPolePermission: record['Field Agent Name (pole permission)'],
    
    // Timestamps
    lastModifiedDate: record['lst_mod_dt'],
    dateStatusChanged: record['date_status_changed']
  };
  
  // Clean up - remove empty/null/undefined/zero values
  Object.keys(mapped).forEach(key => {
    const value = mapped[key];
    
    if (value === '' || value === null || value === undefined) {
      delete mapped[key];
    } else if (typeof value === 'string' && value.trim() === '') {
      delete mapped[key];
    } else if ((key === 'gpsLatitude' || key === 'gpsLongitude') && 
               (isNaN(value) || value === 0)) {
      delete mapped[key];
    }
  });
  
  return mapped;
}

async function updateImportStatus(importId, status, totalRecords) {
  await db.collection('onemap-processing-imports').doc(importId).update({
    status: status,
    processedCount: totalRecords,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node continue-import-batch.js <import-id> <csv-file-path>');
  process.exit(1);
}

const [importId, csvFilePath] = args;
continueImport(importId, csvFilePath).then(() => process.exit(0));