#!/usr/bin/env node

/**
 * Batch import to complete the 1Map sync
 * Processes records in batches to avoid timeouts
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const { Timestamp } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

const PROCESSING_STAGING = 'onemap-processing-staging';
const BATCH_SIZE = 50; // Process 50 records at a time

async function completeBatchImport() {
  console.log('🚀 Starting batch import to complete staging...\n');
  
  try {
    // Read CSV
    const fileContent = await fs.readFile('downloads/Lawley May Week 3 22052025 - First Report.csv', 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`📊 Total records in CSV: ${records.length}`);
    
    // Check what's already imported
    const existingDocs = await db.collection(PROCESSING_STAGING).get();
    const existingPropertyIds = new Set();
    existingDocs.forEach(doc => {
      if (doc.data().propertyId) {
        existingPropertyIds.add(doc.data().propertyId);
      }
    });
    
    console.log(`✅ Already imported: ${existingPropertyIds.size} records`);
    
    // Filter records that need importing
    const recordsToImport = records.filter(record => {
      const propertyId = record['Property ID'] || record['﻿Property ID'];
      return propertyId && !existingPropertyIds.has(propertyId.trim());
    });
    
    console.log(`📋 Records to import: ${recordsToImport.length}`);
    
    if (recordsToImport.length === 0) {
      console.log('✅ All records already imported!');
      return;
    }
    
    // Process in batches
    const importId = `IMP_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < recordsToImport.length; i += BATCH_SIZE) {
      const batch = recordsToImport.slice(i, i + BATCH_SIZE);
      const writeBatch = db.batch();
      
      console.log(`\n🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(recordsToImport.length/BATCH_SIZE)}...`);
      
      for (const record of batch) {
        try {
          const propertyId = record['Property ID'] || record['﻿Property ID'];
          const recordId = `PROP_${propertyId.trim()}`;
          
          const mappedData = {
            // Core identifiers
            propertyId: propertyId.trim(),
            oneMapNadId: record['1map NAD ID'],
            
            // Status and workflow
            status: record['Status'],
            flowNameGroups: record['Flow Name Groups'],
            
            // Location info
            site: record['Site'],
            locationAddress: record['Location Address'],
            sections: record['Sections'],
            
            // Pole and drop info
            poleNumber: record['Pole Number'],
            dropNumber: record['Drop Number'],
            pons: record['PONs'],
            
            // GPS coordinates
            gpsLatitude: parseFloat(record['Pole Permissions - Actual Device Location (Latitude)'] || 0),
            gpsLongitude: parseFloat(record['Pole Permissions - Actual Device Location (Longitude)'] || 0),
            
            // Field agent
            fieldAgentPolePermission: record['Field Agent Name (pole permission)'],
            
            // Timestamps
            lastModifiedDate: record['lst_mod_dt'],
            dateStatusChanged: record['date_status_changed'],
            
            // Metadata
            _meta: {
              importId: importId,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            }
          };
          
          // Clean empty values
          Object.keys(mappedData).forEach(key => {
            if (key !== '_meta' && (mappedData[key] === '' || mappedData[key] === null || mappedData[key] === undefined)) {
              delete mappedData[key];
            }
          });
          
          const docRef = db.collection(PROCESSING_STAGING).doc(recordId);
          writeBatch.set(docRef, mappedData);
          
        } catch (error) {
          console.error(`❌ Error processing ${record['Property ID']}: ${error.message}`);
          errors++;
        }
      }
      
      // Commit batch
      try {
        await writeBatch.commit();
        imported += batch.length;
        console.log(`✅ Imported ${batch.length} records (Total: ${imported}/${recordsToImport.length})`);
      } catch (error) {
        console.error(`❌ Batch commit error: ${error.message}`);
        errors += batch.length;
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final check
    const finalCount = await db.collection(PROCESSING_STAGING).get();
    
    console.log(`\n🎉 Import Complete!`);
    console.log(`📊 Final Statistics:`);
    console.log(`- Total in staging: ${finalCount.size} records`);
    console.log(`- Newly imported: ${imported} records`);
    console.log(`- Errors: ${errors} records`);
    console.log(`- Success rate: ${((imported/(imported+errors))*100).toFixed(1)}%`);
    
    // Generate completion report
    const report = `
BATCH IMPORT COMPLETION REPORT
==============================
Date: ${new Date().toISOString()}
Import ID: ${importId}

RESULTS
-------
CSV Total: ${records.length}
Previously Imported: ${existingPropertyIds.size}
Newly Imported: ${imported}
Errors: ${errors}
Final Staging Total: ${finalCount.size}

STATUS: ${finalCount.size === records.length ? '✅ COMPLETE' : '⚠️ PARTIAL'}
${finalCount.size < records.length ? `Missing: ${records.length - finalCount.size} records` : ''}
`;
    
    await fs.writeFile(`reports/batch_import_completion_${importId}.txt`, report);
    console.log(`\n📄 Report saved to: reports/batch_import_completion_${importId}.txt`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the import
completeBatchImport();