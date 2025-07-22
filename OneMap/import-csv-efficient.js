#!/usr/bin/env node

/**
 * Efficient CSV import with automatic completion
 * Processes in small batches to avoid timeouts
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

async function importCSV(csvFilePath) {
  const importId = `IMP_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
  const fileName = path.basename(csvFilePath);
  
  console.log(`\n📂 Starting import: ${fileName}`);
  console.log(`📋 Import ID: ${importId}`);
  
  try {
    // Read and parse CSV
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
    
    // Create import record
    await db.collection('onemap-processing-imports').doc(importId).set({
      import_id: importId,
      fileName: fileName,
      totalRecords: allRecords.length,
      status: 'processing',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Process in small batches
    const BATCH_SIZE = 50; // Smaller batches to avoid timeouts
    let imported = 0;
    const errors = [];
    
    for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
      const batch = allRecords.slice(i, i + BATCH_SIZE);
      const writeBatch = db.batch();
      
      for (const record of batch) {
        try {
          const propertyId = record['Property ID'] || record['﻿Property ID'];
          if (!propertyId) continue;
          
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
        } catch (error) {
          errors.push({ record: record['Property ID'], error: error.message });
        }
      }
      
      try {
        await writeBatch.commit();
        imported += batch.length;
        
        if (imported % 200 === 0 || imported === allRecords.length) {
          console.log(`✅ Imported ${imported}/${allRecords.length} records (${Math.round(imported/allRecords.length * 100)}%)...`);
        }
      } catch (error) {
        console.error('❌ Batch commit error:', error.message);
        // Continue with next batch
      }
    }
    
    // Update import status
    await db.collection('onemap-processing-imports').doc(importId).update({
      status: 'completed',
      processedCount: imported,
      errorCount: errors.length,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`\n✅ Import completed!`);
    console.log(`Total imported: ${imported}`);
    console.log(`Errors: ${errors.length}`);
    
    // Generate report
    await generateImportReport(importId, fileName, allRecords.length, imported, errors);
    
    // Return for chaining
    return { importId, imported, total: allRecords.length };
    
  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  }
}

function mapToFibreFlow(record) {
  const propertyId = record['Property ID'] || record['﻿Property ID'];
  
  const mapped = {
    propertyId: propertyId,
    oneMapNadId: record['1map NAD ID'],
    status: record['Status'],
    flowNameGroups: record['Flow Name Groups'],
    site: record['Site'],
    locationAddress: record['Location Address'],
    poleNumber: record['Pole Number'],
    dropNumber: record['Drop Number'],
    gpsLatitude: parseFloat(record['Pole Permissions - Actual Device Location (Latitude)'] || 
                           record['Latitude'] || 0),
    gpsLongitude: parseFloat(record['Pole Permissions - Actual Device Location (Longitude)'] || 
                            record['Longitude'] || 0),
    fieldAgentPolePermission: record['Field Agent Name (pole permission)'],
    lastModifiedDate: record['lst_mod_dt'],
    dateStatusChanged: record['date_status_changed']
  };
  
  // Clean up
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

async function generateImportReport(importId, fileName, total, imported, errors) {
  // Get imported records for analysis
  const snapshot = await db.collection('onemap-processing-staging')
    .where('import_id', '==', importId)
    .get();
  
  const stats = {
    total: imported,
    withPoles: 0,
    withoutPoles: 0,
    withAgents: 0,
    byStatus: {},
    poleCount: {}
  };
  
  snapshot.forEach(doc => {
    const mapped = doc.data().mapped_data || {};
    
    if (mapped.poleNumber) {
      stats.withPoles++;
      stats.poleCount[mapped.poleNumber] = (stats.poleCount[mapped.poleNumber] || 0) + 1;
    } else {
      stats.withoutPoles++;
    }
    
    if (mapped.fieldAgentPolePermission) {
      stats.withAgents++;
    }
    
    const status = mapped.status || 'No Status';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
  });
  
  const duplicatePoles = Object.entries(stats.poleCount)
    .filter(([pole, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  const report = `# IMPORT REPORT - ${fileName}

Generated: ${new Date().toISOString()}  
Import ID: ${importId}

## Summary
- **Total Records in CSV**: ${total}
- **Successfully Imported**: ${imported}
- **Import Rate**: ${Math.round(imported/total * 100)}%
- **Errors**: ${errors.length}

## Data Quality
- **Records with Poles**: ${stats.withPoles} (${Math.round(stats.withPoles/imported * 100)}%)
- **Records without Poles**: ${stats.withoutPoles} (${Math.round(stats.withoutPoles/imported * 100)}%)
- **Records with Agents**: ${stats.withAgents} (${Math.round(stats.withAgents/imported * 100)}%)

## Status Distribution
${Object.entries(stats.byStatus)
  .sort((a, b) => b[1] - a[1])
  .map(([status, count]) => `- **${status}**: ${count}`)
  .join('\n')}

## Duplicate Poles (${duplicatePoles.length} found)
${duplicatePoles.slice(0, 10)
  .map(([pole, count]) => `- ${pole}: ${count} properties`)
  .join('\n')}
${duplicatePoles.length > 10 ? `\n... and ${duplicatePoles.length - 10} more` : ''}

---
*Ready for production sync*
`;
  
  const reportPath = `OneMap/reports/IMPORT_${importId}.md`;
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, report);
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node import-csv-efficient.js <csv-file-path>');
  process.exit(1);
}

importCSV(args[0])
  .then(result => {
    console.log('\n✅ Import complete. Ready for production sync.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });