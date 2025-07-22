const admin = require('firebase-admin');
const fs = require('fs').promises;

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function generateFullImportReport() {
  console.log('📊 Generating comprehensive import report...\n');
  
  try {
    // Get all staged records
    const snapshot = await db.collection('onemap-processing-staging').get();
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Analyze data
    const analysis = {
      total: records.length,
      byStatus: {},
      byFieldAgent: {},
      byPolePrefix: {},
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
      const agent = record.fieldAgentPolePermission || 'No Agent';
      analysis.byFieldAgent[agent] = (analysis.byFieldAgent[agent] || 0) + 1;
      
      // Pole prefix breakdown
      if (record.poleNumber) {
        const prefix = record.poleNumber.split('.')[0];
        analysis.byPolePrefix[prefix] = (analysis.byPolePrefix[prefix] || 0) + 1;
        
        // Track duplicate poles
        if (!analysis.duplicatePoles[record.poleNumber]) {
          analysis.duplicatePoles[record.poleNumber] = [];
        }
        analysis.duplicatePoles[record.poleNumber].push(record.propertyId);
      } else {
        analysis.missingData.noPoleNumber++;
      }
      
      // Missing data checks
      if (!record.fieldAgentPolePermission) analysis.missingData.noFieldAgent++;
      if (!record.dropNumber) analysis.missingData.noDropNumber++;
      if (!record.gpsLatitude || !record.gpsLongitude) {
        analysis.missingData.noGPS++;
      } else {
        // GPS range
        analysis.gpsRange.minLat = Math.min(analysis.gpsRange.minLat, record.gpsLatitude);
        analysis.gpsRange.maxLat = Math.max(analysis.gpsRange.maxLat, record.gpsLatitude);
        analysis.gpsRange.minLng = Math.min(analysis.gpsRange.minLng, record.gpsLongitude);
        analysis.gpsRange.maxLng = Math.max(analysis.gpsRange.maxLng, record.gpsLongitude);
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
    const report = `
# 1MAP COMPLETE IMPORT REPORT
========================

Generated: ${reportDate}
Collection: onemap-processing-staging

## SUMMARY
---------
**Total Records Imported**: ${analysis.total}

## DATA BREAKDOWN

### By Status
${Object.entries(analysis.byStatus)
  .sort(([,a], [,b]) => b - a)
  .map(([status, count]) => `- ${status}: ${count} (${((count/analysis.total)*100).toFixed(1)}%)`)
  .join('\n')}

### By Field Agent
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

### Duplicate Poles
- Total unique poles: ${Object.keys(analysis.duplicatePoles).length}
- Poles appearing multiple times: ${Object.keys(trueDuplicatePoles).length}

${Object.keys(trueDuplicatePoles).length > 0 ? `
Top duplicate poles:
${Object.entries(trueDuplicatePoles)
  .sort(([,a], [,b]) => b.length - a.length)
  .slice(0, 10)
  .map(([pole, props]) => `- ${pole}: ${props.length} properties`)
  .join('\n')}` : ''}

### GPS Coverage Area
- Latitude Range: ${analysis.gpsRange.minLat.toFixed(6)} to ${analysis.gpsRange.maxLat.toFixed(6)}
- Longitude Range: ${analysis.gpsRange.minLng.toFixed(6)} to ${analysis.gpsRange.maxLng.toFixed(6)}
- Area: Lawley Estate, Lenasia, Johannesburg

## DATA READINESS

### For Production Sync
- **Ready for sync**: ${analysis.total - analysis.missingData.noPoleNumber} records (have pole numbers)
- **Need attention**: ${analysis.missingData.noPoleNumber} records (missing pole numbers)

### Quality Score
${(() => {
  const score = 100 - 
    (analysis.missingData.noPoleNumber / analysis.total) * 20 -
    (analysis.missingData.noFieldAgent / analysis.total) * 10 -
    (Object.keys(trueDuplicatePoles).length / Object.keys(analysis.duplicatePoles).length) * 10;
  
  const rating = score >= 90 ? '🟢 Excellent' : 
                 score >= 80 ? '🟡 Good' : 
                 score >= 70 ? '🟠 Fair' : '🔴 Needs Work';
  
  return `**${score.toFixed(0)}/100 ${rating}**`;
})()}

## IMPORT METADATA

### Import Sessions
${await (async () => {
  const imports = {};
  records.forEach(r => {
    if (r._meta?.importId) {
      imports[r._meta.importId] = (imports[r._meta.importId] || 0) + 1;
    }
  });
  return Object.entries(imports)
    .map(([id, count]) => `- ${id}: ${count} records`)
    .join('\n');
})()}

## NEXT STEPS

1. **Review duplicate poles** - ${Object.keys(trueDuplicatePoles).length} poles need verification
2. **Missing pole numbers** - ${analysis.missingData.noPoleNumber} records cannot be synced without poles
3. **Field agent validation** - ${analysis.missingData.noFieldAgent} records missing agent assignment
4. **Ready for production sync** - ${analysis.total - analysis.missingData.noPoleNumber} records can be synced

## SAMPLE RECORDS

### Sample "Pole Permission: Approved" Records
${records
  .filter(r => r.status === 'Pole Permission: Approved' && r.poleNumber)
  .slice(0, 5)
  .map((r, i) => `
${i + 1}. Property: ${r.propertyId}
   - Pole: ${r.poleNumber}
   - Agent: ${r.fieldAgentPolePermission || 'N/A'}
   - Location: ${r.locationAddress?.substring(0, 50)}...
   - GPS: [${r.gpsLatitude?.toFixed(6)}, ${r.gpsLongitude?.toFixed(6)}]`)
  .join('\n')}

### Sample Records Missing Pole Numbers
${records
  .filter(r => !r.poleNumber)
  .slice(0, 5)
  .map((r, i) => `
${i + 1}. Property: ${r.propertyId}
   - Status: ${r.status}
   - Location: ${r.locationAddress?.substring(0, 50)}...`)
  .join('\n')}

---
*Report generated from onemap-processing-staging collection*
*Use sync-to-production.js to sync approved records to FibreFlow*
`;
    
    // Save report
    const filename = `reports/full_import_report_${new Date().toISOString().split('T')[0]}_${Date.now()}.md`;
    await fs.writeFile(filename, report);
    
    console.log(`✅ Report generated: ${filename}`);
    console.log('\nQuick Summary:');
    console.log(`- Total records: ${analysis.total}`);
    console.log(`- Ready for sync: ${analysis.total - analysis.missingData.noPoleNumber}`);
    console.log(`- Need attention: ${analysis.missingData.noPoleNumber}`);
    
    // Also display the report
    console.log('\n' + '='.repeat(50));
    console.log(report);
    
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

generateFullImportReport();