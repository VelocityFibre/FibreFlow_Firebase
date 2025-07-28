#!/usr/bin/env node

/**
 * Flag Missing Installation Photos
 * 
 * This script identifies installations marked as complete but missing photo documentation.
 * It checks various completion statuses and flags records with no photo IDs.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Input file
const inputFile = path.join(__dirname, '../downloads/Lawley July Week 4 21072025.csv');
const outputDir = path.join(__dirname, '../reports');
const outputFile = path.join(outputDir, 'missing-installation-photos-report.csv');
const summaryFile = path.join(outputDir, 'missing-photos-summary.md');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Photo field indices (0-based)
const PHOTO_FIELDS = {
    'Photo of Property': 67,
    'Photo of Splitter Tray': 83,
    'Photo of Connection Points': 84,
    'Photo of Handhole Before': 85,
    'Photo of Handhole After': 86,
    'Photo Wall Before Install': 87,
    'Photo Active Broadband Light': 93,
    'Photo Overall Work Area': 99
};

// Status patterns that indicate completed work
const COMPLETION_PATTERNS = [
    'Home Installation: Installed',
    'Home Installation: Complete',
    'Installation Complete',
    'Activated',
    'Connected'
];

console.log('Reading CSV file...');
const fileContent = fs.readFileSync(inputFile, 'utf-8');
const records = csv.parse(fileContent, {
    delimiter: ';',
    relax_quotes: true,
    skip_empty_lines: true
});

console.log(`Total records: ${records.length}`);

// Process records
const missingPhotoRecords = [];
const statusCounts = {};
let completedCount = 0;
let missingPhotoCount = 0;

records.forEach((record, index) => {
    if (index === 0) return; // Skip header
    
    const propertyId = record[0];
    const status = record[3];
    const poleNumber = record[16];
    const dropNumber = record[17];
    const address = record[8];
    const installerName = record[106];
    const installDate = record[112];
    
    // Check if this is a completed installation
    const isCompleted = COMPLETION_PATTERNS.some(pattern => 
        status && status.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isCompleted) {
        completedCount++;
        
        // Check for photos
        const photoData = {};
        let hasAnyPhoto = false;
        
        Object.entries(PHOTO_FIELDS).forEach(([fieldName, index]) => {
            const value = record[index];
            photoData[fieldName] = value || '';
            if (value && value.trim() !== '') {
                hasAnyPhoto = true;
            }
        });
        
        // Flag if no photos
        if (!hasAnyPhoto) {
            missingPhotoCount++;
            missingPhotoRecords.push({
                propertyId,
                status,
                poleNumber: poleNumber || 'N/A',
                dropNumber: dropNumber || 'N/A',
                address: address || 'N/A',
                installerName: installerName || 'Unknown',
                installDate: installDate || 'Unknown',
                ...photoData
            });
        }
    }
    
    // Count all statuses
    if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
});

// Also check "In Progress" installations that might need photos
const inProgressRecords = [];
records.forEach((record, index) => {
    if (index === 0) return;
    
    const status = record[3];
    if (status && status.includes('Home Installation: In Progress')) {
        const propertyPhoto = record[67];
        if (!propertyPhoto || propertyPhoto.trim() === '') {
            inProgressRecords.push({
                propertyId: record[0],
                poleNumber: record[16] || 'N/A',
                dropNumber: record[17] || 'N/A',
                address: record[8] || 'N/A',
                installerName: record[106] || 'Not assigned',
                lastModified: record[112] || 'Unknown'
            });
        }
    }
});

// Write detailed report
console.log('\nWriting detailed report...');
const csvHeader = 'Property ID,Status,Pole Number,Drop Number,Address,Installer Name,Install Date,' +
    Object.keys(PHOTO_FIELDS).join(',') + '\n';

const csvContent = csvHeader + missingPhotoRecords.map(record => {
    return [
        record.propertyId,
        record.status,
        record.poleNumber,
        record.dropNumber,
        `"${record.address}"`,
        record.installerName,
        record.installDate,
        ...Object.keys(PHOTO_FIELDS).map(field => record[field] || 'MISSING')
    ].join(',');
}).join('\n');

fs.writeFileSync(outputFile, csvContent);

// Write summary report
console.log('Writing summary report...');
const summaryContent = `# Missing Installation Photos Report
Generated: ${new Date().toISOString()}
Source: Lawley July Week 4 21072025.csv

## Executive Summary
- **Total Records Analyzed**: ${records.length - 1}
- **Completed Installations**: ${completedCount}
- **Completed WITHOUT Photos**: ${missingPhotoCount} (${((missingPhotoCount/completedCount)*100).toFixed(1)}%)
- **In Progress WITHOUT Property Photo**: ${inProgressRecords.length}

## Status Distribution
${Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `- ${status}: ${count}`)
    .join('\n')}

## Critical Findings

### 1. Completed Installations Missing Photos
Found **${missingPhotoCount}** installations marked as complete but with NO photo documentation.

${missingPhotoCount > 0 ? `
### Top Issues by Installer
${(() => {
    const installerCounts = {};
    missingPhotoRecords.forEach(r => {
        const installer = r.installerName || 'Unknown';
        installerCounts[installer] = (installerCounts[installer] || 0) + 1;
    });
    return Object.entries(installerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([installer, count]) => `- ${installer}: ${count} missing photos`)
        .join('\n');
})()}
` : 'No missing photos found for completed installations.'}

### 2. In Progress Installations Missing Initial Photo
Found **${inProgressRecords.length}** in-progress installations without the initial property photo.

## Recommendations
1. **Immediate Action**: Contact installers with missing photos to complete documentation
2. **Process Review**: Ensure photo capture is mandatory before marking installation complete
3. **Training**: Re-train installers on photo requirements
4. **System Enhancement**: Add validation to prevent completion without photos

## Photo Requirements Checklist
The following photos should be captured for each installation:
- [ ] Property Photo (before work begins)
- [ ] Splitter Tray in Dome Joint
- [ ] Connection Points in BB/Handhole
- [ ] Handhole Before Closing
- [ ] Handhole After Closing
- [ ] Wall Location Before Installation
- [ ] Active Broadband Light with Drop Number
- [ ] Overall Work Area After Completion

## Export Files
- Detailed Report: ${path.basename(outputFile)}
- This Summary: ${path.basename(summaryFile)}
`;

fs.writeFileSync(summaryFile, summaryContent);

// Console output
console.log('\n=== ANALYSIS COMPLETE ===');
console.log(`Total completed installations: ${completedCount}`);
console.log(`Missing photos: ${missingPhotoCount} (${((missingPhotoCount/completedCount)*100).toFixed(1)}%)`);
console.log(`In progress missing initial photo: ${inProgressRecords.length}`);
console.log('\nReports generated:');
console.log(`- ${outputFile}`);
console.log(`- ${summaryFile}`);

// Sample of missing photo records
if (missingPhotoRecords.length > 0) {
    console.log('\nSample of installations missing photos:');
    missingPhotoRecords.slice(0, 5).forEach(record => {
        console.log(`- ${record.dropNumber} at ${record.address} (Installer: ${record.installerName})`);
    });
}