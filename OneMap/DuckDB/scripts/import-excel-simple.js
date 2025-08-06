#!/usr/bin/env node

const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

// Command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node import-excel-simple.js <excel-file-path> [sheet-name]');
    console.log('Example: node import-excel-simple.js ../data/OneMap_May_2025.xlsx "Sheet1"');
    process.exit(1);
}

const excelPath = path.resolve(args[0]);
const sheetName = args[1] || 'Sheet1';

// Validate file exists
if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found:', excelPath);
    process.exit(1);
}

console.log('🦆 DuckDB Excel Import Tool (Simplified)');
console.log('📄 File:', excelPath);
console.log('📋 Sheet:', sheetName);

// Initialize database
const db = new duckdb.Database(DB_PATH);

db.all("LOAD excel", (err) => {
    if (err) {
        console.error('❌ Failed to load Excel extension:', err);
        return;
    }
    
    console.log('✅ Excel extension loaded');
    
    // First, examine the Excel file
    console.log('\n🔍 Analyzing Excel file structure...');
    
    const previewQuery = `
        SELECT * FROM read_excel('${excelPath.replace(/'/g, "''")}', 
            sheet='${sheetName}', 
            header=true
        ) 
        LIMIT 5
    `;
    
    db.all(previewQuery, (err, preview) => {
        if (err) {
            console.error('❌ Error reading Excel file:', err);
            db.close();
            return;
        }
        
        if (preview.length > 0) {
            console.log('📊 Columns found:', Object.keys(preview[0]).join(', '));
            console.log(`📈 Preview of first ${preview.length} rows:`);
            console.table(preview);
        }
        
        // Get total row count
        const countQuery = `
            SELECT COUNT(*) as total_rows 
            FROM read_excel('${excelPath.replace(/'/g, "''")}', 
                sheet='${sheetName}', 
                header=true
            )
        `;
        
        db.get(countQuery, (err, countResult) => {
            if (err) {
                console.error('❌ Error counting rows:', err);
                db.close();
                return;
            }
            
            console.log(`\n📊 Total rows in Excel: ${countResult.total_rows}`);
            
            // Import into raw table (simplified)
            console.log('\n📥 Importing data into DuckDB...');
            
            const importQuery = `
                CREATE OR REPLACE TABLE excel_import AS
                SELECT * FROM read_excel('${excelPath.replace(/'/g, "''")}', 
                    sheet='${sheetName}', 
                    header=true
                )
            `;
            
            db.run(importQuery, (err) => {
                if (err) {
                    console.error('❌ Import failed:', err);
                    db.close();
                    return;
                }
                
                console.log('✅ Data imported successfully!');
                
                // Show summary statistics
                showSummaryStats(db);
            });
        });
    });
});

function showSummaryStats(db) {
    console.log('\n📊 Summary Statistics:');
    
    // Get column information
    db.all("DESCRIBE excel_import", (err, columns) => {
        if (err) {
            console.error('❌ Error getting columns:', err);
            return;
        }
        
        console.log('\n📋 Table Columns:');
        console.table(columns);
        
        // Get row count
        db.get("SELECT COUNT(*) as total_rows FROM excel_import", (err, result) => {
            if (err) {
                console.error('❌ Error counting rows:', err);
                return;
            }
            
            console.log(`\n📈 Total rows imported: ${result.total_rows}`);
            
            // Show sample data
            db.all("SELECT * FROM excel_import LIMIT 10", (err, sample) => {
                if (err) {
                    console.error('❌ Error getting sample:', err);
                    return;
                }
                
                console.log('\n📄 Sample Data (first 10 rows):');
                console.table(sample);
                
                // Try to show some aggregate stats if we can identify columns
                tryShowAggregates(db, columns);
            });
        });
    });
}

function tryShowAggregates(db, columns) {
    console.log('\n📊 Aggregate Statistics:');
    
    // Look for common column names
    const columnNames = columns.map(c => c.column_name.toLowerCase());
    
    // Count by status if exists
    if (columnNames.some(name => name.includes('status'))) {
        const statusCol = columns.find(c => c.column_name.toLowerCase().includes('status')).column_name;
        db.all(`
            SELECT "${statusCol}" as status, COUNT(*) as count 
            FROM excel_import 
            GROUP BY "${statusCol}" 
            ORDER BY count DESC
            LIMIT 20
        `, (err, results) => {
            if (!err && results.length > 0) {
                console.log(`\n📈 Count by ${statusCol}:`);
                console.table(results);
            }
        });
    }
    
    // Count by agent if exists
    if (columnNames.some(name => name.includes('agent'))) {
        const agentCol = columns.find(c => c.column_name.toLowerCase().includes('agent')).column_name;
        db.all(`
            SELECT "${agentCol}" as agent, COUNT(*) as count 
            FROM excel_import 
            WHERE "${agentCol}" IS NOT NULL
            GROUP BY "${agentCol}" 
            ORDER BY count DESC
            LIMIT 10
        `, (err, results) => {
            if (!err && results.length > 0) {
                console.log(`\n👥 Top 10 by ${agentCol}:`);
                console.table(results);
            }
        });
    }
    
    // Date range if date column exists
    if (columnNames.some(name => name.includes('date'))) {
        const dateCol = columns.find(c => c.column_name.toLowerCase().includes('date')).column_name;
        db.get(`
            SELECT 
                MIN("${dateCol}") as earliest_date,
                MAX("${dateCol}") as latest_date
            FROM excel_import
            WHERE "${dateCol}" IS NOT NULL
        `, (err, result) => {
            if (!err) {
                console.log(`\n📅 Date Range (${dateCol}):`);
                console.log(`   Earliest: ${result.earliest_date}`);
                console.log(`   Latest: ${result.latest_date}`);
            }
            
            // Close database after all queries
            setTimeout(() => {
                console.log('\n✅ Analysis complete!');
                console.log('💡 To query the data:');
                console.log('   duckdb OneMap/DuckDB/data/onemap.duckdb');
                console.log('   SELECT * FROM excel_import LIMIT 10;');
                db.close();
            }, 1000);
        });
    } else {
        // Close if no date column
        setTimeout(() => {
            console.log('\n✅ Analysis complete!');
            db.close();
        }, 1000);
    }
}