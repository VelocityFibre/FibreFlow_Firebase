#!/usr/bin/env node

/**
 * Quick Test Script for Graph Analysis
 * 
 * The easiest way to test the graph analysis system
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function quickTest() {
  console.log('🚀 OneMap Graph Analysis - Quick Test\n');
  console.log('This will process a CSV file and show you all the graph analysis features.\n');
  
  // Find a CSV to test with
  let csvPath = process.argv[2];
  
  if (!csvPath) {
    // Look for test CSV
    const testCsv = path.join(__dirname, '../downloads/test-10-records.csv');
    try {
      await fs.access(testCsv);
      csvPath = testCsv;
      console.log('📁 Using test CSV: test-10-records.csv\n');
    } catch {
      // Find any CSV in downloads
      const downloadsDir = path.join(__dirname, '../downloads');
      const files = await fs.readdir(downloadsDir);
      const csvFiles = files.filter(f => f.endsWith('.csv')).sort();
      
      if (csvFiles.length > 0) {
        // Use the smallest one
        const fileSizes = await Promise.all(
          csvFiles.map(async f => {
            const stats = await fs.stat(path.join(downloadsDir, f));
            return { name: f, size: stats.size };
          })
        );
        
        fileSizes.sort((a, b) => a.size - b.size);
        csvPath = path.join(downloadsDir, fileSizes[0].name);
        console.log(`📁 Using smallest CSV: ${fileSizes[0].name} (${(fileSizes[0].size / 1024 / 1024).toFixed(1)}MB)\n`);
      } else {
        console.error('❌ No CSV files found!');
        console.log('\nPlease provide a CSV file:');
        console.log('  node quick-test.js path/to/your.csv\n');
        process.exit(1);
      }
    }
  }
  
  try {
    console.log('═'.repeat(60));
    console.log('STEP 1: EXTRACTING RELATIONSHIPS FROM CSV');
    console.log('═'.repeat(60));
    console.log('This identifies all poles, drops, addresses, and their connections.\n');
    
    await execAsync(`node processors/extract-relationships.js "${csvPath}"`).then(({ stdout }) => {
      console.log(stdout);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 2: BUILDING THE GRAPH');
    console.log('═'.repeat(60));
    console.log('This assembles all relationships into a connected graph structure.\n');
    
    await execAsync('node processors/build-graph.js fresh').then(({ stdout }) => {
      console.log(stdout);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 3: FINDING DUPLICATES & VALIDATING DATA');
    console.log('═'.repeat(60));
    console.log('This uses graph analysis to find duplicates and check data integrity.\n');
    
    await execAsync('node analyzers/find-duplicates.js').then(({ stdout }) => {
      console.log(stdout);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ QUICK TEST COMPLETE!');
    console.log('═'.repeat(60));
    
    console.log('\n📊 What just happened:');
    console.log('1. Extracted entities and relationships from your CSV');
    console.log('2. Built a graph showing how everything connects');
    console.log('3. Found duplicates using relationship patterns');
    console.log('4. Validated business rules (like 12 drops per pole)');
    
    console.log('\n📁 Check your results:');
    console.log('- Detailed reports in: GraphAnalysis/reports/');
    console.log('- Graph data in: GraphAnalysis/data/graphs/');
    
    // Show latest report
    const reportsDir = path.join(__dirname, 'reports');
    try {
      const reports = await fs.readdir(reportsDir);
      const summaries = reports.filter(f => f.startsWith('duplicate_summary_')).sort();
      
      if (summaries.length > 0) {
        const latestSummary = summaries[summaries.length - 1];
        console.log(`\n📄 Latest summary report: reports/${latestSummary}`);
        console.log('\nTo view it:');
        console.log(`  cat GraphAnalysis/reports/${latestSummary}`);
      }
    } catch (e) {
      // Reports directory might not exist yet
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Review the duplicate summary report');
    console.log('2. Check for any capacity violations');
    console.log('3. Try with your production CSV files');
    console.log('4. Integrate into your existing workflows');
    
  } catch (error) {
    console.error('\n❌ Error during quick test:', error.message);
    if (error.stderr) {
      console.error(error.stderr);
    }
    console.log('\n💡 Tip: Make sure you run this from the GraphAnalysis directory:');
    console.log('  cd OneMap/GraphAnalysis');
    console.log('  node quick-test.js');
  }
}

// Run the test
quickTest();