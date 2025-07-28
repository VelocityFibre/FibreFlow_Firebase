#!/usr/bin/env node

/**
 * Batch Data Quality Analysis
 * 
 * Analyzes multiple CSV files to track quality improvements over time
 */

const fs = require('fs');
const path = require('path');
const DataQualityTracker = require('./track-data-quality');

const downloadsDir = path.join(__dirname, '../downloads');

console.log('Batch Data Quality Analysis');
console.log('==========================\n');

// Find all CSV files in downloads directory
const csvFiles = fs.readdirSync(downloadsDir)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(downloadsDir, file))
    .sort();

if (csvFiles.length === 0) {
    console.log('No CSV files found in downloads directory.');
    process.exit(1);
}

console.log(`Found ${csvFiles.length} CSV files to analyze:\n`);
csvFiles.forEach(file => console.log(`- ${path.basename(file)}`));

// Create tracker instance
const tracker = new DataQualityTracker();

// Analyze each file
csvFiles.forEach(file => {
    try {
        tracker.runAnalysis(file);
    } catch (error) {
        console.error(`Error analyzing ${path.basename(file)}: ${error.message}`);
    }
});

console.log('\n' + '='.repeat(60));
console.log('BATCH ANALYSIS COMPLETE');
console.log('='.repeat(60));
console.log('\nView results in:');
console.log('- reports/data-quality-audit.json (detailed metrics)');
console.log('- reports/data-quality-summary.md (summary report)');