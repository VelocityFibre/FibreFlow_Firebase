#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

const inputFile = path.join(__dirname, '../downloads/Lawley July Week 4 21072025.csv');

console.log('Analyzing photo coverage...\n');

const fileContent = fs.readFileSync(inputFile, 'utf-8');
const records = csv.parse(fileContent, {
    delimiter: ';',
    relax_quotes: true,
    skip_empty_lines: true
});

// Analysis by status
const statusAnalysis = {};

records.forEach((record, index) => {
    if (index === 0) return; // Skip header
    
    const status = record[3] || 'No Status';
    const propertyPhoto = record[67]; // Photo of Property field
    
    if (!statusAnalysis[status]) {
        statusAnalysis[status] = { total: 0, withPhoto: 0, withoutPhoto: 0 };
    }
    
    statusAnalysis[status].total++;
    
    if (propertyPhoto && propertyPhoto.trim() !== '') {
        statusAnalysis[status].withPhoto++;
    } else {
        statusAnalysis[status].withoutPhoto++;
    }
});

// Display results
console.log('Photo Coverage by Status:');
console.log('='.repeat(80));

Object.entries(statusAnalysis)
    .filter(([status]) => status !== '')
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([status, data]) => {
        const percentage = ((data.withPhoto / data.total) * 100).toFixed(1);
        console.log(`\n${status}:`);
        console.log(`  Total: ${data.total}`);
        console.log(`  With Photos: ${data.withPhoto} (${percentage}%)`);
        console.log(`  Without Photos: ${data.withoutPhoto} (${100 - percentage}%)`);
    });

// Key insights
console.log('\n' + '='.repeat(80));
console.log('KEY INSIGHTS:');
console.log('='.repeat(80));

const inProgress = statusAnalysis['Home Installation: In Progress'];
const installed = statusAnalysis['Home Installation: Installed'];
const scheduled = statusAnalysis['Home Sign Ups: Approved & Installation Scheduled'];

if (inProgress) {
    console.log(`\n1. In Progress Installations:`);
    console.log(`   - ${inProgress.withPhoto} have photos (${((inProgress.withPhoto/inProgress.total)*100).toFixed(1)}%)`);
    console.log(`   - ${inProgress.withoutPhoto} missing photos (${((inProgress.withoutPhoto/inProgress.total)*100).toFixed(1)}%)`);
}

if (installed) {
    console.log(`\n2. Completed Installations:`);
    console.log(`   - Only ${installed.total} marked as "Installed"`);
    console.log(`   - ${installed.withPhoto} have photos`);
}

if (scheduled) {
    console.log(`\n3. Scheduled Installations:`);
    console.log(`   - ${scheduled.total} total scheduled`);
    console.log(`   - ${scheduled.withPhoto} already have property photos (${((scheduled.withPhoto/scheduled.total)*100).toFixed(1)}%)`);
}

// Workflow insights
console.log('\n4. Workflow Status:');
const totalRecords = records.length - 1;
const polePermissions = statusAnalysis['Pole Permission: Approved']?.total || 0;
const signUps = scheduled?.total || 0;
const inProgressCount = inProgress?.total || 0;
const completedCount = installed?.total || 0;

console.log(`   - Pole Permissions: ${polePermissions}`);
console.log(`   - Sign Ups Scheduled: ${signUps}`);
console.log(`   - In Progress: ${inProgressCount}`);
console.log(`   - Completed: ${completedCount}`);
console.log(`   - Completion Rate: ${((completedCount / signUps) * 100).toFixed(2)}%`);