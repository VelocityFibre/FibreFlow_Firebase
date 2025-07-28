#!/usr/bin/env node

/**
 * Enhanced Report Generator with Status History Analysis
 * Shows status changes and progression timelines
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function generateEnhancedReport() {
  try {
    console.log('📊 Generating enhanced report with status history...\n');
    
    const snapshot = await db.collection('vf-onemap-processed-records').get();
    const importBatches = await db.collection('vf-onemap-import-batches')
      .orderBy('importedAt', 'desc')
      .limit(10)
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Analyze status changes
    let totalStatusChanges = 0;
    let propertiesWithHistory = 0;
    const statusProgressions = new Map();
    const agentStatusChanges = new Map();
    const statusChangesByDate = new Map();
    
    records.forEach(record => {
      if (record.statusHistory && record.statusHistory.length > 0) {
        propertiesWithHistory++;
        totalStatusChanges += record.statusHistory.length;
        
        // Track status progressions
        if (record.statusHistory.length > 1) {
          for (let i = 1; i < record.statusHistory.length; i++) {
            const prev = record.statusHistory[i-1];
            const curr = record.statusHistory[i];
            const progression = `${prev.status || 'No Status'} → ${curr.status || 'No Status'}`;
            
            if (!statusProgressions.has(progression)) {
              statusProgressions.set(progression, 0);
            }
            statusProgressions.set(progression, statusProgressions.get(progression) + 1);
            
            // Track by date
            const changeDate = curr.date || 'Unknown';
            if (!statusChangesByDate.has(changeDate)) {
              statusChangesByDate.set(changeDate, 0);
            }
            statusChangesByDate.set(changeDate, statusChangesByDate.get(changeDate) + 1);
            
            // Track by agent
            const agent = curr.agent || 'No Agent';
            if (!agentStatusChanges.has(agent)) {
              agentStatusChanges.set(agent, 0);
            }
            agentStatusChanges.set(agent, agentStatusChanges.get(agent) + 1);
          }
        }
      }
    });
    
    // Build report
    const reportLines = [];
    const timestamp = new Date().toISOString();
    
    reportLines.push('# VF-ONEMAP ENHANCED REPORT WITH STATUS HISTORY');
    reportLines.push('='.repeat(50));
    reportLines.push('');
    reportLines.push(`Generated: ${timestamp}`);
    reportLines.push(`Database: vf-onemap-data`);
    reportLines.push(`Collection: vf-onemap-processed-records`);
    reportLines.push('');
    
    // Summary
    reportLines.push('## SUMMARY');
    reportLines.push('-'.repeat(20));
    reportLines.push(`**Total Records**: ${records.length}`);
    reportLines.push(`**Properties with History**: ${propertiesWithHistory}`);
    reportLines.push(`**Total Status Changes**: ${totalStatusChanges}`);
    reportLines.push(`**Import Batches**: ${importBatches.size}`);
    reportLines.push('');
    
    // Import History
    reportLines.push('## IMPORT HISTORY');
    reportLines.push('');
    importBatches.forEach(doc => {
      const batch = doc.data();
      reportLines.push(`### ${batch.batchId}`);
      reportLines.push(`- **File**: ${batch.fileName}`);
      reportLines.push(`- **Date**: ${batch.csvDate || 'N/A'}`);
      reportLines.push(`- **Total Records**: ${batch.totalRecords}`);
      reportLines.push(`- **New Records**: ${batch.newRecords || 'N/A'}`);
      reportLines.push(`- **Status Changes**: ${batch.statusChanges || 'N/A'}`);
      reportLines.push(`- **Imported**: ${batch.importedAt?.toDate()?.toISOString() || 'N/A'}`);
      reportLines.push('');
    });
    
    // Status Change Analysis
    reportLines.push('## STATUS CHANGE ANALYSIS');
    reportLines.push('');
    
    reportLines.push('### Status Progressions (Top 10)');
    const sortedProgressions = Array.from(statusProgressions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedProgressions.forEach(([progression, count]) => {
      reportLines.push(`- ${progression}: **${count}** properties`);
    });
    reportLines.push('');
    
    reportLines.push('### Status Changes by Date');
    const sortedDates = Array.from(statusChangesByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedDates.forEach(([date, count]) => {
      reportLines.push(`- ${date}: **${count}** changes`);
    });
    reportLines.push('');
    
    reportLines.push('### Agent Performance (Status Changes)');
    const sortedAgents = Array.from(agentStatusChanges.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedAgents.forEach(([agent, count]) => {
      reportLines.push(`- ${agent}: **${count}** status changes`);
    });
    reportLines.push('');
    
    // Sample Properties with Rich History
    reportLines.push('## SAMPLE PROPERTIES WITH STATUS HISTORY');
    reportLines.push('');
    
    const propertiesWithRichHistory = records
      .filter(r => r.statusHistory && r.statusHistory.length > 1)
      .sort((a, b) => b.statusHistory.length - a.statusHistory.length)
      .slice(0, 5);
    
    propertiesWithRichHistory.forEach(property => {
      reportLines.push(`### Property ${property.propertyId}`);
      reportLines.push(`**Current Status**: ${property.currentStatus || 'No Status'}`);
      reportLines.push(`**Pole**: ${property.poleNumber || 'No Pole'}`);
      reportLines.push(`**Location**: ${property.locationAddress || 'Unknown'}`);
      reportLines.push('');
      reportLines.push('**Status History**:');
      
      property.statusHistory.forEach(entry => {
        reportLines.push(`- ${entry.date || 'Unknown date'}: **${entry.status || 'No Status'}** (Agent: ${entry.agent || 'N/A'})`);
      });
      reportLines.push('');
    });
    
    // Current Status Distribution
    reportLines.push('## CURRENT STATUS DISTRIBUTION');
    reportLines.push('');
    
    const statusCounts = new Map();
    records.forEach(record => {
      const status = record.currentStatus || record['Status Update'] || 'No Status';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });
    
    const sortedStatuses = Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedStatuses.forEach(([status, count]) => {
      const percentage = ((count / records.length) * 100).toFixed(1);
      reportLines.push(`- ${status}: ${count} (${percentage}%)`);
    });
    reportLines.push('');
    
    // Data Quality with History
    reportLines.push('## DATA QUALITY ANALYSIS');
    reportLines.push('');
    
    const missingHistory = records.filter(r => !r.statusHistory || r.statusHistory.length === 0).length;
    const singleStatus = records.filter(r => r.statusHistory && r.statusHistory.length === 1).length;
    const multipleStatuses = records.filter(r => r.statusHistory && r.statusHistory.length > 1).length;
    
    reportLines.push('### Status History Coverage');
    reportLines.push(`- Properties with no history: ${missingHistory} (${((missingHistory/records.length)*100).toFixed(1)}%)`);
    reportLines.push(`- Properties with single status: ${singleStatus} (${((singleStatus/records.length)*100).toFixed(1)}%)`);
    reportLines.push(`- Properties with multiple statuses: ${multipleStatuses} (${((multipleStatuses/records.length)*100).toFixed(1)}%)`);
    reportLines.push('');
    
    // Recommendations
    reportLines.push('## RECOMMENDATIONS');
    reportLines.push('');
    reportLines.push('1. **Re-import historical data** with the new history-tracking script');
    reportLines.push('2. **Monitor status progressions** to identify bottlenecks');
    reportLines.push('3. **Track agent performance** based on status advancement');
    reportLines.push('4. **Analyze timeline** between status changes for process improvement');
    reportLines.push('');
    
    // Save report
    const reportPath = path.join(__dirname, '../reports', `enhanced_report_${Date.now()}.md`);
    fs.writeFileSync(reportPath, reportLines.join('\n'));
    
    console.log(`✅ Enhanced report generated: ${reportPath}`);
    
    // Quick summary to console
    console.log('\nQuick Summary:');
    console.log(`- Total records: ${records.length}`);
    console.log(`- Properties with history: ${propertiesWithHistory}`);
    console.log(`- Total status changes tracked: ${totalStatusChanges}`);
    console.log(`- Properties with multiple statuses: ${multipleStatuses}`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateEnhancedReport();