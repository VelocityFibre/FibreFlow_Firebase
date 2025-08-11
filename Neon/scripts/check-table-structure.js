#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function checkTableStructure() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Check status_changes table structure
    const columnsQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'status_changes' 
      ORDER BY ordinal_position
    `;
    
    const columns = await client.query(columnsQuery);
    
    console.log('📊 status_changes table structure:');
    console.log('Column Name | Data Type | Nullable | Default');
    console.log('─────────────────────────────────────────────────');
    
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
      const defaultVal = col.column_default || 'none';
      console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${nullable.padEnd(8)} | ${defaultVal}`);
    });
    
    // Check constraints
    const constraintsQuery = `
      SELECT 
        constraint_name,
        constraint_type,
        column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'status_changes'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    `;
    
    const constraints = await client.query(constraintsQuery);
    
    if (constraints.rows.length > 0) {
      console.log('\n🔐 Table Constraints:');
      constraints.rows.forEach(constraint => {
        console.log(`   ${constraint.constraint_type}: ${constraint.column_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTableStructure().catch(console.error);