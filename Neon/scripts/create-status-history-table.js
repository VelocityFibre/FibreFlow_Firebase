#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function createStatusHistoryTable() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Check if status_history table exists and has correct structure
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'status_history' 
      ORDER BY ordinal_position
    `;
    
    const columns = await client.query(columnsQuery);
    
    if (columns.rows.length > 0) {
      console.log('📋 Existing status_history table structure:');
      columns.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if we have the columns we need
      const columnNames = columns.rows.map(row => row.column_name);
      const requiredColumns = ['property_id', 'pole_number', 'old_status', 'new_status', 'changed_at', 'import_batch_id'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('\n🔧 Adding missing columns:');
        for (const col of missingColumns) {
          let alterQuery = '';
          switch (col) {
            case 'property_id':
              alterQuery = 'ALTER TABLE status_history ADD COLUMN IF NOT EXISTS property_id TEXT NOT NULL';
              break;
            case 'pole_number':
              alterQuery = 'ALTER TABLE status_history ADD COLUMN IF NOT EXISTS pole_number TEXT';
              break;
            case 'old_status':
              alterQuery = 'ALTER TABLE status_history ADD COLUMN IF NOT EXISTS old_status TEXT';
              break;
            case 'new_status':
              alterQuery = 'ALTER TABLE status_history ADD COLUMN IF NOT EXISTS new_status TEXT';
              break;
            case 'changed_at':
              alterQuery = 'ALTER TABLE status_history ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP DEFAULT NOW()';
              break;
            case 'import_batch_id':
              alterQuery = 'ALTER TABLE status_history ADD COLUMN IF NOT EXISTS import_batch_id TEXT';
              break;
          }
          
          if (alterQuery) {
            try {
              await client.query(alterQuery);
              console.log(`   ✅ Added ${col}`);
            } catch (error) {
              console.log(`   ⚠️  ${col}: ${error.message}`);
            }
          }
        }
      } else {
        console.log('\n✅ status_history table has all required columns');
      }
      
    } else {
      console.log('📋 status_history table does not exist, creating...');
      
      const createTable = `
        CREATE TABLE status_history (
          id BIGSERIAL PRIMARY KEY,
          property_id TEXT NOT NULL,
          pole_number TEXT,
          old_status TEXT,
          new_status TEXT,
          changed_by TEXT,
          changed_at TIMESTAMP DEFAULT NOW(),
          import_batch_id TEXT,
          change_details JSONB
        )
      `;
      
      await client.query(createTable);
      console.log('✅ Created status_history table');
      
      // Create indexes
      const indexes = [
        'CREATE INDEX idx_status_history_property_id ON status_history (property_id)',
        'CREATE INDEX idx_status_history_pole_number ON status_history (pole_number)',
        'CREATE INDEX idx_status_history_changed_at ON status_history (changed_at)'
      ];
      
      for (const indexQuery of indexes) {
        try {
          await client.query(indexQuery);
          console.log(`   ✅ Created index`);
        } catch (error) {
          console.log(`   ⚠️  Index: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createStatusHistoryTable().catch(console.error);