#!/usr/bin/env node

const Database = require('duckdb-async').Database;
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

// Command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node import-excel-duckdb.js <excel-file-path> [sheet-name]');
    console.log('Example: node import-excel-duckdb.js ../data/1754473447790_Lawley_01082025.xlsx');
    process.exit(1);
}

const excelPath = path.resolve(args[0]);
const sheetName = args[1] || 'Sheet1';

// Validate file exists
if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found:', excelPath);
    process.exit(1);
}

console.log('🦆 DuckDB Excel Import Tool (Async)');
console.log('📄 File:', excelPath);
console.log('📋 Sheet:', sheetName);
console.log('📊 File size:', (fs.statSync(excelPath).size / 1024 / 1024).toFixed(2), 'MB');

async function importExcel() {
    const db = await Database.create(DB_PATH);
    
    try {
        // Install and load spatial extension (includes Excel support in newer versions)
        console.log('\n📦 Installing extensions...');
        await db.run('INSTALL spatial');
        await db.run('LOAD spatial');
        
        // Create a simple import table from the Excel file
        console.log('\n📥 Creating import table from Excel...');
        
        // First, let's try a different approach - use CSV reading capability
        // Many Excel files can be read as CSV-like structures
        const createTableQuery = `
            CREATE OR REPLACE TABLE excel_import AS 
            SELECT * FROM read_csv_auto('${excelPath.replace(/'/g, "''")}')
        `;
        
        try {
            await db.run(createTableQuery);
            console.log('✅ Data imported using CSV auto-detection');
        } catch (csvError) {
            console.log('⚠️  CSV auto-detection failed, trying Parquet approach...');
            
            // Alternative: Convert Excel to temporary CSV using a different method
            console.error('❌ Direct Excel import not available in this DuckDB version');
            console.log('\n💡 Alternative approaches:');
            console.log('1. Convert Excel to CSV first');
            console.log('2. Use Python with pandas + DuckDB');
            console.log('3. Use the SQLite system in OneMap/SQL/');
            throw csvError;
        }
        
        // Get row count
        const countResult = await db.all('SELECT COUNT(*) as count FROM excel_import');
        console.log(`\n✅ Successfully imported ${countResult[0].count} rows`);
        
        // Show table structure
        console.log('\n📋 Table Structure:');
        const columns = await db.all('DESCRIBE excel_import');
        console.table(columns);
        
        // Show sample data
        console.log('\n📄 Sample Data (first 5 rows):');
        const sample = await db.all('SELECT * FROM excel_import LIMIT 5');
        console.table(sample);
        
        // Analyze the data
        await analyzeData(db);
        
    } catch (error) {
        console.error('\n❌ Import error:', error.message);
        
        // Suggest using the SQLite system instead
        console.log('\n💡 Recommendation: Use the SQLite-based system instead');
        console.log('   cd OneMap/SQL/scripts');
        console.log('   npm run import ../data/excel/1754473447790_Lawley_01082025.xlsx');
        
    } finally {
        await db.close();
    }
}

async function analyzeData(db) {
    console.log('\n📊 Data Analysis:');
    
    try {
        // Get column names
        const columns = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'excel_import'");
        const columnNames = columns.map(c => c.column_name);
        
        // Look for status columns
        const statusCol = columnNames.find(col => col.toLowerCase().includes('status'));
        if (statusCol) {
            const statusCounts = await db.all(`
                SELECT "${statusCol}" as status, COUNT(*) as count
                FROM excel_import
                GROUP BY "${statusCol}"
                ORDER BY count DESC
                LIMIT 10
            `);
            console.log(`\n📈 Status Distribution (${statusCol}):`);
            console.table(statusCounts);
        }
        
        // Look for date columns
        const dateCol = columnNames.find(col => col.toLowerCase().includes('date'));
        if (dateCol) {
            const dateRange = await db.all(`
                SELECT 
                    MIN("${dateCol}") as earliest,
                    MAX("${dateCol}") as latest,
                    COUNT(DISTINCT "${dateCol}") as unique_dates
                FROM excel_import
            `);
            console.log(`\n📅 Date Range (${dateCol}):`);
            console.table(dateRange[0]);
        }
        
        // Show all available columns
        console.log('\n📋 Available Columns for Analysis:');
        columnNames.forEach((col, idx) => {
            console.log(`   ${idx + 1}. ${col}`);
        });
        
        console.log('\n✅ Import and analysis complete!');
        console.log('\n💡 Next steps:');
        console.log('1. Query the data: SELECT * FROM excel_import WHERE ...');
        console.log('2. Export results: COPY (SELECT ...) TO "output.csv" (HEADER, DELIMITER ",")');
        console.log('3. Create analytics views for common queries');
        
    } catch (error) {
        console.error('⚠️  Analysis error:', error.message);
    }
}

// Run the import
importExcel().catch(console.error);