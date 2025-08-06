#!/usr/bin/env node

/**
 * Create Pre-Sync Report
 * Shows detailed preview of what WILL be synced before running sync
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize both databases
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/vf-onemap-data-key.json')
  ),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

async function createPreSyncReport(batchSize = 100) {
  console.log('📊 CREATING PRE-SYNC REPORT\n');
  console.log('═'.repeat(80));
  console.log(`Analyzing next ${batchSize} records for sync...\n`);
  
  try {
    // Get already synced poles
    const syncedSnapshot = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .get();
    
    const syncedPoleNumbers = new Set();
    syncedSnapshot.forEach(doc => {
      syncedPoleNumbers.add(doc.id);
    });
    
    console.log(`✅ Currently synced: ${syncedPoleNumbers.size} poles\n`);
    
    // Get staging records
    const stagingSnapshot = await stagingDb
      .collection('vf-onemap-processed-records')
      .limit(batchSize * 2) // Get extra to account for already synced
      .get();
    
    // Analyze what will be synced
    const toSync = {
      poles: new Map(), // Group by pole number
      summary: {
        totalRecordsAnalyzed: stagingSnapshot.size,
        alreadySynced: 0,
        willBeSkipped: 0,
        willBeSynced: 0,
        noPoleNumber: 0,
        uniquePoles: 0,
        multipleStatuses: 0
      },
      byStatus: {},
      byProject: {},
      byAgent: {},
      conflicts: [],
      details: []
    };
    
    // Process staging records
    stagingSnapshot.forEach(doc => {
      const data = doc.data();
      const poleNumber = data.poleNumber;
      
      // Skip if no pole number
      if (!poleNumber || poleNumber === '') {
        toSync.summary.noPoleNumber++;
        toSync.summary.willBeSkipped++;
        return;
      }
      
      // Skip if already synced
      if (syncedPoleNumbers.has(poleNumber)) {
        toSync.summary.alreadySynced++;
        toSync.summary.willBeSkipped++;
        return;
      }
      
      // This will be synced - group by pole
      if (!toSync.poles.has(poleNumber)) {
        toSync.poles.set(poleNumber, []);
      }
      toSync.poles.get(poleNumber).push({
        docId: doc.id,
        ...data
      });
      
      // Count by status
      const status = data.status || 'Unknown';
      toSync.byStatus[status] = (toSync.byStatus[status] || 0) + 1;
      
      // Count by project
      const project = data.site || 'Unknown';
      toSync.byProject[project] = (toSync.byProject[project] || 0) + 1;
      
      // Count by agent
      const agent = data.fieldAgentName || 'Unknown';
      toSync.byAgent[agent] = (toSync.byAgent[agent] || 0) + 1;
    });
    
    // Calculate summary
    toSync.summary.uniquePoles = toSync.poles.size;
    toSync.summary.willBeSynced = Array.from(toSync.poles.values()).reduce((sum, records) => sum + records.length, 0);
    
    // Build detailed preview
    let recordCount = 0;
    for (const [poleNumber, records] of toSync.poles) {
      if (recordCount >= batchSize) break; // Limit to requested batch size
      
      // Check for multiple statuses
      const uniqueStatuses = [...new Set(records.map(r => r.status))];
      if (uniqueStatuses.length > 1) {
        toSync.summary.multipleStatuses++;
        toSync.conflicts.push({
          poleNumber,
          statuses: uniqueStatuses,
          recordCount: records.length
        });
      }
      
      // Get latest record (will be current status)
      const latestRecord = records.sort((a, b) => {
        const dateA = a.lastModifiedDate || a.dateStatusChanged || '0';
        const dateB = b.lastModifiedDate || b.dateStatusChanged || '0';
        return dateB.localeCompare(dateA);
      })[0];
      
      toSync.details.push({
        poleNumber,
        willBeSyncedAs: {
          status: latestRecord.status,
          project: latestRecord.site,
          agent: latestRecord.fieldAgentName,
          propertyId: latestRecord.propertyId,
          location: latestRecord.locationAddress,
          gps: {
            lat: latestRecord.latitude,
            lon: latestRecord.longitude
          }
        },
        recordCount: records.length,
        allStatuses: uniqueStatuses,
        historyWillBeCreated: records.length
      });
      
      recordCount++;
    }
    
    // Create report
    const report = {
      reportType: 'PRE-SYNC REPORT',
      generated: new Date().toISOString(),
      syncConfiguration: {
        batchSize: batchSize,
        source: 'vf-onemap-data',
        destination: 'fibreflow-73daf',
        mode: 'manual'
      },
      currentStatus: {
        alreadyInProduction: syncedPoleNumbers.size,
        totalInStaging: stagingSnapshot.size
      },
      whatWillBeSynced: {
        summary: toSync.summary,
        byStatus: toSync.byStatus,
        byProject: toSync.byProject,
        topAgents: Object.entries(toSync.byAgent)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([agent, count]) => ({ agent, count })),
        polesWithMultipleStatuses: toSync.conflicts
      },
      samplePoles: toSync.details.slice(0, 20), // First 20 as sample
      recommendations: {
        proceedWithSync: toSync.summary.willBeSynced > 0,
        reviewConflicts: toSync.conflicts.length > 0,
        estimatedDuration: Math.ceil(toSync.summary.uniquePoles / 10) + ' seconds'
      }
    };
    
    // Save detailed report
    const timestamp = Date.now();
    const reportPath = path.join(__dirname, '../reports', `pre-sync-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Create summary text report
    const textReport = `
PRE-SYNC REPORT
Generated: ${new Date().toLocaleString()}
════════════════════════════════════════════════════════════════════════════════

CURRENT STATUS:
- Poles already in production: ${syncedPoleNumbers.size}
- Records analyzed from staging: ${toSync.summary.totalRecordsAnalyzed}

WHAT WILL BE SYNCED:
- Unique poles to sync: ${toSync.summary.uniquePoles}
- Total records to process: ${toSync.summary.willBeSynced}
- Status history entries to create: ${toSync.summary.willBeSynced}

WHAT WILL BE SKIPPED:
- Already synced: ${toSync.summary.alreadySynced}
- No pole number: ${toSync.summary.noPoleNumber}
- Total skipped: ${toSync.summary.willBeSkipped}

STATUS DISTRIBUTION:
${Object.entries(toSync.byStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

PROJECT DISTRIBUTION:
${Object.entries(toSync.byProject).map(([project, count]) => `- ${project}: ${count}`).join('\n')}

TOP 10 AGENTS:
${Object.entries(toSync.byAgent)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([agent, count], index) => `${index + 1}. ${agent}: ${count} records`)
  .join('\n')}

POLES WITH MULTIPLE STATUSES: ${toSync.conflicts.length}
${toSync.conflicts.slice(0, 5).map(conflict => 
  `- ${conflict.poleNumber}: ${conflict.recordCount} records (${conflict.statuses.join(' → ')})`
).join('\n')}

SAMPLE POLES TO BE SYNCED:
${toSync.details.slice(0, 10).map(pole => 
  `- ${pole.poleNumber}: ${pole.willBeSyncedAs.status} (${pole.recordCount} history entries)`
).join('\n')}

RECOMMENDATIONS:
- Proceed with sync: ${report.recommendations.proceedWithSync ? 'YES ✅' : 'NO ❌'}
- Review conflicts first: ${report.recommendations.reviewConflicts ? 'YES ⚠️' : 'NO ✅'}
- Estimated sync duration: ${report.recommendations.estimatedDuration}

Full report saved to: ${reportPath}
════════════════════════════════════════════════════════════════════════════════
`;
    
    const textReportPath = path.join(__dirname, '../reports', `pre-sync-report-${timestamp}.txt`);
    fs.writeFileSync(textReportPath, textReport);
    
    // Display summary
    console.log(textReport);
    
    return report;
    
  } catch (error) {
    console.error('❌ Error creating pre-sync report:', error);
  }
}

// Get batch size from command line or use default
const batchSize = parseInt(process.argv[2]) || 100;

// Run report
createPreSyncReport(batchSize).then(() => {
  console.log('✨ Pre-sync report completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});