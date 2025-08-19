#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require');

async function quickCount() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM nokia_data`;
    console.log(`📊 Nokia records in database: ${result[0].count}`);
    
    if (parseInt(result[0].count) > 0) {
      const sample = await sql`SELECT drop_number, serial_number, status FROM nokia_data LIMIT 2`;
      console.log('📋 Sample data:');
      console.table(sample);
      console.log('\n✅ Data exists! The Nokia page should work now.');
      console.log('🌐 Try: https://fibreflow-73daf.web.app/nokia-data');
    } else {
      console.log('❌ No data found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickCount();