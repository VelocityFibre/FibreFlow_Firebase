#!/usr/bin/env node

const fs = require('fs');

// Parse CSV line properly handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Don't forget the last field
    result.push(current.trim());
    
    return result;
}

// Input and output files
const inputFile = '/home/ldp/Downloads/IVO.03-00.798006&RAB.01-00.798008.BoQ.20250404.V01_Master_Material_List.csv';
const outputFile = '/home/ldp/Downloads/BOQ_Import_Ready.csv';

console.log('Processing BOQ CSV for import...\n');

// Read the file
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Output data
const outputData = [];
let validCount = 0;
let skippedCount = 0;

// Process each line
lines.forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) {
        return;
    }
    
    // Parse the line
    const cols = parseCSVLine(line);
    
    // Skip first line (title)
    if (index === 0) {
        return;
    }
    
    // Header line - output our standard headers
    if (index === 1) {
        outputData.push(['Item Code', 'Description', 'UoM', 'Quantity', 'Item Rate']);
        return;
    }
    
    // Extract fields
    const itemNo = cols[0] || '';
    const uom = cols[1] || '';
    const category = cols[2] || '';
    const description = cols[3] || '';
    const quantity = cols[4] || '';
    const itemCode = cols[5] || '';
    const itemRate = cols[6] || '';
    
    // Skip if no item code
    if (!itemCode.trim()) {
        skippedCount++;
        return;
    }
    
    // Skip category headers (no item number, no quantity)
    if (!itemNo && !quantity) {
        console.log(`Skipping category: ${description.substring(0, 50)}...`);
        skippedCount++;
        return;
    }
    
    // Add valid item
    outputData.push([
        itemCode.trim(),
        description.trim(),
        uom || 'Each',
        quantity || '0',
        itemRate || 'R0.00'
    ]);
    
    validCount++;
    
    // Show progress
    if (validCount <= 5 || validCount % 50 === 0) {
        console.log(`Item ${validCount}: ${itemCode.trim()} - ${description.substring(0, 40)}...`);
    }
});

// Convert to CSV
const outputCSV = outputData.map(row => {
    return row.map(field => {
        // Quote fields that contain commas
        if (field.includes(',')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }).join(',');
}).join('\n');

// Write output
fs.writeFileSync(outputFile, outputCSV);

console.log(`\n✓ Processing complete!`);
console.log(`  Valid items: ${validCount}`);
console.log(`  Skipped items: ${skippedCount}`);
console.log(`  Output file: ${outputFile}`);
console.log(`\nThis cleaned CSV is ready for import!`);