#!/usr/bin/env node

/**
 * Extract all column names from Excel and generate mapping
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = process.argv[2] || path.join(process.env.HOME, 'Downloads/1754473447790_Lawley_01082025.xlsx');

console.log('Extracting column names from:', excelFile);

// Read Excel file
const workbook = XLSX.readFile(excelFile);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Get headers (first row)
const headers = data[0];
console.log(`Found ${headers.length} columns\n`);

// Generate mapping
console.log('const columnMapping = {');
headers.forEach((header, index) => {
    // Convert to PostgreSQL column name
    const pgColumn = header.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .replace(/__+/g, '_');
    
    console.log(`    '${header}': '${pgColumn}',`);
});
console.log('};\n');

// Also save to file
const mapping = {};
headers.forEach(header => {
    const pgColumn = header.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .replace(/__+/g, '_');
    mapping[header] = pgColumn;
});

fs.writeFileSync(
    path.join(__dirname, '..', 'config', 'column-mapping.json'),
    JSON.stringify(mapping, null, 2)
);

console.log('Column mapping saved to: config/column-mapping.json');
console.log(`Total mappings: ${Object.keys(mapping).length}`);