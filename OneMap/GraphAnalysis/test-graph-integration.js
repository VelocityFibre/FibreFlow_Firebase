#!/usr/bin/env node

/**
 * Test Graph Integration with OneMap CSV Processing
 * 
 * Demonstrates how to use graph analysis alongside existing CSV processing
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runGraphAnalysis(csvPath) {
  console.log('🚀 OneMap Graph Analysis Test\n');
  console.log('This demonstrates how graph analysis enhances CSV processing:\n');
  
  try {
    // Step 1: Extract relationships from CSV
    console.log('1️⃣ Extracting relationships from CSV...');
    const extractCmd = `node ${path.join(__dirname, 'processors/extract-relationships.js')} "${csvPath}"`;
    const { stdout: extractOutput } = await execAsync(extractCmd);
    console.log(extractOutput);
    
    // Step 2: Build graph from relationships
    console.log('\n2️⃣ Building graph from relationships...');
    const buildCmd = `node ${path.join(__dirname, 'processors/build-graph.js')} fresh`;
    const { stdout: buildOutput } = await execAsync(buildCmd);
    console.log(buildOutput);
    
    // Step 3: Find duplicates using graph analysis
    console.log('\n3️⃣ Finding duplicates using graph analysis...');
    const duplicateCmd = `node ${path.join(__dirname, 'analyzers/find-duplicates.js')}`;
    const { stdout: duplicateOutput } = await execAsync(duplicateCmd);
    console.log(duplicateOutput);
    
    console.log('\n✅ Graph analysis complete!');
    console.log('\n📚 What just happened:');
    console.log('   1. Extracted nodes (poles, drops, addresses) and their relationships');
    console.log('   2. Built a graph structure showing all connections');
    console.log('   3. Used graph algorithms to find duplicates and validate data');
    console.log('\n💡 Benefits over simple CSV processing:');
    console.log('   - Detects duplicates by relationship patterns, not just exact matches');
    console.log('   - Validates pole capacity (max 12 drops) using graph connections');
    console.log('   - Tracks entity evolution across multiple CSV imports');
    console.log('   - Enables complex queries like "find all drops without poles"');
    
  } catch (error) {
    console.error('❌ Error during graph analysis:', error.message);
    if (error.stderr) {
      console.error(error.stderr);
    }
  }
}

// Main execution
async function main() {
  // Check for test CSV or use example
  let csvPath = process.argv[2];
  
  if (!csvPath) {
    // Look for a test CSV in downloads
    const downloadsDir = path.join(__dirname, '../downloads');
    try {
      const files = await fs.readdir(downloadsDir);
      const csvFiles = files.filter(f => f.endsWith('.csv'));
      
      if (csvFiles.length > 0) {
        csvPath = path.join(downloadsDir, csvFiles[0]);
        console.log(`📁 Using test CSV: ${csvFiles[0]}\n`);
      } else {
        console.error('❌ No CSV file provided and no test files found in downloads/');
        console.log('\nUsage: node test-graph-integration.js <csv-path>');
        console.log('   or: place a CSV file in OneMap/downloads/');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Could not access downloads directory:', error.message);
      process.exit(1);
    }
  }
  
  await runGraphAnalysis(csvPath);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runGraphAnalysis };