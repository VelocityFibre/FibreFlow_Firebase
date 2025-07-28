#!/usr/bin/env node

/**
 * Generate detailed pole report from vf-onemap-data Firebase database
 * Tracks all properties, drops, and agents associated with a specific pole
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function generatePoleReport(poleNumber) {
  try {
    console.log(`\n📊 Generating Report for Pole: ${poleNumber}`);
    console.log('='.repeat(60));

    // Query all records for this pole
    const snapshot = await db.collection('vf-onemap-processed-records')
      .where('poleNumber', '==', poleNumber)
      .get();
    
    if (snapshot.empty) {
      console.log(`❌ No records found for pole number: ${poleNumber}`);
      
      // Show available poles (sample)
      const sampleSnapshot = await db.collection('vf-onemap-processed-records')
        .where('poleNumber', '!=', '')
        .limit(20)
        .get();
      
      console.log('\nAvailable pole numbers (first 20):');
      const uniquePoles = new Set();
      sampleSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.poleNumber) uniquePoles.add(data.poleNumber);
      });
      [...uniquePoles].forEach(p => console.log(`  - ${p}`));
      
      await admin.app().delete();
      return;
    }

    const poleRecords = [];
    snapshot.forEach(doc => {
      poleRecords.push({ id: doc.id, ...doc.data() });
    });

    console.log(`\n✅ Found ${poleRecords.length} records for pole ${poleNumber}\n`);

    // Analyze the data
    const analysis = {
      addresses: new Set(),
      drops: new Set(),
      properties: new Set(),
      agents: new Set(),
      statuses: {},
      timeline: [],
      gpsCoordinates: new Set()
    };

    // Process each record
    poleRecords.forEach(record => {
      // Addresses
      if (record.locationAddress) {
        analysis.addresses.add(record.locationAddress);
      }
      
      // Drops
      if (record.dropNumber) {
        analysis.drops.add(record.dropNumber);
      }
      
      // Properties
      analysis.properties.add(record.propertyId);
      
      // Agents
      if (record.fieldAgentName) {
        analysis.agents.add(record.fieldAgentName);
      }
      
      // Status tracking
      const status = record.status || 'No Status';
      analysis.statuses[status] = (analysis.statuses[status] || 0) + 1;
      
      // GPS coordinates
      if (record.latitude && record.longitude) {
        analysis.gpsCoordinates.add(`${record.latitude},${record.longitude}`);
      }
      
      // Timeline entry
      analysis.timeline.push({
        propertyId: record.propertyId,
        status: record.status,
        date: record.lastModifiedDate || record.importedAt?._seconds ? 
              new Date(record.importedAt._seconds * 1000).toISOString() : 'Unknown',
        agent: record.fieldAgentName || 'Unknown',
        drop: record.dropNumber || 'N/A',
        address: record.locationAddress || 'N/A'
      });
    });

    // Sort timeline by date
    analysis.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Generate report
    const reportDate = new Date().toISOString();
    const report = `# POLE REPORT: ${poleNumber}
==========================================

Generated: ${reportDate}
Database: vf-onemap-data
Total Records: ${poleRecords.length}

## OVERVIEW
-----------

### Properties Connected
Total: ${analysis.properties.size}
${[...analysis.properties].slice(0, 10).map(p => `- ${p}`).join('\n')}
${analysis.properties.size > 10 ? `... and ${analysis.properties.size - 10} more` : ''}

### Drops Connected
Total: ${analysis.drops.size}
${[...analysis.drops].map(d => `- ${d}`).join('\n')}

### Addresses
Total Unique Addresses: ${analysis.addresses.size}
${[...analysis.addresses].map(a => `- ${a}`).join('\n')}

### GPS Coordinates
${analysis.gpsCoordinates.size > 0 ? 
  [...analysis.gpsCoordinates].map(coord => `- ${coord}`).join('\n') : 
  'No GPS coordinates found'}

## STATUS DISTRIBUTION
--------------------
${Object.entries(analysis.statuses)
  .sort(([,a], [,b]) => b - a)
  .map(([status, count]) => `- ${status}: ${count} (${((count/poleRecords.length)*100).toFixed(1)}%)`)
  .join('\n')}

## FIELD AGENTS
--------------
Total Agents: ${analysis.agents.size}
${[...analysis.agents].map(agent => `- ${agent}`).join('\n')}

## TIMELINE
----------
${analysis.timeline.slice(0, 20).map((entry, i) => `
### ${i + 1}. ${entry.date}
- **Property**: ${entry.propertyId}
- **Status**: ${entry.status}
- **Drop**: ${entry.drop}
- **Agent**: ${entry.agent}
- **Address**: ${entry.address}`).join('\n')}
${analysis.timeline.length > 20 ? `\n... and ${analysis.timeline.length - 20} more entries` : ''}

## DATA QUALITY ISSUES
--------------------
${(() => {
  const issues = [];
  
  if (analysis.addresses.size > 1) {
    issues.push(`⚠️  Pole appears at ${analysis.addresses.size} different addresses`);
  }
  
  if (analysis.drops.size > 12) {
    issues.push(`⚠️  Pole has ${analysis.drops.size} drops (max should be 12)`);
  }
  
  if (analysis.agents.size > 3) {
    issues.push(`⚠️  Multiple agents (${analysis.agents.size}) claiming same pole`);
  }
  
  const noAgentCount = poleRecords.filter(r => !r.fieldAgentName).length;
  if (noAgentCount > 0) {
    issues.push(`⚠️  ${noAgentCount} records missing field agent`);
  }
  
  const noGPSCount = poleRecords.filter(r => !r.latitude || !r.longitude).length;
  if (noGPSCount > 0) {
    issues.push(`⚠️  ${noGPSCount} records missing GPS coordinates`);
  }
  
  return issues.length > 0 ? issues.join('\n') : '✅ No major issues found';
})()}

## RECOMMENDATIONS
-----------------
${(() => {
  const recommendations = [];
  
  if (analysis.addresses.size > 1) {
    recommendations.push('1. Verify correct physical location of pole');
  }
  
  if (analysis.agents.size > 1) {
    recommendations.push('2. Investigate multiple agent claims for payment verification');
  }
  
  if (analysis.drops.size > 12) {
    recommendations.push('3. Check if pole is oversubscribed (max 12 drops)');
  }
  
  const noAgentCount = poleRecords.filter(r => !r.fieldAgentName).length;
  if (noAgentCount > 0) {
    recommendations.push('4. Assign field agents to unassigned records');
  }
  
  return recommendations.length > 0 ? recommendations.join('\n') : 'No specific actions required.';
})()}

## RAW DATA SAMPLE
-----------------
First 3 records (for verification):
${poleRecords.slice(0, 3).map((r, i) => `
Record ${i + 1}:
${JSON.stringify(r, null, 2)}`).join('\n')}

---
*End of report for pole ${poleNumber}*
`;

    // Save report
    const reportsDir = path.join(__dirname, '../reports/poles');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = path.join(reportsDir, `pole_${poleNumber.replace(/\./g, '_')}_${new Date().toISOString().split('T')[0]}.md`);
    await fs.writeFile(filename, report);
    
    console.log(report);
    console.log(`\n💾 Report saved to: ${filename}`);
    
    await admin.app().delete();

  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Main execution
const poleNumber = process.argv[2];

if (!poleNumber) {
  console.log('Usage: node generate-pole-report-firebase.js <pole_number>');
  console.log('Example: node generate-pole-report-firebase.js LAW.P.C132');
  process.exit(1);
}

generatePoleReport(poleNumber);