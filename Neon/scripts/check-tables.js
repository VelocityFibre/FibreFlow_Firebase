#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function checkTables() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Check what tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('📊 Existing Tables:');
    tables.rows.forEach(row => console.log(`   ${row.table_name}`));
    
    // Check import_batches table structure if it exists
    const batchTableExists = tables.rows.some(row => row.table_name === 'import_batches');
    
    if (batchTableExists) {
      console.log('\n📋 import_batches table structure:');
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'import_batches' 
        ORDER BY ordinal_position
      `;
      
      const columns = await client.query(columnsQuery);
      columns.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Add missing columns
      console.log('\n🔧 Adding missing columns to import_batches...');
      
      const missingColumns = [
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS import_user TEXT',
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS total_rows INTEGER',
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS new_records INTEGER',
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS updated_records INTEGER',
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS skipped_records INTEGER',
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS error_records INTEGER',
        'ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS validation_errors JSONB'
      ];
      
      for (const alterQuery of missingColumns) {
        try {
          await client.query(alterQuery);
          console.log(`   ✅ ${alterQuery.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1] || 'column'}`);
        } catch (error) {
          console.log(`   ⚠️  ${error.message}`);
        }
      }
    } else {
      console.log('\n📋 import_batches table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables().catch(console.error);