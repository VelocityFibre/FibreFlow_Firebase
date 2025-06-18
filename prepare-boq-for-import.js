#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Input file
const inputFile = '/home/ldp/Downloads/IVO.03-00.798006&RAB.01-00.798008.BoQ.20250404.V01_Master_Material_List.csv';
const outputFile = '/home/ldp/Downloads/BOQ_Ready_For_Import.csv';

console.log('Reading Master Material List CSV...');

// Read the file
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Skip the first line (title) and get headers
const headers = lines[1].split(',');
console.log('Original headers:', headers);

// Create new CSV with mapped headers
const newHeaders = [
    'Item Code',
    'Description', 
    'Unit',
    'Quantity',
    'Unit Price',
    'Specification',
    'Item Category',
    'Supplier'
];

let outputLines = [newHeaders.join(',')];
let validItemCount = 0;
let skippedCount = 0;

// Process data rows (skip first 2 lines - title and headers)
for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle commas in quoted fields)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    
    // Skip category header rows and items without item codes
    const itemCode = values[5]?.trim();
    const description = values[3]?.trim();
    
    if (!itemCode || itemCode === '' || description === 'Cable' || !description) {
        skippedCount++;
        continue;
    }
    
    // Map to new format
    const mappedRow = [
        itemCode,                           // Item Code
        description,                        // Description
        values[1] || 'Each',               // Unit (UoM)
        values[4] || '0',                  // Quantity
        values[6]?.replace('R', '') || '0', // Unit Price (remove R prefix)
        '',                                // Specification (empty in this data)
        values[2] || '',                   // Item Category
        values[7] || ''                    // Supplier
    ];
    
    outputLines.push(mappedRow.map(v => {
        // Quote values containing commas
        if (v.includes(',')) {
            return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
    }).join(','));
    
    validItemCount++;
}

// Write the output file
fs.writeFileSync(outputFile, outputLines.join('\n'));

console.log('\nConversion complete!');
console.log(`Valid items processed: ${validItemCount}`);
console.log(`Skipped rows: ${skippedCount}`);
console.log(`Output saved to: ${outputFile}`);

console.log('\nSample of converted data:');
const sampleLines = outputLines.slice(0, 6);
sampleLines.forEach(line => console.log(line));

console.log('\nTo import:');
console.log('1. Go to /boq in FibreFlow');
console.log('2. Click "Import BOQ"');
console.log('3. Select your project');
console.log('4. Upload:', outputFile);