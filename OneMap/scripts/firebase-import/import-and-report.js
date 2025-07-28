#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the CSV file from command line
const csvFile = process.argv[2];
if (!csvFile) {
  console.error('❌ Please provide a CSV file path');
  process.exit(1);
}

console.log(`\n🚀 Processing: ${csvFile}`);
console.log('=' * 60);

try {
  // Step 1: Import with history tracking
  console.log('\n📥 Step 1: Importing CSV with history tracking...');
  execSync(`node ${path.join(__dirname, 'bulk-import-history-fast.js')} "${csvFile}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  // Step 2: Generate report
  console.log('\n📊 Step 2: Generating enhanced report...');
  const reportOutput = execSync(`node ${path.join(__dirname, 'generate-report-with-history.js')}`, { 
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });
  
  console.log(reportOutput);
  
  // Extract report filename from output
  const reportMatch = reportOutput.match(/enhanced_report_\d+\.md/);
  if (reportMatch) {
    const reportFile = reportMatch[0];
    console.log(`\n✅ Report saved: reports/${reportFile}`);
    
    // Show quick summary
    const reportPath = path.join(__dirname, '..', 'reports', reportFile);
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      const summaryMatch = reportContent.match(/## SUMMARY[\s\S]*?(?=##)/);
      if (summaryMatch) {
        console.log('\n📋 Quick Summary:');
        console.log(summaryMatch[0]);
      }
    }
  }
  
  console.log('\n✨ Import and report generation complete!');
  console.log('=' * 60);
  
} catch (error) {
  console.error('❌ Error during processing:', error.message);
  process.exit(1);
}