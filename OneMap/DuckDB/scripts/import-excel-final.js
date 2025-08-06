#!/usr/bin/env node

const XLSX = require('xlsx');
const Database = require('duckdb-async').Database;
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

// Command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node import-excel-final.js <excel-file-path> [sheet-name]');
    console.log('Example: node import-excel-final.js ../data/1754473447790_Lawley_01082025.xlsx');
    process.exit(1);
}

const excelPath = path.resolve(args[0]);
const sheetName = args[1] || null;

// Validate file exists
if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found:', excelPath);
    process.exit(1);
}

async function importExcel() {
    console.log('🦆 DuckDB Excel Import (Final Version)');
    console.log('📄 File:', excelPath);
    console.log('📊 File size:', (fs.statSync(excelPath).size / 1024 / 1024).toFixed(2), 'MB');

    // Read Excel file
    console.log('\n📖 Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    
    // Get sheet
    const actualSheetName = sheetName || workbook.SheetNames[0];
    console.log('📋 Sheet:', actualSheetName);
    
    const worksheet = workbook.Sheets[actualSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: null
    });
    
    console.log(`✅ Read ${jsonData.length} rows from Excel`);
    
    if (jsonData.length === 0) {
        console.error('❌ No data found');
        process.exit(1);
    }
    
    // Show columns
    const columns = Object.keys(jsonData[0]);
    console.log(`\n📋 Found ${columns.length} columns`);
    
    // Show key columns if they exist
    const keyColumns = ['Property ID', 'Status', 'Pole Number', 'Drop Number', 'Location Address'];
    console.log('\n🔑 Key Columns:');
    keyColumns.forEach(col => {
        if (columns.includes(col)) {
            console.log(`   ✅ ${col}`);
        }
    });
    
    // Initialize DuckDB
    const db = await Database.create(DB_PATH);
    
    try {
        // Convert to CSV in memory (simpler approach)
        console.log('\n📥 Importing to DuckDB...');
        
        // Create CSV string
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        
        // Write to temporary CSV file
        const tempCsvPath = path.join(__dirname, '../data/temp_import.csv');
        fs.writeFileSync(tempCsvPath, csvContent);
        
        // Import using DuckDB's CSV reader
        await db.run(`
            CREATE OR REPLACE TABLE excel_import AS 
            SELECT * FROM read_csv_auto('${tempCsvPath}', header=true)
        `);
        
        // Remove temp file
        fs.unlinkSync(tempCsvPath);
        
        // Get count
        const countResult = await db.all('SELECT COUNT(*) as count FROM excel_import');
        console.log(`✅ Imported ${countResult[0].count} rows`);
        
        // Analyze data
        await analyzeData(db);
        
    } catch (error) {
        console.error('❌ Import error:', error.message);
    } finally {
        await db.close();
    }
}

async function analyzeData(db) {
    console.log('\n📊 Data Analysis:');
    
    try {
        // Get columns
        const columns = await db.all(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'excel_import'
        `);
        
        // Status distribution
        const statusCol = columns.find(c => c.column_name.toLowerCase().includes('status'));
        if (statusCol) {
            const statusDist = await db.all(`
                SELECT "${statusCol.column_name}" as status, COUNT(*) as count
                FROM excel_import
                GROUP BY status
                ORDER BY count DESC
                LIMIT 10
            `);
            console.log('\n📈 Status Distribution:');
            console.table(statusDist);
        }
        
        // Pole analysis
        const poleCol = columns.find(c => c.column_name === 'Pole Number');
        if (poleCol) {
            const poleStats = await db.all(`
                SELECT 
                    COUNT(DISTINCT "Pole Number") as unique_poles,
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN "Pole Number" IS NOT NULL THEN 1 END) as with_pole,
                    COUNT(CASE WHEN "Pole Number" IS NULL THEN 1 END) as without_pole
                FROM excel_import
            `);
            console.log('\n📍 Pole Statistics:');
            console.table(poleStats[0]);
        }
        
        // Drop analysis
        const dropCol = columns.find(c => c.column_name === 'Drop Number');
        if (dropCol) {
            const dropStats = await db.all(`
                SELECT 
                    COUNT(DISTINCT "Drop Number") as unique_drops,
                    COUNT(CASE WHEN "Drop Number" IS NOT NULL THEN 1 END) as with_drop
                FROM excel_import
            `);
            console.log('\n💧 Drop Statistics:');
            console.table(dropStats[0]);
        }
        
        // Date range
        const dateCol = columns.find(c => c.column_name === 'date_status_changed');
        if (dateCol) {
            const dateRange = await db.all(`
                SELECT 
                    MIN("date_status_changed") as earliest,
                    MAX("date_status_changed") as latest
                FROM excel_import
                WHERE "date_status_changed" IS NOT NULL
            `);
            console.log('\n📅 Date Range:');
            console.table(dateRange[0]);
        }
        
        console.log('\n✅ Import and analysis complete!');
        console.log('\n💡 Query examples:');
        console.log('   SELECT * FROM excel_import LIMIT 10;');
        console.log('   SELECT "Status", COUNT(*) FROM excel_import GROUP BY "Status";');
        console.log('   SELECT * FROM excel_import WHERE "Pole Number" = \'LAW.P.B167\';');
        
    } catch (error) {
        console.error('⚠️  Analysis error:', error.message);
    }
}

// Run import
importExcel().catch(console.error);