#!/usr/bin/env node

/**
 * Sync SQLite OneMap Database to Neon PostgreSQL
 * 
 * This script syncs data from the local SQLite database to Neon
 * for comparison with Supabase.
 */

const Database = require('better-sqlite3');
const { neon } = require('@neondatabase/serverless');
const path = require('path');

// Configuration
const SQLITE_PATH = path.join(__dirname, '../../OneMap/SQL/onemap.db');
const NEON_CONNECTION = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

// Batch size for inserts
const BATCH_SIZE = 1000;

async function syncSQLiteToNeon() {
  console.log('🔄 Starting SQLite to Neon sync...\n');
  
  try {
    // Connect to SQLite
    console.log('📂 Opening SQLite database...');
    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    
    // Connect to Neon
    console.log('🔌 Connecting to Neon...');
    const sql = neon(NEON_CONNECTION);
    
    // Get SQLite tables
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log(`\n📊 Found ${tables.length} tables to sync:`);
    tables.forEach(t => console.log(`   - ${t.name}`));
    
    // Sync each table
    for (const table of tables) {
      await syncTable(sqlite, sql, table.name);
    }
    
    // Close SQLite connection
    sqlite.close();
    
    console.log('\n✅ Sync completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

async function syncTable(sqlite, neonSql, tableName) {
  console.log(`\n📋 Syncing table: ${tableName}`);
  
  try {
    // Get table schema from SQLite
    const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
    
    // Create table in Neon
    console.log('   Creating table structure...');
    const createTableSQL = generateCreateTableSQL(tableName, columns);
    await neonSql(createTableSQL);
    
    // Get row count
    const countResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    const totalRows = countResult.count;
    console.log(`   Total rows to sync: ${totalRows}`);
    
    if (totalRows === 0) {
      console.log('   No data to sync');
      return;
    }
    
    // Clear existing data (for fresh sync)
    console.log('   Clearing existing data...');
    await neonSql`DELETE FROM ${neonSql(tableName)}`;
    
    // Prepare insert statement
    const columnNames = columns.map(c => c.name).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    // Sync data in batches
    let offset = 0;
    let syncedRows = 0;
    
    while (offset < totalRows) {
      const rows = sqlite.prepare(`SELECT * FROM ${tableName} LIMIT ${BATCH_SIZE} OFFSET ${offset}`).all();
      
      if (rows.length === 0) break;
      
      // Batch insert
      for (const row of rows) {
        const values = columns.map(c => {
          const value = row[c.name];
          // Handle SQLite specific conversions
          if (value === null) return null;
          if (c.type.includes('TIMESTAMP') || c.type.includes('DATETIME')) {
            return value ? new Date(value) : null;
          }
          return value;
        });
        
        await neonSql(`INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`, values);
      }
      
      syncedRows += rows.length;
      offset += BATCH_SIZE;
      
      // Progress update
      const progress = Math.round((syncedRows / totalRows) * 100);
      process.stdout.write(`\r   Syncing progress: ${progress}% (${syncedRows}/${totalRows} rows)`);
    }
    
    console.log('\n   ✅ Table synced successfully');
    
  } catch (error) {
    console.error(`\n   ❌ Error syncing table ${tableName}:`, error.message);
    throw error;
  }
}

function generateCreateTableSQL(tableName, columns) {
  const columnDefs = columns.map(col => {
    let pgType = sqliteToPostgresType(col.type);
    let def = `${col.name} ${pgType}`;
    
    if (col.pk) def += ' PRIMARY KEY';
    if (col.notnull && !col.pk) def += ' NOT NULL';
    if (col.dflt_value !== null) {
      // Handle default values
      if (col.dflt_value === 'CURRENT_TIMESTAMP') {
        def += ' DEFAULT NOW()';
      } else {
        def += ` DEFAULT ${col.dflt_value}`;
      }
    }
    
    return def;
  }).join(',\n  ');
  
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      ${columnDefs}
    );
  `;
}

function sqliteToPostgresType(sqliteType) {
  const typeMap = {
    'INTEGER': 'INTEGER',
    'TEXT': 'TEXT',
    'REAL': 'DOUBLE PRECISION',
    'BLOB': 'BYTEA',
    'NUMERIC': 'NUMERIC',
    'BOOLEAN': 'BOOLEAN',
    'DATETIME': 'TIMESTAMP',
    'TIMESTAMP': 'TIMESTAMP',
    'DATE': 'DATE',
    'VARCHAR': 'VARCHAR'
  };
  
  // Extract base type
  const baseType = sqliteType.split('(')[0].toUpperCase();
  
  // Check if it has size specification
  if (sqliteType.includes('(') && sqliteType.includes(')')) {
    const size = sqliteType.match(/\(([^)]+)\)/)[1];
    if (baseType === 'VARCHAR') {
      return `VARCHAR(${size})`;
    }
  }
  
  return typeMap[baseType] || 'TEXT';
}

// Add summary report
async function generateSyncReport(neonSql) {
  console.log('\n📊 Generating sync report...\n');
  
  const tables = await neonSql`
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  
  console.log('Table Summary:');
  console.log('─'.repeat(50));
  
  for (const table of tables) {
    const count = await neonSql(`SELECT COUNT(*) as count FROM ${table.tablename}`);
    console.log(`${table.tablename.padEnd(30)} ${count[0].count.toString().padStart(10)} rows  ${table.size.padStart(10)}`);
  }
  
  console.log('─'.repeat(50));
}

// Check if required packages are installed
function checkDependencies() {
  try {
    require('better-sqlite3');
    require('@neondatabase/serverless');
  } catch (error) {
    console.error('❌ Missing dependencies. Please run:');
    console.error('   npm install better-sqlite3 @neondatabase/serverless');
    process.exit(1);
  }
}

// Main execution
checkDependencies();
syncSQLiteToNeon()
  .then(async () => {
    const sql = neon(NEON_CONNECTION);
    await generateSyncReport(sql);
  })
  .catch(console.error);