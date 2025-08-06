#!/usr/bin/env node

const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

// Command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node import-excel.js <excel-file-path> [sheet-name]');
    console.log('Example: node import-excel.js ../data/OneMap_May_2025.xlsx "Sheet1"');
    process.exit(1);
}

const excelPath = path.resolve(args[0]);
const sheetName = args[1] || 'Sheet1';

// Validate file exists
if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found:', excelPath);
    process.exit(1);
}

console.log('🦆 DuckDB Excel Import Tool');
console.log('📄 File:', excelPath);
console.log('📋 Sheet:', sheetName);

// Initialize database
const db = new duckdb.Database(DB_PATH);
const conn = db.connect();

async function importExcel() {
    const startTime = Date.now();
    let batchId;
    
    try {
        // Create import batch record using callback-based API
        await new Promise((resolve, reject) => {
            conn.run(`
                INSERT INTO import_batches (file_name, file_path, status)
                VALUES (?, ?, 'processing')
            `, [path.basename(excelPath), excelPath], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Get the last inserted batch_id
        const result = await new Promise((resolve, reject) => {
            conn.all(`
                SELECT MAX(batch_id) as batch_id FROM import_batches
            `, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
        
        batchId = result[0].batch_id;
        console.log('📦 Import batch ID:', batchId);

        // Load Excel extension if not already loaded
        await conn.run("LOAD excel");

        // First, let's examine the Excel file structure
        console.log('\n🔍 Analyzing Excel file structure...');
        const preview = await conn.all(`
            SELECT * FROM read_excel('${excelPath}', sheet='${sheetName}', header=true)
            LIMIT 5
        `);
        
        if (preview.length > 0) {
            console.log('📊 Columns found:', Object.keys(preview[0]).join(', '));
            console.log(`📈 Preview of first ${preview.length} rows:`);
            console.table(preview);
        }

        // Import data into raw_imports table
        console.log('\n📥 Importing data...');
        
        // Map Excel columns to database columns
        // Adjust these mappings based on your actual Excel structure
        const importQuery = `
            INSERT INTO raw_imports (
                property_id,
                address,
                suburb,
                pole_number,
                drop_number,
                status,
                status_date,
                agent,
                notes,
                import_batch_id,
                file_name,
                row_number
            )
            SELECT 
                "Property ID" as property_id,
                "Address" as address,
                "Suburb" as suburb,
                "Pole Number" as pole_number,
                "Drop Number" as drop_number,
                "Status" as status,
                TRY_CAST("Status Date" AS DATE) as status_date,
                "Agent" as agent,
                "Notes" as notes,
                ${batchId} as import_batch_id,
                '${path.basename(excelPath)}' as file_name,
                row_number() OVER () as row_number
            FROM read_excel('${excelPath}', sheet='${sheetName}', header=true)
        `;

        await conn.run(importQuery);

        // Get import statistics
        const stats = await conn.all(`
            SELECT 
                COUNT(*) as total_rows,
                COUNT(DISTINCT property_id) as unique_properties,
                COUNT(DISTINCT pole_number) as unique_poles,
                COUNT(DISTINCT agent) as unique_agents
            FROM raw_imports
            WHERE import_batch_id = ?
        `, [batchId]);

        console.log('\n📊 Import Statistics:');
        console.table(stats[0]);

        // Process imported data
        console.log('\n🔄 Processing imported data...');
        await processImportedData(conn, batchId);

        // Update batch status
        const processingTime = Date.now() - startTime;
        await conn.run(`
            UPDATE import_batches
            SET status = 'completed',
                total_rows = ?,
                processed_rows = ?,
                processing_time_ms = ?
            WHERE batch_id = ?
        `, [stats[0].total_rows, stats[0].total_rows, processingTime, batchId]);

        console.log(`\n✅ Import completed successfully in ${processingTime}ms`);

        // Show summary
        await showSummary(conn, batchId);

    } catch (error) {
        console.error('❌ Import error:', error);
        
        if (batchId) {
            await conn.run(`
                UPDATE import_batches
                SET status = 'failed',
                    error_log = ?
                WHERE batch_id = ?
            `, [error.toString(), batchId]);
        }
        
        process.exit(1);
    } finally {
        conn.close();
        db.close();
    }
}

async function processImportedData(conn, batchId) {
    // Insert or update processed_data table
    await conn.run(`
        INSERT INTO processed_data (
            property_id,
            address,
            suburb,
            pole_number,
            drop_number,
            current_status,
            current_status_date,
            first_status,
            first_status_date,
            agent,
            notes
        )
        SELECT 
            property_id,
            address,
            suburb,
            pole_number,
            drop_number,
            status,
            status_date,
            status,
            status_date,
            agent,
            notes
        FROM raw_imports
        WHERE import_batch_id = ?
        ON CONFLICT (property_id) DO UPDATE SET
            current_status = EXCLUDED.current_status,
            current_status_date = EXCLUDED.current_status_date,
            agent = EXCLUDED.agent,
            notes = EXCLUDED.notes,
            last_updated = CURRENT_TIMESTAMP
    `, [batchId]);

    // Insert into status history
    await conn.run(`
        INSERT INTO status_history (
            property_id,
            status,
            status_date,
            agent,
            notes,
            import_batch_id
        )
        SELECT 
            property_id,
            status,
            status_date,
            agent,
            notes,
            import_batch_id
        FROM raw_imports
        WHERE import_batch_id = ?
    `, [batchId]);

    console.log('✅ Data processing completed');
}

async function showSummary(conn, batchId) {
    console.log('\n📊 Import Summary:');
    
    // Status breakdown
    const statusBreakdown = await conn.all(`
        SELECT 
            status,
            COUNT(*) as count
        FROM raw_imports
        WHERE import_batch_id = ?
        GROUP BY status
        ORDER BY count DESC
    `, [batchId]);
    
    console.log('\n📈 Status Breakdown:');
    console.table(statusBreakdown);

    // Agent summary
    const agentSummary = await conn.all(`
        SELECT 
            agent,
            COUNT(*) as properties,
            COUNT(DISTINCT pole_number) as poles
        FROM raw_imports
        WHERE import_batch_id = ?
        GROUP BY agent
        ORDER BY properties DESC
        LIMIT 10
    `, [batchId]);
    
    console.log('\n👥 Top 10 Agents:');
    console.table(agentSummary);

    // Date range
    const dateRange = await conn.all(`
        SELECT 
            MIN(status_date) as earliest_date,
            MAX(status_date) as latest_date,
            COUNT(DISTINCT status_date) as unique_dates
        FROM raw_imports
        WHERE import_batch_id = ?
    `, [batchId]);
    
    console.log('\n📅 Date Range:');
    console.table(dateRange[0]);
}

// Run import
importExcel();