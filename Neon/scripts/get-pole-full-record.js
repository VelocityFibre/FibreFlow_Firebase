#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function getPoleFullRecord() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // First, let's get column names
    const columnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'status_changes' 
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('📋 TABLE STRUCTURE - status_changes table has these columns:');
    console.log('═══════════════════════════════════════════════════════════');
    columnsResult.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });
    
    // Now get all records for one specific pole
    const poleNumber = 'LAW.P.B167';
    console.log(`\n\n📍 FULL RECORDS FOR POLE: ${poleNumber}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const poleQuery = `
      SELECT * 
      FROM status_changes 
      WHERE pole_number = $1
      ORDER BY created_at DESC NULLS LAST, id DESC
    `;
    
    const poleResult = await client.query(poleQuery, [poleNumber]);
    
    if (poleResult.rows.length === 0) {
      console.log('No records found for this pole number.');
      return;
    }
    
    console.log(`Found ${poleResult.rows.length} record(s) for this pole:\n`);
    
    // Display each record
    poleResult.rows.forEach((record, index) => {
      console.log(`RECORD ${index + 1} of ${poleResult.rows.length}:`);
      console.log('─────────────────────────────────────────────────');
      
      // Display all fields
      Object.entries(record).forEach(([key, value]) => {
        // Format the value for display
        let displayValue = value;
        if (value === null) {
          displayValue = '[NULL]';
        } else if (value === '') {
          displayValue = '[EMPTY STRING]';
        } else if (typeof value === 'object') {
          displayValue = JSON.stringify(value);
        }
        
        console.log(`${key}: ${displayValue}`);
      });
      
      console.log('\n');
    });
    
    // Let's also check what different statuses exist in the data
    console.log('\n📊 ALL UNIQUE STATUSES IN THE DATABASE:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const statusQuery = `
      SELECT DISTINCT status, COUNT(*) as count
      FROM status_changes
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const statusResult = await client.query(statusQuery);
    statusResult.rows.forEach(row => {
      console.log(`   "${row.status}" - ${row.count} records`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

getPoleFullRecord().catch(console.error);