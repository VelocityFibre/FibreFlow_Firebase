#!/usr/bin/env node

/**
 * Generate comprehensive report from vf-onemap-data Firebase database
 * Adapted from CSV report scripts to work with live data
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin with vf-onemap-data
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function generateFirebaseReport() {
  console.log('📊 Generating comprehensive report from vf-onemap-data...\n');
  
  try {
    // Get all records from vf-onemap-data
    const snapshot = await db.collection('vf-onemap-processed-records').get();
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Get import batches
    const batchesSnapshot = await db.collection('vf-onemap-import-batches')
      .orderBy('importedAt', 'desc')
      .get();
    
    const batches = [];
    batchesSnapshot.forEach(doc => {
      batches.push(doc.data());
    });
    
    // Analyze data
    const analysis = {
      total: records.length,
      byStatus: {},
      byFieldAgent: {},
      byPolePrefix: {},
      byImportBatch: {},
      missingData: {
        noPoleNumber: 0,
        noFieldAgent: 0,
        noGPS: 0,
        noDropNumber: 0
      },
      duplicatePoles: {},
      gpsRange: {
        minLat: 90,
        maxLat: -90,
        minLng: 180,
        maxLng: -180
      }
    };
    
    // Process each record
    records.forEach(record => {
      // Status breakdown
      const status = record.status || 'No Status';
      analysis.byStatus[status] = (analysis.byStatus[status] || 0) + 1;
      
      // Field agent breakdown
      const agent = record.fieldAgentName || 'No Agent';
      analysis.byFieldAgent[agent] = (analysis.byFieldAgent[agent] || 0) + 1;
      
      // Import batch breakdown
      if (record.importBatchId) {
        analysis.byImportBatch[record.importBatchId] = (analysis.byImportBatch[record.importBatchId] || 0) + 1;
      }
      
      // Pole prefix breakdown
      if (record.poleNumber) {
        const prefix = record.poleNumber.split('.')[0];
        analysis.byPolePrefix[prefix] = (analysis.byPolePrefix[prefix] || 0) + 1;
        
        // Track duplicate poles
        if (!analysis.duplicatePoles[record.poleNumber]) {
          analysis.duplicatePoles[record.poleNumber] = [];
        }
        analysis.duplicatePoles[record.poleNumber].push({
          propertyId: record.propertyId,
          address: record.locationAddress,
          agent: record.fieldAgentName
        });
      } else {
        analysis.missingData.noPoleNumber++;
      }
      
      // Missing data checks
      if (!record.fieldAgentName) analysis.missingData.noFieldAgent++;
      if (!record.dropNumber) analysis.missingData.noDropNumber++;
      
      // GPS analysis
      const lat = parseFloat(record.latitude);
      const lng = parseFloat(record.longitude);
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        analysis.missingData.noGPS++;
      } else {
        // GPS range
        analysis.gpsRange.minLat = Math.min(analysis.gpsRange.minLat, lat);
        analysis.gpsRange.maxLat = Math.max(analysis.gpsRange.maxLat, lat);
        analysis.gpsRange.minLng = Math.min(analysis.gpsRange.minLng, lng);
        analysis.gpsRange.maxLng = Math.max(analysis.gpsRange.maxLng, lng);
      }
    });
    
    // Find actual duplicate poles (more than 1 property)
    const trueDuplicatePoles = {};
    Object.entries(analysis.duplicatePoles).forEach(([pole, properties]) => {
      if (properties.length > 1) {
        trueDuplicatePoles[pole] = properties;
      }
    });
    
    // Generate report
    const reportDate = new Date().toISOString();
    const report = `# VF-ONEMAP-DATA COMPREHENSIVE REPORT
=====================================

Generated: ${reportDate}
Database: vf-onemap-data
Collection: vf-onemap-processed-records

## SUMMARY
---------
**Total Records**: ${analysis.total}
**Import Batches**: ${batches.length}

## IMPORT HISTORY
${batches.map(batch => `
### ${batch.batchId}
- **File**: ${batch.fileName}
- **Records**: ${batch.totalRecords}
- **Imported**: ${batch.importedAt ? new Date(batch.importedAt._seconds * 1000).toISOString() : 'Unknown'}
- **Status**: ${batch.status}`).join('\n')}

## DATA BREAKDOWN

### By Status
${Object.entries(analysis.byStatus)
  .sort(([,a], [,b]) => b - a)
  .map(([status, count]) => `- ${status}: ${count} (${((count/analysis.total)*100).toFixed(1)}%)`)
  .join('\n')}

### By Field Agent (Top 15)
${Object.entries(analysis.byFieldAgent)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 15)
  .map(([agent, count]) => `- ${agent}: ${count} permissions`)
  .join('\n')}
${Object.keys(analysis.byFieldAgent).length > 15 ? `\n... and ${Object.keys(analysis.byFieldAgent).length - 15} more agents` : ''}

### By Pole Prefix
${Object.entries(analysis.byPolePrefix)
  .sort(([,a], [,b]) => b - a)
  .map(([prefix, count]) => `- ${prefix}: ${count} poles`)
  .join('\n')}

## DATA QUALITY

### Missing Data Analysis
- Records without Pole Number: ${analysis.missingData.noPoleNumber} (${((analysis.missingData.noPoleNumber/analysis.total)*100).toFixed(1)}%)
- Records without Field Agent: ${analysis.missingData.noFieldAgent} (${((analysis.missingData.noFieldAgent/analysis.total)*100).toFixed(1)}%)
- Records without GPS: ${analysis.missingData.noGPS} (${((analysis.missingData.noGPS/analysis.total)*100).toFixed(1)}%)
- Records without Drop Number: ${analysis.missingData.noDropNumber} (${((analysis.missingData.noDropNumber/analysis.total)*100).toFixed(1)}%)

### Duplicate Poles Analysis
- Total unique poles: ${Object.keys(analysis.duplicatePoles).length}
- Poles appearing multiple times: ${Object.keys(trueDuplicatePoles).length}

${Object.keys(trueDuplicatePoles).length > 0 ? `
#### Top 10 Duplicate Poles:
${Object.entries(trueDuplicatePoles)
  .sort(([,a], [,b]) => b.length - a.length)
  .slice(0, 10)
  .map(([pole, props]) => `
**${pole}**: ${props.length} properties
${props.map(p => `  - Property: ${p.propertyId}, Agent: ${p.agent || 'N/A'}`).join('\n')}`)
  .join('\n')}` : 'No duplicate poles found.'}

### GPS Coverage Area
${analysis.gpsRange.minLat < 90 ? `- Latitude Range: ${analysis.gpsRange.minLat.toFixed(6)} to ${analysis.gpsRange.maxLat.toFixed(6)}
- Longitude Range: ${analysis.gpsRange.minLng.toFixed(6)} to ${analysis.gpsRange.maxLng.toFixed(6)}
- Area: Lawley Estate, Lenasia, Johannesburg` : '- No valid GPS coordinates found'}

## DATA READINESS

### For Production Sync
- **Ready for FibreFlow sync**: ${analysis.total - analysis.missingData.noPoleNumber} records (have pole numbers)
- **Need attention**: ${analysis.missingData.noPoleNumber} records (missing pole numbers)

### Quality Score
${(() => {
  const score = 100 - 
    (analysis.missingData.noPoleNumber / analysis.total) * 30 -
    (analysis.missingData.noFieldAgent / analysis.total) * 20 -
    (Object.keys(trueDuplicatePoles).length / Math.max(Object.keys(analysis.duplicatePoles).length, 1)) * 20;
  
  const rating = score >= 90 ? '🟢 Excellent' : 
                 score >= 80 ? '🟡 Good' : 
                 score >= 70 ? '🟠 Fair' : '🔴 Needs Work';
  
  return `**${Math.max(0, score).toFixed(0)}/100 ${rating}**`;
})()}

## ACTION ITEMS

1. **Duplicate Poles** - ${Object.keys(trueDuplicatePoles).length} poles assigned to multiple properties
2. **Missing Pole Numbers** - ${analysis.missingData.noPoleNumber} records cannot be processed
3. **Field Agent Assignment** - ${analysis.missingData.noFieldAgent} records need agent verification
4. **GPS Coordinates** - ${analysis.missingData.noGPS} records missing location data

## SAMPLE RECORDS

### Sample "Pole Permission: Approved" Records
${records
  .filter(r => r.status === 'Pole Permission: Approved' && r.poleNumber)
  .slice(0, 5)
  .map((r, i) => `
${i + 1}. Property: ${r.propertyId}
   - Pole: ${r.poleNumber}
   - Agent: ${r.fieldAgentName || 'N/A'}
   - Location: ${r.locationAddress?.substring(0, 50)}...
   - GPS: [${r.latitude}, ${r.longitude}]`)
  .join('\n')}

### Sample Records Missing Pole Numbers
${records
  .filter(r => !r.poleNumber)
  .slice(0, 5)
  .map((r, i) => `
${i + 1}. Property: ${r.propertyId}
   - Status: ${r.status}
   - Location: ${r.locationAddress?.substring(0, 50)}...
   - Drop: ${r.dropNumber || 'N/A'}`)
  .join('\n')}

---
*Report generated from vf-onemap-data Firebase database*
*Total processing time: ${new Date() - new Date(reportDate)}ms*
`;
    
    // Save report
    const reportsDir = path.join(__dirname, '../reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = path.join(reportsDir, `firebase_report_${new Date().toISOString().split('T')[0]}_${Date.now()}.md`);
    await fs.writeFile(filename, report);
    
    console.log(`✅ Report generated: ${filename}`);
    console.log('\nQuick Summary:');
    console.log(`- Total records: ${analysis.total}`);
    console.log(`- Ready for sync: ${analysis.total - analysis.missingData.noPoleNumber}`);
    console.log(`- Duplicate poles: ${Object.keys(trueDuplicatePoles).length}`);
    console.log(`- Quality score: ${Math.max(0, 100 - (analysis.missingData.noPoleNumber / analysis.total) * 30 - (analysis.missingData.noFieldAgent / analysis.total) * 20 - (Object.keys(trueDuplicatePoles).length / Math.max(Object.keys(analysis.duplicatePoles).length, 1)) * 20).toFixed(0)}/100`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the report
generateFirebaseReport();