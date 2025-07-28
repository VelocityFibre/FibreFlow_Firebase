#!/usr/bin/env node

/**
 * Generate Detailed Sync Report
 * Creates comprehensive reports showing exactly what was synced
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const productionDb = productionApp.firestore();

async function generateDetailedReport() {
  console.log('📊 Generating Detailed Sync Report\n');
  
  try {
    // Get all poles synced today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const syncedPoles = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .get();
    
    console.log(`Found ${syncedPoles.size} poles synced from staging\n`);
    
    // Build detailed report
    const report = {
      reportGenerated: new Date().toISOString(),
      syncSource: 'vf-onemap-data',
      syncDestination: 'fibreflow-73daf',
      summary: {
        totalPolesSynced: syncedPoles.size,
        lastSyncDate: null,
        oldestSyncDate: null,
        polesWithStatusHistory: 0,
        totalStatusHistoryEntries: 0
      },
      syncedPoles: [],
      statusHistorySummary: {}
    };
    
    // Process each pole
    const syncDates = [];
    
    for (const doc of syncedPoles.docs) {
      const data = doc.data();
      const syncDate = data.lastSyncDate?.toDate();
      if (syncDate) syncDates.push(syncDate);
      
      // Get status history count
      const history = await productionDb
        .collection('planned-poles')
        .doc(doc.id)
        .collection('statusHistory')
        .get();
      
      if (history.size > 0) {
        report.summary.polesWithStatusHistory++;
        report.summary.totalStatusHistoryEntries += history.size;
      }
      
      // Build pole details
      const poleDetail = {
        poleNumber: data.poleNumber,
        syncDate: syncDate?.toISOString(),
        currentStatus: data.importStatus,
        projectName: data.projectName,
        address: data.address,
        location: data.location,
        statusHistoryCount: history.size,
        fieldAgent: data.fieldAgent,
        propertyId: data.propertyId,
        dropNumber: data.dropNumber
      };
      
      report.syncedPoles.push(poleDetail);
      
      // Track status types
      if (!report.statusHistorySummary[data.importStatus]) {
        report.statusHistorySummary[data.importStatus] = 0;
      }
      report.statusHistorySummary[data.importStatus]++;
    }
    
    // Calculate date range
    if (syncDates.length > 0) {
      syncDates.sort((a, b) => a - b);
      report.summary.oldestSyncDate = syncDates[0].toISOString();
      report.summary.lastSyncDate = syncDates[syncDates.length - 1].toISOString();
    }
    
    // Sort poles by sync date (newest first)
    report.syncedPoles.sort((a, b) => {
      return (b.syncDate || '').localeCompare(a.syncDate || '');
    });
    
    // Save detailed report
    const timestamp = Date.now();
    const reportPath = path.join(__dirname, '../reports', `detailed-sync-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also create a summary CSV
    const csvPath = path.join(__dirname, '../reports', `sync-summary-${timestamp}.csv`);
    const csvHeader = 'Pole Number,Current Status,Project,Sync Date,History Count,Field Agent,Property ID\n';
    const csvRows = report.syncedPoles.map(pole => 
      `${pole.poleNumber},${pole.currentStatus},${pole.projectName},${pole.syncDate},${pole.statusHistoryCount},${pole.fieldAgent || ''},${pole.propertyId}`
    ).join('\n');
    
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    
    // Display summary
    console.log('📊 SYNC REPORT SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total Poles Synced: ${report.summary.totalPolesSynced}`);
    console.log(`Sync Date Range: ${report.summary.oldestSyncDate?.split('T')[0]} to ${report.summary.lastSyncDate?.split('T')[0]}`);
    console.log(`Poles with History: ${report.summary.polesWithStatusHistory}`);
    console.log(`Total History Entries: ${report.summary.totalStatusHistoryEntries}`);
    console.log('\nStatus Distribution:');
    Object.entries(report.statusHistorySummary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('\nReports saved:');
    console.log(`  JSON: ${reportPath}`);
    console.log(`  CSV: ${csvPath}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

// Run report generation
generateDetailedReport().then(() => {
  console.log('\n✨ Report generation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});