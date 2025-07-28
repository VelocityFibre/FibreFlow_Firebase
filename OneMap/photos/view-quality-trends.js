#!/usr/bin/env node

/**
 * View Quality Trends
 * Simple display of quality improvements over time
 */

const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../reports/quality-log.csv');

if (!fs.existsSync(logFile)) {
    console.log('No quality log found. Run simple-quality-log.js first.');
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const lines = content.trim().split('\n');

if (lines.length < 2) {
    console.log('No data in quality log yet.');
    process.exit(1);
}

console.log('\n📊 1Map Data Quality Trends');
console.log('='.repeat(50));

// Display table
lines.forEach((line, index) => {
    if (index === 0) {
        // Header
        console.log('\nDate       | File                    | Total   | Photos | Complete | In Progress');
        console.log('-'.repeat(80));
        return;
    }
    
    const cols = line.split(',');
    const date = cols[0];
    const file = cols[2].length > 20 ? cols[2].substring(0, 20) + '...' : cols[2];
    const total = cols[3];
    const photoPercent = cols[5] + '%';
    const completedPhotoPercent = cols[8] + '%';
    const inProgressPhotoPercent = cols[11] + '%';
    
    console.log(`${date} | ${file.padEnd(23)} | ${total.padStart(7)} | ${photoPercent.padStart(6)} | ${completedPhotoPercent.padStart(8)} | ${inProgressPhotoPercent.padStart(11)}`);
});

// Show trends if multiple entries
if (lines.length > 2) {
    console.log('\n📈 Quality Trends:');
    const first = lines[1].split(',');
    const last = lines[lines.length - 1].split(',');
    
    const firstPhoto = parseFloat(first[5]);
    const lastPhoto = parseFloat(last[5]);
    const photoTrend = lastPhoto - firstPhoto;
    
    console.log(`Overall Photo Coverage: ${photoTrend >= 0 ? '+' : ''}${photoTrend.toFixed(1)}% change`);
    
    const firstCompleted = parseFloat(first[8]);
    const lastCompleted = parseFloat(last[8]);
    const completedTrend = lastCompleted - firstCompleted;
    
    console.log(`Completed Photo Coverage: ${completedTrend >= 0 ? '+' : ''}${completedTrend.toFixed(1)}% change`);
}

console.log(`\n📁 Log file: ${logFile}`);
console.log('💡 Tip: Open in Excel/LibreOffice for charts and filtering');