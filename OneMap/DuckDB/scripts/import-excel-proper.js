#!/usr/bin/env node

const XLSX = require('xlsx');
const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

// Command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node import-excel-proper.js <excel-file-path> [sheet-name]');
    console.log('Example: node import-excel-proper.js ../data/1754473447790_Lawley_01082025.xlsx');
    process.exit(1);
}

const excelPath = path.resolve(args[0]);
const sheetName = args[1] || null; // null means first sheet

// Validate file exists
if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found:', excelPath);
    process.exit(1);
}

console.log('🦆 DuckDB Excel Import with Proper Column Mapping');
console.log('📄 File:', excelPath);
console.log('📊 File size:', (fs.statSync(excelPath).size / 1024 / 1024).toFixed(2), 'MB');

// Read Excel file
console.log('\n📖 Reading Excel file...');
const workbook = XLSX.readFile(excelPath);

// Get sheet name
const actualSheetName = sheetName || workbook.SheetNames[0];
console.log('📋 Sheet:', actualSheetName);

// Get the worksheet
const worksheet = workbook.Sheets[actualSheetName];

// Convert to JSON with header preservation
const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    raw: false,        // Convert all values to strings for consistency
    dateNF: 'yyyy-mm-dd',  // Date format
    defval: null       // Default value for empty cells
});

console.log(`✅ Read ${jsonData.length} rows from Excel`);

if (jsonData.length === 0) {
    console.error('❌ No data found in Excel file');
    process.exit(1);
}

// Get column names from first row
const excelColumns = Object.keys(jsonData[0]);
console.log('\n📋 Excel Columns Found:');
excelColumns.forEach((col, idx) => {
    console.log(`   ${idx + 1}. "${col}"`);
});

// Show sample data
console.log('\n📄 Sample Data (first 3 rows):');
console.table(jsonData.slice(0, 3));

// Initialize DuckDB
const db = new duckdb.Database(DB_PATH);
const conn = db.connect();

// Function to escape column names for SQL
function escapeColumnName(name) {
    // DuckDB uses double quotes for identifiers with spaces/special chars
    return `"${name.replace(/"/g, '""')}"`;
}

// Function to determine SQL type from values
function inferSQLType(values) {
    // Check if all values are numbers
    const numericValues = values.filter(v => v !== null && v !== '');
    if (numericValues.every(v => !isNaN(Number(v)))) {
        // Check if integer or decimal
        if (numericValues.every(v => Number.isInteger(Number(v)))) {
            return 'INTEGER';
        }
        return 'DOUBLE';
    }
    
    // Check if dates (simple check)
    if (numericValues.some(v => v && v.toString().match(/^\d{4}-\d{2}-\d{2}/))) {
        return 'DATE';
    }
    
    // Default to VARCHAR
    return 'VARCHAR';
}

// Infer column types from data
const columnTypes = {};
excelColumns.forEach(col => {
    const values = jsonData.slice(0, 100).map(row => row[col]); // Sample first 100 rows
    columnTypes[col] = inferSQLType(values);
});

console.log('\n📊 Inferred Column Types:');
Object.entries(columnTypes).forEach(([col, type]) => {
    console.log(`   ${col}: ${type}`);
});

// Create table with exact column names from Excel
const createTableSQL = `
    CREATE OR REPLACE TABLE excel_import (
        ${excelColumns.map(col => 
            `${escapeColumnName(col)} ${columnTypes[col]}`
        ).join(',\n        ')}
    )
`;

console.log('\n📥 Creating table in DuckDB...');

conn.run(createTableSQL, (err) => {
    if (err) {
        console.error('❌ Error creating table:', err);
        conn.close();
        db.close();
        return;
    }
    
    console.log('✅ Table created with Excel column names preserved');
    
    // Prepare batch insert
    console.log('\n📥 Importing data...');
    const startTime = Date.now();
    
    // Insert data in batches
    const batchSize = 1000;
    let totalInserted = 0;
    
    function insertBatch(startIdx) {
        const batch = jsonData.slice(startIdx, startIdx + batchSize);
        if (batch.length === 0) {
            // All done
            const duration = Date.now() - startTime;
            console.log(`\n✅ Import complete! ${totalInserted} rows in ${duration}ms`);
            
            // Show summary statistics
            showSummaryStats(conn, excelColumns);
            return;
        }
        
        // Build insert statement
        const placeholders = batch.map(() => 
            `(${excelColumns.map(() => '?').join(', ')})`
        ).join(', ');
        
        const insertSQL = `
            INSERT INTO excel_import (${excelColumns.map(escapeColumnName).join(', ')})
            VALUES ${placeholders}
        `;
        
        // Flatten values
        const values = [];
        batch.forEach(row => {
            excelColumns.forEach(col => {
                let value = row[col];
                
                // Handle null/undefined
                if (value === undefined || value === null || value === '') {
                    values.push(null);
                } else if (columnTypes[col] === 'INTEGER') {
                    values.push(parseInt(value) || null);
                } else if (columnTypes[col] === 'DOUBLE') {
                    values.push(parseFloat(value) || null);
                } else {
                    values.push(String(value));
                }
            });
        });
        
        conn.run(insertSQL, ...values, (err) => {
            if (err) {
                console.error('❌ Error inserting batch:', err);
                console.error('Batch start index:', startIdx);
                conn.close();
                db.close();
                return;
            }
            
            totalInserted += batch.length;
            process.stdout.write(`\r⏳ Progress: ${totalInserted}/${jsonData.length} rows (${Math.round(totalInserted/jsonData.length*100)}%)`);
            
            // Insert next batch
            insertBatch(startIdx + batchSize);
        });
    }
    
    // Start inserting
    insertBatch(0);
});

