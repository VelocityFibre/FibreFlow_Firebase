#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Check if filename is provided
if (process.argv.length < 3) {
    console.log('Usage: node convert-excel-to-csv.js <excel-file>');
    console.log('Example: node convert-excel-to-csv.js /path/to/file.xlsx');
    process.exit(1);
}

const excelFile = process.argv[2];

// Check if file exists
if (!fs.existsSync(excelFile)) {
    console.error(`File not found: ${excelFile}`);
    process.exit(1);
}

try {
    console.log(`Reading Excel file: ${excelFile}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelFile);
    
    // List all sheet names
    console.log('\nAvailable sheets:');
    workbook.SheetNames.forEach((name, index) => {
        console.log(`${index + 1}. ${name}`);
    });
    
    // For each sheet, show preview and save as CSV
    workbook.SheetNames.forEach((sheetName, index) => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
            // Show first 5 rows
            console.log('Preview (first 5 rows):');
            jsonData.slice(0, 5).forEach((row, i) => {
                console.log(`Row ${i + 1}:`, row.slice(0, 8).join(' | '));
            });
            
            // Convert to CSV
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            
            // Save CSV file
            const baseFilename = path.basename(excelFile, path.extname(excelFile));
            const csvFilename = `${baseFilename}_${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
            const csvPath = path.join(path.dirname(excelFile), csvFilename);
            
            fs.writeFileSync(csvPath, csv);
            console.log(`Saved as: ${csvPath}`);
            console.log(`Rows: ${jsonData.length}, Columns: ${jsonData[0]?.length || 0}`);
        } else {
            console.log('Sheet is empty');
        }
    });
    
    console.log('\nConversion complete!');
    console.log('\nTo import into FibreFlow:');
    console.log('1. Go to /boq in your app');
    console.log('2. Click "Import BOQ"');
    console.log('3. Select a project');
    console.log('4. Upload the appropriate CSV file');
    
} catch (error) {
    console.error('Error processing Excel file:', error.message);
    process.exit(1);
}