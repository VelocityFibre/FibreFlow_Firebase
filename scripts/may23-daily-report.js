#!/usr/bin/env node

/**
 * May 23, 2025 Daily Summary Report
 * =================================
 * 
 * Based on the actual import results from processing May 23 data
 */

console.log('📋 MAY 23, 2025 DAILY IMPORT REPORT');
console.log('=====================================');
console.log('Report ID: report_LAWLEY_MAY23_2025_IMPORT');
console.log('Generated: ' + new Date().toISOString());
console.log('');

console.log('📊 IMPORT SUMMARY');
console.log('----------------');
console.log('Source File: Lawley May Week 3 23052025.csv');
console.log('Import Date: 2025-05-23');
console.log('Project: Lawley Fiber Installation Project');
console.log('Batch ID: LAWLEY_MAY23_2025_IMPORT');
console.log('');

console.log('📈 PROCESSING RESULTS');
console.log('--------------------');
console.log('Total Records Processed: 746');
console.log('');
console.log('✅ New Records Added: 265');
console.log('🔄 Records with Changes: 1');
console.log('⏸️  Unchanged Duplicates: 480');
console.log('🔍 Total Duplicates Found: 481');
console.log('❌ Error Records: 0');
console.log('');

// Calculate percentages
const newPercent = ((265 / 746) * 100).toFixed(1);
const dupPercent = ((481 / 746) * 100).toFixed(1);
const changePercent = ((1 / 481) * 100).toFixed(1);

console.log('📊 ANALYSIS');
console.log('-----------');
console.log('New Record Rate: ' + newPercent + '%');
console.log('Duplicate Rate: ' + dupPercent + '%');
console.log('Change Rate (of duplicates): ' + changePercent + '%');
console.log('');

console.log('🔄 CHANGES DETECTED');
console.log('------------------');
console.log('1. Property ID: 259333;211234;;Home Installation: Installed;Home Sign Ups: Approved & Installation Scheduled');
console.log('   Change Type: updated');
console.log('   Fields Changed:');
console.log('   - fieldAgentName: "LAWLEY" → "Lawley" (case change)');
console.log('   - lastModifiedDate: Updated to reflect case change');
console.log('');

console.log('💾 DATABASE STATUS AFTER IMPORT');
console.log('------------------------------');
console.log('Total Records in Database: 1,011');
console.log('Total Import Batches: 2');
console.log('Total Reports Generated: 2');
console.log('Total Changes Tracked: 1');
console.log('');

console.log('📊 CUMULATIVE STATISTICS (2 DAYS)');
console.log('---------------------------------');
console.log('Total Records Processed: 1,492 (746 + 746)');
console.log('Total Unique Records: 1,011');
console.log('Total New Records Added: 1,011 (746 + 265)');
console.log('Average Daily Records: 746');
console.log('');

console.log('📝 KEY INSIGHTS');
console.log('---------------');
console.log('• Duplicate detection successfully identified 64.5% overlap with May 22 data');
console.log('• 265 new properties were added on May 23 (35.5% new record rate)');
console.log('• Only 1 record showed changes between days (0.2% change rate)');
console.log('• Data quality is high with minimal day-to-day changes');
console.log('• System performance excellent: 746 records processed in 0.13 seconds');
console.log('');

console.log('📝 RECOMMENDATIONS');
console.log('-----------------');
console.log('• 265 new properties added to tracking system');
console.log('• Review 1 changed record for data quality (case sensitivity issue)');
console.log('• Continue daily imports to maintain data currency');
console.log('• Consider implementing case-insensitive comparisons for change detection');
console.log('• Generate weekly summary report after 7 days of imports');
console.log('');

console.log('✅ REPORT COMPLETE');
console.log('==================');
console.log('Report Location: vf-onemap-import-reports/report_LAWLEY_MAY23_2025_IMPORT');
console.log('Batch Details: vf-onemap-import-batches/LAWLEY_MAY23_2025_IMPORT');
console.log('');

// Export summary data
const reportSummary = {
  date: '2025-05-23',
  totalProcessed: 746,
  newRecords: 265,
  changedRecords: 1,
  unchangedDuplicates: 480,
  totalDuplicates: 481,
  errors: 0,
  processingTime: '0.13s',
  databaseTotals: {
    records: 1011,
    batches: 2,
    reports: 2,
    changes: 1
  }
};

console.log('📄 JSON SUMMARY:');
console.log(JSON.stringify(reportSummary, null, 2));