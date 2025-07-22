#!/usr/bin/env node

/**
 * Handle records with "Missing" status
 * - Flags them in processing database
 * - Exports to daily CSV for tracking
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function handleMissingStatusRecords() {
  console.log('🔍 Processing records with Missing status...\n');
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // 1. Query all "Missing" status records
    const snapshot = await db.collection('onemap-processing-staging')
      .where('status', '==', 'Missing')
      .get();
    
    console.log(`Found ${snapshot.size} records with Missing status`);
    
    if (snapshot.empty) {
      console.log('No missing status records found.');
      return;
    }
    
    // 2. Prepare data for export and flagging
    const missingRecords = [];
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Prepare for CSV export
      missingRecords.push({
        propertyId: data.propertyId,
        status: data.status,
        locationAddress: data.locationAddress || '',
        gpsLatitude: data.gpsLatitude || '',
        gpsLongitude: data.gpsLongitude || '',
        fieldAgent: data.fieldAgentPolePermission || 'No Agent',
        lastModified: data.lastModifiedDate || '',
        importDate: data._meta?.createdAt?.toDate()?.toISOString() || '',
        flaggedDate: today
      });
      
      // Flag in database
      const docRef = db.collection('onemap-processing-staging').doc(doc.id);
      batch.update(docRef, {
        '_processingFlags': {
          isMissingStatus: true,
          flaggedDate: today,
          reason: 'No pole number assigned',
          requiresFieldWork: true,
          exportedToCSV: true,
          csvExportDate: today
        },
        '_meta.lastProcessed': admin.firestore.Timestamp.now()
      });
    });
    
    // 3. Export to CSV
    const csvDir = 'exports/missing-status';
    await fs.mkdir(csvDir, { recursive: true });
    
    const csvPath = path.join(csvDir, `missing-status-${today}.csv`);
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'propertyId', title: 'Property ID' },
        { id: 'status', title: 'Status' },
        { id: 'locationAddress', title: 'Location Address' },
        { id: 'gpsLatitude', title: 'GPS Latitude' },
        { id: 'gpsLongitude', title: 'GPS Longitude' },
        { id: 'fieldAgent', title: 'Field Agent' },
        { id: 'lastModified', title: 'Last Modified' },
        { id: 'importDate', title: 'Import Date' },
        { id: 'flaggedDate', title: 'Flagged Date' }
      ]
    });
    
    await csvWriter.writeRecords(missingRecords);
    console.log(`\n✅ Exported ${missingRecords.length} records to: ${csvPath}`);
    
    // 4. Commit database updates
    await batch.commit();
    console.log('✅ Flagged all missing status records in database');
    
    // 5. Generate summary
    console.log('\n📊 Summary:');
    console.log(`- Total Missing Status Records: ${missingRecords.length}`);
    console.log(`- Exported to: ${csvPath}`);
    console.log(`- Database flags added: _processingFlags.isMissingStatus = true`);
    
    // 6. Save summary report
    const report = `
# Missing Status Records Report
Date: ${new Date().toISOString()}

## Summary
- Total Records: ${missingRecords.length}
- Status: Missing (no pole number assigned)
- Action: Flagged in database and exported to CSV

## Export Location
${csvPath}

## Database Flags Added
- _processingFlags.isMissingStatus: true
- _processingFlags.requiresFieldWork: true
- _processingFlags.exportedToCSV: true

## Next Steps
1. Share CSV with field team for pole assignment
2. Once poles assigned, update records
3. Remove flags when resolved
`;
    
    await fs.writeFile(`exports/missing-status/report-${today}.md`, report);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  handleMissingStatusRecords();
}

module.exports = { handleMissingStatusRecords };