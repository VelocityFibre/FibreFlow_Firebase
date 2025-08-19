const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = '/home/ldp/Downloads/Contractors Onboarding.xlsx';
const workbook = XLSX.readFile(filePath);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sheet Name:', sheetName);
console.log('Total Rows:', data.length);
console.log('\nColumns:', Object.keys(data[0] || {}));
console.log('\nFirst 3 rows:');
data.slice(0, 3).forEach((row, index) => {
  console.log(`\nRow ${index + 1}:`, row);
});