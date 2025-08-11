#!/usr/bin/env node

const XLSX = require('xlsx');
const columnMapping = require('../config/column-mapping.json');

const filePath = process.argv[2] || '~/Downloads/1754473447790_Lawley_01082025.xlsx';
const expandedPath = filePath.replace('~', process.env.HOME);

console.log('Reading Excel file...');
const workbook = XLSX.readFile(expandedPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

console.log('\nFirst row data:');
console.log('================');
const firstRow = data[0];
let count = 0;
for (const [key, value] of Object.entries(firstRow)) {
    const dbColumn = columnMapping[key] || 'UNMAPPED';
    console.log(`${++count}. "${key}" => "${dbColumn}"`);
    console.log(`   Value: ${value}`);
    console.log(`   Type: ${typeof value}`);
    console.log('');
    if (count >= 10) {
        console.log('... (showing first 10 fields)');
        break;
    }
}

console.log(`\nTotal fields in row: ${Object.keys(firstRow).length}`);