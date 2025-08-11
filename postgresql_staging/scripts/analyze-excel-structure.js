const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Script to analyze the structure of Lawley Excel files from OneMap
// This helps us understand what schema to create in PostgreSQL

const filePath = process.argv[2] || '~/Downloads/1754473447790_Lawley_01082025.xlsx';
const expandedPath = filePath.replace('~', require('os').homedir());

if (!fs.existsSync(expandedPath)) {
    console.error(`File not found: ${expandedPath}`);
    process.exit(1);
}

console.log('🔍 Analyzing OneMap Excel Structure');
console.log('===================================');
console.log(`📁 File: ${path.basename(expandedPath)}`);
console.log(`📊 Size: ${(fs.statSync(expandedPath).size / (1024*1024)).toFixed(2)} MB`);
console.log('');

// Read Excel file
console.log('📖 Reading Excel file...');
const workbook = XLSX.readFile(expandedPath);
const sheetNames = workbook.SheetNames;

console.log(`📋 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`);
console.log('');

// Analyze first sheet (main data)
const mainSheet = workbook.Sheets[sheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(mainSheet, { header: 1, raw: false });

if (jsonData.length === 0) {
    console.error('❌ No data found in sheet');
    process.exit(1);
}

// Get headers (first row)
const headers = jsonData[0];
const dataRows = jsonData.slice(1);
const sampleRows = dataRows.slice(0, 10); // First 10 data rows

console.log(`📊 Data Summary:`);
console.log(`   • Total columns: ${headers.length}`);
console.log(`   • Total rows: ${dataRows.length}`);
console.log('');

console.log('📝 Column Analysis:');
console.log('==================');

headers.forEach((header, index) => {
    // Analyze column data types and sample values
    const columnData = sampleRows.map(row => row[index]).filter(val => val != null && val !== '');
    
    let dataType = 'TEXT';
    let maxLength = 0;
    const uniqueValues = new Set();
    
    columnData.forEach(value => {
        if (value != null && value !== '') {
            uniqueValues.add(String(value));
            maxLength = Math.max(maxLength, String(value).length);
            
            // Try to determine data type
            if (!isNaN(value) && !isNaN(parseFloat(value))) {
                if (value.toString().includes('.')) {
                    dataType = 'DECIMAL';
                } else {
                    dataType = 'INTEGER';
                }
            } else if (value.toString().match(/^\d{4}-\d{2}-\d{2}/) || value.toString().match(/^\d{2}\/\d{2}\/\d{4}/)) {
                dataType = 'DATE';
            }
        }
    });
    
    console.log(`${String(index + 1).padStart(3, ' ')}. ${header}`);
    console.log(`     Type: ${dataType}${maxLength > 0 ? ` (max ${maxLength} chars)` : ''}`);
    console.log(`     Unique values: ${uniqueValues.size}`);
    if (uniqueValues.size <= 10 && uniqueValues.size > 1) {
        console.log(`     Values: ${Array.from(uniqueValues).slice(0, 5).join(', ')}${uniqueValues.size > 5 ? '...' : ''}`);
    }
    console.log('');
});

console.log('🔍 Key Fields Analysis:');
console.log('======================');

// Look for important fields
const keyFields = {
    'Property ID': headers.find(h => h.toLowerCase().includes('property') && h.toLowerCase().includes('id')),
    'Pole Number': headers.find(h => h.toLowerCase().includes('pole')),
    'Drop Number': headers.find(h => h.toLowerCase().includes('drop')),
    'Status': headers.find(h => h.toLowerCase().includes('status')),
    'Address': headers.find(h => h.toLowerCase().includes('address')),
    'GPS/Location': headers.find(h => h.toLowerCase().includes('gps') || h.toLowerCase().includes('lat') || h.toLowerCase().includes('lng')),
    'Agent/Contractor': headers.find(h => h.toLowerCase().includes('agent') || h.toLowerCase().includes('contractor')),
    'Date': headers.find(h => h.toLowerCase().includes('date'))
};

Object.entries(keyFields).forEach(([field, foundHeader]) => {
    if (foundHeader) {
        console.log(`✅ ${field}: "${foundHeader}"`);
    } else {
        console.log(`❌ ${field}: Not found`);
    }
});

console.log('');
console.log('💾 Generating PostgreSQL Schema:');
console.log('=================================');

// Generate PostgreSQL CREATE TABLE statement
let sqlSchema = `-- PostgreSQL schema for OneMap Lawley project data
-- Generated from: ${path.basename(expandedPath)}
-- Total columns: ${headers.length}
-- Total records: ${dataRows.length}

CREATE TABLE IF NOT EXISTS onemap_lawley_raw (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Import metadata
    import_date TIMESTAMPTZ DEFAULT NOW(),
    source_file TEXT DEFAULT '${path.basename(expandedPath)}',
    
    -- OneMap data columns
`;

headers.forEach((header, index) => {
    const columnData = sampleRows.map(row => row[index]).filter(val => val != null && val !== '');
    let sqlType = 'TEXT';
    let maxLength = 0;
    
    columnData.forEach(value => {
        if (value != null) {
            maxLength = Math.max(maxLength, String(value).length);
            if (!isNaN(value) && !isNaN(parseFloat(value))) {
                if (value.toString().includes('.')) {
                    sqlType = 'DECIMAL(15,8)';
                } else {
                    sqlType = 'INTEGER';
                }
            } else if (value.toString().match(/^\d{4}-\d{2}-\d{2}/) || value.toString().match(/^\d{2}\/\d{2}\/\d{4}/)) {
                sqlType = 'DATE';
            }
        }
    });
    
    const safeColumnName = header.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    sqlSchema += `    "${safeColumnName}" ${sqlType}, -- Original: "${header}"\n`;
});

sqlSchema += `
    -- Computed fields for analysis
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    data_quality_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Indexes
    UNIQUE(source_file, "property_id") -- Prevent duplicates per file
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_status ON onemap_lawley_raw USING btree ("status");
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_pole ON onemap_lawley_raw USING btree ("pole_number");
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_import ON onemap_lawley_raw USING btree (import_date);
`;

console.log(sqlSchema);

// Save schema to file
const schemaPath = path.join(__dirname, '..', 'config', 'lawley-schema.sql');
fs.writeFileSync(schemaPath, sqlSchema);
console.log(`\n💾 Schema saved to: ${schemaPath}`);

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Review the schema above');
console.log('2. Create the table in PostgreSQL');
console.log('3. Import the Excel data');
console.log('4. Analyze data quality and relationships');
console.log('5. Create views for different project needs');