function showSummaryStats(conn, columns) {
    console.log('\n📊 Summary Statistics:');
    
    // Get row count
    conn.get('SELECT COUNT(*) as count FROM excel_import', (err, result) => {
        if (err) {
            console.error('Error getting count:', err);
            return;
        }
        console.log(`\n📈 Total rows: ${result.count}`);
        
        // Look for interesting columns to analyze
        const statusCol = columns.find(col => col.toLowerCase().includes('status'));
        const dateCol = columns.find(col => col.toLowerCase().includes('date'));
        const poleCol = columns.find(col => col.toLowerCase().includes('pole'));
        const agentCol = columns.find(col => col.toLowerCase().includes('agent'));
        
        // Show status distribution if exists
        if (statusCol) {
            conn.all(`
                SELECT ${escapeColumnName(statusCol)} as status, COUNT(*) as count
                FROM excel_import
                WHERE ${escapeColumnName(statusCol)} IS NOT NULL
                GROUP BY ${escapeColumnName(statusCol)}
                ORDER BY count DESC
                LIMIT 10
            `, (err, results) => {
                if (!err && results.length > 0) {
                    console.log(`\n📊 Status Distribution (${statusCol}):`);
                    console.table(results);
                }
                
                // Check other columns
                checkDateRange();
            });
        } else {
            checkDateRange();
        }
        
        function checkDateRange() {
            if (dateCol) {
                conn.get(`
                    SELECT 
                        MIN(${escapeColumnName(dateCol)}) as earliest,
                        MAX(${escapeColumnName(dateCol)}) as latest
                    FROM excel_import
                    WHERE ${escapeColumnName(dateCol)} IS NOT NULL
                `, (err, result) => {
                    if (!err && result) {
                        console.log(`\n📅 Date Range (${dateCol}):`);
                        console.log(`   Earliest: ${result.earliest}`);
                        console.log(`   Latest: ${result.latest}`);
                    }
                    checkPoles();
                });
            } else {
                checkPoles();
            }
        }
        
        function checkPoles() {
            if (poleCol) {
                conn.get(`
                    SELECT COUNT(DISTINCT ${escapeColumnName(poleCol)}) as unique_poles
                    FROM excel_import
                    WHERE ${escapeColumnName(poleCol)} IS NOT NULL
                `, (err, result) => {
                    if (!err && result) {
                        console.log(`\n📍 Unique ${poleCol}: ${result.unique_poles}`);
                    }
                    checkAgents();
                });
            } else {
                checkAgents();
            }
        }
        
        function checkAgents() {
            if (agentCol) {
                conn.all(`
                    SELECT ${escapeColumnName(agentCol)} as agent, COUNT(*) as count
                    FROM excel_import
                    WHERE ${escapeColumnName(agentCol)} IS NOT NULL
                    GROUP BY ${escapeColumnName(agentCol)}
                    ORDER BY count DESC
                    LIMIT 5
                `, (err, results) => {
                    if (!err && results.length > 0) {
                        console.log(`\n👥 Top 5 Agents (${agentCol}):`);
                        console.table(results);
                    }
                    finish();
                });
            } else {
                finish();
            }
        }
        
        function finish() {
            console.log('\n✅ Analysis complete!');
            console.log('\n💡 You can now query the data:');
            console.log(`   duckdb ${DB_PATH}`);
            console.log('   SELECT * FROM excel_import LIMIT 10;');
            console.log('\n📋 Remember: Column names are preserved exactly as in Excel!');
            console.log('   Use double quotes for columns with spaces: SELECT "Status Date" FROM excel_import;');
            
            conn.close();
            db.close();
        }
    });
}