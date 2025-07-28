#!/usr/bin/env node

/**
 * Simple Quality Logger
 * Tracks key metrics in a CSV log file for easy monitoring
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

const logFile = path.join(__dirname, '../reports/quality-log.csv');

function analyzeFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
        delimiter: ';',
        relax_quotes: true,
        skip_empty_lines: true
    });

    // Count key metrics
    let totalRecords = 0;
    let withPhotos = 0;
    let completed = 0;
    let completedWithPhotos = 0;
    let inProgress = 0;
    let inProgressWithPhotos = 0;

    records.forEach((record, index) => {
        if (index === 0) return; // Skip header
        
        totalRecords++;
        const status = record[3] || '';
        const hasPhoto = record[67] && record[67].trim() !== '';
        
        if (hasPhoto) withPhotos++;
        
        if (status.includes('Installed')) {
            completed++;
            if (hasPhoto) completedWithPhotos++;
        } else if (status.includes('In Progress')) {
            inProgress++;
            if (hasPhoto) inProgressWithPhotos++;
        }
    });

    // Calculate percentages
    const photoPercentage = ((withPhotos / totalRecords) * 100).toFixed(1);
    const completedPhotoPercentage = completed > 0 ? 
        ((completedWithPhotos / completed) * 100).toFixed(1) : '0.0';
    const inProgressPhotoPercentage = inProgress > 0 ? 
        ((inProgressWithPhotos / inProgress) * 100).toFixed(1) : '0.0';

    return {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        fileName: path.basename(filePath),
        totalRecords,
        withPhotos,
        photoPercentage,
        completed,
        completedWithPhotos,
        completedPhotoPercentage,
        inProgress,
        inProgressWithPhotos,
        inProgressPhotoPercentage
    };
}

// Main
const inputFile = process.argv[2];
if (!inputFile) {
    console.log('Usage: node simple-quality-log.js <csv-file>');
    process.exit(1);
}

const metrics = analyzeFile(inputFile);

// Create log file if doesn't exist
if (!fs.existsSync(logFile)) {
    const header = 'Date,Time,File,Total Records,With Photos,Photo %,Completed,Completed w/Photos,Completed Photo %,In Progress,In Progress w/Photos,In Progress Photo %\n';
    fs.writeFileSync(logFile, header);
}

// Append metrics
const row = `${metrics.date},${metrics.time},${metrics.fileName},${metrics.totalRecords},${metrics.withPhotos},${metrics.photoPercentage},${metrics.completed},${metrics.completedWithPhotos},${metrics.completedPhotoPercentage},${metrics.inProgress},${metrics.inProgressWithPhotos},${metrics.inProgressPhotoPercentage}\n`;
fs.appendFileSync(logFile, row);

// Display results
console.log(`
Quality Metrics for ${metrics.fileName}
========================================
Total Records: ${metrics.totalRecords}
Photos: ${metrics.withPhotos} (${metrics.photoPercentage}%)

Completed: ${metrics.completed}
  - With photos: ${metrics.completedWithPhotos} (${metrics.completedPhotoPercentage}%)
  
In Progress: ${metrics.inProgress}
  - With photos: ${metrics.inProgressWithPhotos} (${metrics.inProgressPhotoPercentage}%)

✅ Logged to: ${logFile}
`);

// Show if quality is improving
const logContent = fs.readFileSync(logFile, 'utf-8');
const logLines = logContent.trim().split('\n');
if (logLines.length > 2) {
    console.log('📊 Trend: Check quality-log.csv to see if metrics improve over time');
}