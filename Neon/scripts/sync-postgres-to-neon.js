#!/usr/bin/env node

/**
 * Sync data from local PostgreSQL to Neon
 * This script uses pg package to connect to both databases
 */

const { Client } = require('pg');
const { neon } = require('@neondatabase/serverless');

// Configuration - UPDATE THESE FOR YOUR LOCAL SETUP
const LOCAL_PG_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'onemap',      // Change to your database name
  user: 'postgres',        // Change to your PostgreSQL user
  password: ''             // Add password if needed
};

const NEON_CONNECTION = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function syncPostgresToNeon() {
  console.log('🔄 PostgreSQL to Neon Sync\n');
  
  // Connect to local PostgreSQL
  const localClient = new Client(LOCAL_PG_CONFIG);
  const neonSql = neon(NEON_CONNECTION);
  
  try {
    console.log('📂 Connecting to local PostgreSQL...');
    await localClient.connect();
    console.log('✅ Connected to local PostgreSQL\n');
    
    // Get list of tables
    const tablesResult = await localClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    const tables = tablesResult.rows.map(r => r.tablename);
    console.log(`Found ${tables.length} tables to sync:`);
    tables.forEach(t => console.log(`  - ${t}`));
    console.log('');
    
    // Ask user which tables to sync
    console.log('Syncing all tables...\n');
    
    for (const table of tables) {
      await syncTable(localClient, neonSql, table);
    }
    
    console.log('\n✅ Sync completed successfully!');
    
    // Show summary
    await showNeonSummary(neonSql);
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  } finally {
    await localClient.end();
  }
}

async function syncTable(localClient, neonSql, tableName) {
  console.log(`📋 Syncing table: ${tableName}`);
  
  try {
    // Get table structure
    const columnsResult = await localClient.query(`
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
    
    const columns = columnsResult.rows;
    
    // Create table in Neon
    console.log('  Creating table structure...');
    const createTableSQL = generateCreateTableSQL(tableName, columns);
    
    // Drop table if exists
    await neonSql(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    await neonSql(createTableSQL);
    
    // Get row count
    const countResult = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    const totalRows = parseInt(countResult.rows[0].count);
    console.log(`  Total rows to sync: ${totalRows}`);
    
    if (totalRows === 0) {
      console.log('  No data to sync\n');
      return;
    }
    
    // Copy data in batches
    const BATCH_SIZE = 1000;
    let offset = 0;
    let syncedRows = 0;
    
    while (offset < totalRows) {
      const dataResult = await localClient.query(
        `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      );
      
      for (const row of dataResult.rows) {
        const columnNames = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await neonSql(
          `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
      
      syncedRows += dataResult.rows.length;
      offset += BATCH_SIZE;
      
      const progress = Math.round((syncedRows / totalRows) * 100);
      process.stdout.write(`\r  Progress: ${progress}% (${syncedRows}/${totalRows} rows)`);
    }
    
    console.log('\n  ✅ Table synced successfully\n');
    
  } catch (error) {
    console.error(`  ❌ Error syncing table ${tableName}:`, error.message);
  }
}

function generateCreateTableSQL(tableName, columns) {
  const columnDefs = columns.map(col => {
    let def = `${col.column_name} ${col.data_type}`;
    
    if (col.character_maximum_length) {
      def = `${col.column_name} ${col.data_type}(${col.character_maximum_length})`;
    }
    
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }
    
    return def;
  }).join(',\n  ');
  
  return `CREATE TABLE ${tableName} (\n  ${columnDefs}\n)`;
}

async function showNeonSummary(neonSql) {
  console.log('\n📊 Neon Database Summary:');
  console.log('─'.repeat(50));
  
  const tables = await neonSql(`
    SELECT 
      tablename,
      pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  
  for (const table of tables) {
    const countResult = await neonSql(`SELECT COUNT(*) as count FROM ${table.tablename}`);
    const count = countResult[0].count;
    console.log(`${table.tablename.padEnd(30)} ${count.toString().padStart(10)} rows  ${table.size.padStart(10)}`);
  }
  
  console.log('─'.repeat(50));
}

// Check if pg package is installed
try {
  require('pg');
} catch (error) {
  console.error('❌ Missing pg package. Please run:');
  console.error('   npm install pg');
  process.exit(1);
}

// Run sync
console.log('🔔 Note: Make sure your local PostgreSQL is running and contains the OneMap data\n');
console.log('Current configuration:');
console.log(`  Host: ${LOCAL_PG_CONFIG.host}`);
console.log(`  Port: ${LOCAL_PG_CONFIG.port}`);
console.log(`  Database: ${LOCAL_PG_CONFIG.database}`);
console.log(`  User: ${LOCAL_PG_CONFIG.user}\n`);
console.log('Update the configuration in this script if needed.\n');

syncPostgresToNeon();