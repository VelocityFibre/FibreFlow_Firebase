#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Input and output files
const inputFile = '/home/ldp/Downloads/IVO.03-00.798006&RAB.01-00.798008.BoQ.20250404.V01_Master_Material_List.csv';
const outputFile = '/home/ldp/Downloads/BOQ_Clean_Import.csv';

console.log('Cleaning BOQ CSV for import...\n');

// Read the file
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Output lines
const outputLines = [];
let validCount = 0;
let skippedCount = 0;

// Process each line
lines.forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) {
        skippedCount++;
        return;
    }
    
    // Parse CSV (simple split for now)
    const cols = line.split(',');
    
    // Skip first line (title)
    if (index === 0) {
        skippedCount++;
        return;
    }
    
    // Headers line
    if (index === 1) {
        // Use simplified headers
        outputLines.push('Item Code,Description,UoM,Quantity,Item Rate');
        return;
    }
    
    // Data lines
    const itemNo = cols[0]?.trim();
    const uom = cols[1]?.trim();
    const category = cols[2]?.trim();
    const description = cols[3]?.trim();
    const quantity = cols[4]?.trim() || '0';
    const itemCode = cols[5]?.trim();
    const itemRate = cols[6]?.trim();
    
    // Skip lines without item code or that are category headers
    if (!itemCode || itemCode === '' || (!itemNo && !quantity && !itemRate)) {
        console.log(`Skipping line ${index + 1}: ${line.substring(0, 50)}...`);
        skippedCount++;
        return;
    }
    
    // Build clean line
    const cleanLine = [
        itemCode,
        description,
        uom || 'Each',
        quantity,
        itemRate || 'R0.00'
    ].join(',');
    
    outputLines.push(cleanLine);
    validCount++;
    
    // Show first few items
    if (validCount <= 5) {
        console.log(`Item ${validCount}: ${itemCode} - ${description.substring(0, 50)}...`);
    }
});

// Write output
fs.writeFileSync(outputFile, outputLines.join('\n'));

console.log(`\n✓ Cleaning complete!`);
console.log(`  Valid items: ${validCount}`);
console.log(`  Skipped rows: ${skippedCount}`);
console.log(`  Output saved to: ${outputFile}`);
console.log(`\nThis file is ready to import into FibreFlow!`);