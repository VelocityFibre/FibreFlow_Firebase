#!/usr/bin/env node

/**
 * Generate May 23, 2025 Daily Summary Report
 * ==========================================
 */

const { VF_DATABASE } = require('./demo-production-import');
const { processMay23Data } = require('./process-may23-with-duplicates');

async function generateMay23Report() {
  // First ensure May 23 data is processed
  console.log('Processing data to generate report...\n');
  await processMay23Data();
  
  // Generate the report
  console.log('\n\n📋 MAY 23, 2025 DAILY IMPORT REPORT');
  console.log('=====================================');
  console.log('Report ID: report_LAWLEY_MAY23_2025_IMPORT');
  console.log('Generated: ' + new Date().toISOString());
  console.log('');
  
  // Get the report from the database
  const report = VF_DATABASE['vf-onemap-import-reports'].get('report_LAWLEY_MAY23_2025_IMPORT');
  const batch = VF_DATABASE['vf-onemap-import-batches'].get('LAWLEY_MAY23_2025_IMPORT');
  
  if (report && batch) {
    console.log('📊 IMPORT SUMMARY');
    console.log('----------------');
    console.log('Source File: ' + report.sourceFile);
    console.log('Import Date: ' + report.importDate);
    console.log('Project: ' + report.projectName);
    console.log('Batch ID: ' + report.batchId);
    console.log('');
    
    console.log('📈 PROCESSING RESULTS');
    console.log('--------------------');
    console.log('Total Records Processed: ' + report.summary.totalRecords);
    console.log('');
    console.log('✅ New Records Added: ' + report.summary.newRecords);
    console.log('🔄 Records with Changes: ' + report.summary.changedRecords);
    console.log('⏸️  Unchanged Duplicates: ' + report.summary.unchangedRecords);
    console.log('🔍 Total Duplicates Found: ' + report.summary.duplicatesDetected);
    console.log('❌ Error Records: ' + report.summary.errorRecords);
    console.log('');
    
    // Calculate percentages
    const newPercent = ((report.summary.newRecords / report.summary.totalRecords) * 100).toFixed(1);
    const dupPercent = ((report.summary.duplicatesDetected / report.summary.totalRecords) * 100).toFixed(1);
    const changePercent = ((report.summary.changedRecords / Math.max(1, report.summary.duplicatesDetected)) * 100).toFixed(1);
    
    console.log('📊 ANALYSIS');
    console.log('-----------');
    console.log('New Record Rate: ' + newPercent + '%');
    console.log('Duplicate Rate: ' + dupPercent + '%');
    console.log('Change Rate (of duplicates): ' + changePercent + '%');
    console.log('');
    
    // Get change details
    const changeHistory = Array.from(VF_DATABASE['vf-onemap-change-history'].values())
      .filter(ch => ch.batchId === 'LAWLEY_MAY23_2025_IMPORT');
    
    if (changeHistory.length > 0) {
      console.log('🔄 CHANGES DETECTED');
      console.log('------------------');
      changeHistory.forEach((change, idx) => {
        console.log((idx + 1) + '. Property ID: ' + change.propertyId);
        console.log('   Change Type: ' + change.changeType);
        console.log('   Fields Changed:');
        change.fieldChanges.forEach(fc => {
          console.log('   - ' + fc);
        });
        console.log('');
      });
    }
    
    console.log('💾 DATABASE STATUS AFTER IMPORT');
    console.log('------------------------------');
    console.log('Total Records in Database: ' + VF_DATABASE['vf-onemap-processed-records'].size);
    console.log('Total Import Batches: ' + VF_DATABASE['vf-onemap-import-batches'].size);
    console.log('Total Reports Generated: ' + VF_DATABASE['vf-onemap-import-reports'].size);
    console.log('Total Changes Tracked: ' + VF_DATABASE['vf-onemap-change-history'].size);
    console.log('');
    
    // Cumulative statistics
    console.log('📊 CUMULATIVE STATISTICS (2 DAYS)');
    console.log('---------------------------------');
    const may22Report = VF_DATABASE['vf-onemap-import-reports'].get('report_LAWLEY_MAY22_2025_BASELINE');
    if (may22Report) {
      const totalProcessed = may22Report.summary.totalRecords + report.summary.totalRecords;
      const totalNew = may22Report.summary.totalRecords + report.summary.newRecords;
      console.log('Total Records Processed: ' + totalProcessed);
      console.log('Total Unique Records: ' + VF_DATABASE['vf-onemap-processed-records'].size);
      console.log('Total New Records Added: ' + totalNew);
      console.log('Average Daily Records: ' + (totalProcessed / 2).toFixed(0));
    }
    console.log('');
    
    console.log('📝 RECOMMENDATIONS');
    console.log('-----------------');
    if (report.summary.newRecords > 0) {
      console.log('• ' + report.summary.newRecords + ' new properties added to tracking system');
    }
    if (report.summary.changedRecords > 0) {
      console.log('• Review ' + report.summary.changedRecords + ' changed records for data quality');
    }
    if (report.summary.errorRecords > 0) {
      console.log('• Investigate ' + report.summary.errorRecords + ' error records');
    }
    console.log('• Continue daily imports to maintain data currency');
    console.log('• Generate weekly summary report after 7 days of imports');
    console.log('');
    
    console.log('✅ REPORT COMPLETE');
    console.log('==================');
    console.log('Report Location: vf-onemap-import-reports/' + report.id);
    console.log('Batch Details: vf-onemap-import-batches/' + batch.id);
    
    // Save formatted report to file
    const reportContent = {
      reportId: report.id,
      generatedDate: new Date().toISOString(),
      summary: report.summary,
      analysis: {
        newRecordRate: newPercent + '%',
        duplicateRate: dupPercent + '%',
        changeRate: changePercent + '%'
      },
      changes: changeHistory,
      databaseStatus: {
        totalRecords: VF_DATABASE['vf-onemap-processed-records'].size,
        totalBatches: VF_DATABASE['vf-onemap-import-batches'].size,
        totalReports: VF_DATABASE['vf-onemap-import-reports'].size,
        totalChanges: VF_DATABASE['vf-onemap-change-history'].size
      }
    };
    
    // Return the report for further use
    return reportContent;
    
  } else {
    console.log('❌ Report not found');
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  generateMay23Report().catch(console.error);
}

module.exports = { generateMay23Report };