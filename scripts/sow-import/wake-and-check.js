#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function wakeAndCheck() {
  console.log('🚀 Waking up Neon database...\n');
  
  try {
    // Simple query to wake up the database
    const wakeup = await sql`SELECT 1 as wake`;
    console.log('✅ Database is awake!\n');
    
    // Check SOW tables
    console.log('📊 Current SOW Data Status:');
    console.log('=' .repeat(40));
    
    const counts = await sql`
      SELECT 
        'sow_poles' as table_name, 
        COUNT(*) as row_count
      FROM sow_poles
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      UNION ALL
      SELECT 
        'sow_drops' as table_name, 
        COUNT(*) as row_count
      FROM sow_drops
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      UNION ALL
      SELECT 
        'sow_fibre' as table_name, 
        COUNT(*) as row_count
      FROM sow_fibre
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
    `;
    
    counts.forEach(row => {
      console.log(`${row.table_name}: ${row.row_count} records`);
    });
    
    // Check if we have partial data from previous imports
    const lastPole = await sql`
      SELECT pole_number, created_date 
      FROM sow_poles 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      ORDER BY created_date DESC 
      LIMIT 1
    `;
    
    if (lastPole.length > 0) {
      console.log(`\nLast imported pole: ${lastPole[0].pole_number}`);
      console.log(`Import time: ${lastPole[0].created_date}`);
    }
    
    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nThe database might be suspended or the connection string might need updating.');
  }
}

wakeAndCheck();