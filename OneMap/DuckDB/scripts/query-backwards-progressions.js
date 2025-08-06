#!/usr/bin/env node

const Database = require('duckdb-async').Database;
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

async function queryBackwardsProgressions() {
    console.log('🔍 Querying backwards progressions table...\n');
    
    const db = await Database.create(DB_PATH);
    
    try {
        const results = await db.all(`
            SELECT 
                property_id,
                pole_number,
                drop_number,
                old_status,
                new_status,
                old_status_order,
                new_status_order,
                agent_name,
                comparison_period,
                date_detected
            FROM backwards_progressions
            ORDER BY property_id
        `);
        
        console.log(`Found ${results.length} backwards progressions:\n`);
        
        results.forEach((row, idx) => {
            console.log(`${idx + 1}. Property ${row.property_id}:`);
            console.log(`   Pole: ${row.pole_number || 'Not assigned'}`);
            console.log(`   Drop: ${row.drop_number || 'Not assigned'}`);
            console.log(`   Status: ${row.old_status} (${row.old_status_order}) → ${row.new_status} (${row.new_status_order})`);
            console.log(`   Agent: ${row.agent_name || 'Unknown'}`);
            console.log(`   Period: ${row.comparison_period}`);
            console.log(`   Date: ${row.date_detected}\n`);
        });
        
        // Also show table structure
        console.log('📊 Table structure:');
        const tableInfo = await db.all(`PRAGMA table_info('backwards_progressions')`);
        console.table(tableInfo);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.close();
    }
}

queryBackwardsProgressions().catch(console.error);