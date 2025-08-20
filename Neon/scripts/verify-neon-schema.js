#!/usr/bin/env node

/**
 * Verify actual Neon database schema
 * Direct connection to see real table structure
 */

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

async function verifySchema() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to Neon database\n');
    
    // Get all tables
    console.log('📋 ALL TABLES IN DATABASE:');
    console.log('═'.repeat(60));
    
    const tablesResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach(row => {
      console.log(`• ${row.table_name} (${row.table_type})`);
    });
    
    // Main tables to inspect
    const mainTables = ['status_changes', 'status_history', 'import_batches', 'onemap_status_history'];
    
    for (const tableName of mainTables) {
      console.log(`\n\n📊 TABLE: ${tableName}`);
      console.log('═'.repeat(60));
      
      // Get columns
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      if (columnsResult.rows.length === 0) {
        console.log('❌ Table not found');
        continue;
      }
      
      console.log('\nColumns:');
      console.log('─'.repeat(60));
      columnsResult.rows.forEach(col => {
        const type = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type;
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`• ${col.column_name}: ${type} ${nullable}`);
      });
      
      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`\nRow count: ${countResult.rows[0].count}`);
      
      // Get sample data
      const sampleResult = await client.query(`SELECT * FROM ${tableName} LIMIT 2`);
      if (sampleResult.rows.length > 0) {
        console.log('\nSample record:');
        console.log(JSON.stringify(sampleResult.rows[0], null, 2));
      }
    }
    
    console.log('\n\n✅ Schema verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifySchema().catch(console.error);