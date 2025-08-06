#!/usr/bin/env node

const Database = require('duckdb-async').Database;
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

async function checkDatabaseStatus() {
    console.log('📊 DuckDB Database Status Check\n');
    console.log('=' .repeat(60));
    
    const db = await Database.create(DB_PATH);
    
    try {
        // Check what tables exist
        const tables = await db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'main'
        `);
        
        console.log('\n📋 Tables in database:');
        if (tables.length === 0) {
            console.log('  No tables found');
        } else {
            tables.forEach(table => {
                console.log(`  - ${table.table_name}`);
            });
        }
        
        // Check each import table if it exists
        const importTables = ['aug1_import', 'aug2_import', 'aug3_import', 'backwards_progressions'];
        
        for (const tableName of importTables) {
            try {
                const count = await db.all(`SELECT COUNT(*) as count FROM ${tableName}`);
                console.log(`\n📊 ${tableName}: ${count[0].count} records`);
                
                if (tableName.includes('aug') && count[0].count > 0) {
                    // Show sample to verify data
                    const sample = await db.all(`
                        SELECT "Property ID", "Status", "Pole Number", "Date" 
                        FROM ${tableName} 
                        LIMIT 3
                    `);
                    console.log('  Sample data:');
                    sample.forEach((row, idx) => {
                        console.log(`    ${idx + 1}. Property ${row['Property ID']}: ${row['Status']} (${row['Pole Number'] || 'No pole'})`);
                    });
                }
                
                if (tableName === 'backwards_progressions' && count[0].count > 0) {
                    const sample = await db.all(`
                        SELECT property_id, old_status, new_status, pole_number, comparison_period
                        FROM ${tableName} 
                        LIMIT 5
                    `);
                    console.log('  Backwards progressions:');
                    sample.forEach((row, idx) => {
                        console.log(`    ${idx + 1}. Property ${row.property_id}: ${row.old_status} → ${row.new_status} (${row.comparison_period})`);
                    });
                }
                
            } catch (error) {
                console.log(`\n❌ ${tableName}: Table does not exist`);
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ Database status check complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.close();
    }
}

checkDatabaseStatus().catch(console.error);