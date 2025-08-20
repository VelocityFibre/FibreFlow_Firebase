#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require');

async function checkSchema() {
  try {
    // Check status_changes columns
    console.log('📊 status_changes table columns:');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'status_changes' 
      ORDER BY ordinal_position
    `;
    
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Sample data
    console.log('\n📝 Sample data from status_changes:');
    const sample = await sql`
      SELECT * FROM status_changes 
      WHERE property_id IS NOT NULL 
      LIMIT 1
    `;
    
    if (sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();