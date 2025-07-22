const admin = require('firebase-admin');
const fs = require('fs').promises;
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

async function generateFullReport(importId, fileName) {
  console.log(`📊 Generating full report for ${importId}...`);
  
  try {
    // Get all records for this import
    const snapshot = await db.collection('onemap-processing-staging')
      .where('import_id', '==', importId)
      .get();
    
    console.log(`Found ${snapshot.size} records`);
    
    // Analyze data
    const stats = {
      total: snapshot.size,
      withPoles: 0,
      withoutPoles: 0,
      withAgents: 0,
      withoutAgents: 0,
      byStatus: {},
      poleCount: {},
      agentCount: {},
      duplicatePoles: []
    };
    
    const sampleRecords = [];
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const mapped = data.mapped_data || {};
      
      // Count poles
      if (mapped.poleNumber) {
        stats.withPoles++;
        stats.poleCount[mapped.poleNumber] = (stats.poleCount[mapped.poleNumber] || 0) + 1;
      } else {
        stats.withoutPoles++;
      }
      
      // Count agents
      if (mapped.fieldAgentPolePermission) {
        stats.withAgents++;
        stats.agentCount[mapped.fieldAgentPolePermission] = (stats.agentCount[mapped.fieldAgentPolePermission] || 0) + 1;
      } else {
        stats.withoutAgents++;
      }
      
      // Count status
      const status = mapped.status || 'No Status';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Collect sample records
      if (index < 5) {
        sampleRecords.push({
          propertyId: mapped.propertyId,
          poleNumber: mapped.poleNumber || 'N/A',
          status: status,
          address: mapped.locationAddress,
          agent: mapped.fieldAgentPolePermission || 'N/A'
        });
      }
    });
    
    // Find duplicate poles
    Object.entries(stats.poleCount).forEach(([pole, count]) => {
      if (count > 1) {
        stats.duplicatePoles.push({ pole, count });
      }
    });
    stats.duplicatePoles.sort((a, b) => b.count - a.count);
    
    // Sort agents by count
    const topAgents = Object.entries(stats.agentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Generate report
    const now = new Date().toISOString();
    const report = `# JUNE 2ND 2025 - COMPLETE IMPORT REPORT

Generated: ${now}  
Import ID: ${importId}  
File: ${fileName}

## Executive Summary
- **Total Records Imported**: ${stats.total}
- **Quality Score**: ${Math.round((stats.withPoles / stats.total) * 100)}% (based on pole data completeness)
- **Status**: ✅ FULLY COMPLETED

## Data Analysis

### Record Completeness
- **Records with Pole Numbers**: ${stats.withPoles} (${((stats.withPoles / stats.total) * 100).toFixed(1)}%)
- **Records without Pole Numbers**: ${stats.withoutPoles} (${((stats.withoutPoles / stats.total) * 100).toFixed(1)}%)
- **Records with Field Agents**: ${stats.withAgents} (${((stats.withAgents / stats.total) * 100).toFixed(1)}%)
- **Records without Field Agents**: ${stats.withoutAgents} (${((stats.withoutAgents / stats.total) * 100).toFixed(1)}%)

### Status Distribution
${Object.entries(stats.byStatus)
  .sort((a, b) => b[1] - a[1])
  .map(([status, count]) => `- **${status}**: ${count} records`)
  .join('\n')}

### Duplicate Poles (${stats.duplicatePoles.length} found)
${stats.duplicatePoles.length > 0 ? 
  stats.duplicatePoles.slice(0, 10)
    .map(({ pole, count }) => `- **${pole}**: ${count} properties`)
    .join('\n') + 
  (stats.duplicatePoles.length > 10 ? `\n... and ${stats.duplicatePoles.length - 10} more duplicate poles` : '')
  : 'No duplicate poles found'}

### Top Field Agents
${topAgents.map(([agent, count]) => `- **${agent}**: ${count} permissions`).join('\n')}

### Sample Records
${sampleRecords.map((rec, idx) => `
${idx + 1}. **Property ${rec.propertyId}**
   - Pole: ${rec.poleNumber}
   - Status: ${rec.status}
   - Agent: ${rec.agent}
   - Address: ${rec.address}`).join('\n')}

## Key Findings

1. **Data Quality Concern**: ${((stats.withoutPoles / stats.total) * 100).toFixed(1)}% of records are missing pole numbers, which is critical for payment validation.

2. **Agent Assignment**: ${((stats.withoutAgents / stats.total) * 100).toFixed(1)}% of records have no field agent assigned, making payment processing impossible for these records.

3. **Duplicate Poles**: ${stats.duplicatePoles.length} poles are assigned to multiple properties, requiring investigation before payment processing.

4. **Status Coverage**: Most records (${stats.byStatus['Pole Permission: Approved'] || 0}) have "Pole Permission: Approved" status.

## Recommendations

1. **Immediate Action Required**:
   - Investigate the ${stats.withoutPoles} records without pole numbers
   - Assign field agents to ${stats.withoutAgents} records
   - Verify duplicate pole assignments with field teams

2. **Data Quality Improvements**:
   - Implement mandatory pole number validation in data entry
   - Require field agent assignment before approval
   - Add duplicate detection during data capture

3. **Next Steps**:
   - Continue importing remaining June files
   - Compare data quality trends across dates
   - Generate monthly summary report after all imports

---
*Report completed at ${new Date().toLocaleString()}*
`;
    
    // Save report
    const reportPath = path.join('OneMap/reports', `JUNE_02_COMPLETE_REPORT_${importId}.md`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    console.log(`✅ Report saved to: ${reportPath}`);
    console.log(`\nSummary: ${stats.total} records imported, ${stats.withPoles} with poles, ${stats.duplicatePoles.length} duplicate poles found`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
  
  process.exit(0);
}

// Run the report
generateFullReport('IMP_2025-07-22_1753171277792', 'Lawley June Week 1 02062025.csv');