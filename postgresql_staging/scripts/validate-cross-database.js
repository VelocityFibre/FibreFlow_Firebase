const { Pool } = require('pg');
const Database = require('better-sqlite3');
const duckdb = require('duckdb');
const path = require('path');
const config = require('../config/database.json');

// PostgreSQL connection
const pgPool = new Pool(config.postgres);

// SQLite connection - correct path
const sqlitePath = path.join(__dirname, '../../OneMap/SQL/onemap.db');

// DuckDB connection
const duckPath = path.join(__dirname, '../../OneMap/DuckDB/data/onemap.duckdb');

async function validateAllDatabases() {
  console.log('=== CROSS-DATABASE VALIDATION ===\n');
  console.log('Comparing PostgreSQL, SQLite, and DuckDB imports...\n');
  
  // 1. PostgreSQL Statistics
  let pgStats = { total: 0, poles: 0, properties: 0 };
  try {
    const pgResult = await pgPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT pole_number) as poles,
        COUNT(DISTINCT property_id) as properties
      FROM onemap_lawley_raw
    `);
    pgStats = pgResult.rows[0];
    console.log('PostgreSQL Statistics:');
    console.log(`  Total records: ${pgStats.total.toLocaleString()}`);
    console.log(`  Unique poles: ${pgStats.poles.toLocaleString()}`);
    console.log(`  Unique properties: ${pgStats.properties.toLocaleString()}\n`);
  } catch (error) {
    console.error('PostgreSQL error:', error.message);
  }
  
  // 2. SQLite Statistics
  let sqliteStats = { total: 0, poles: 0, properties: 0 };
  try {
    const sqlite = new Database(sqlitePath, { readonly: true });
    
    // Find the correct table
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%lawley%' OR name LIKE '%import%' OR name LIKE '%excel%')").all();
    console.log('SQLite tables found:', tables.map(t => t.name).join(', '));
    
    if (tables.length > 0) {
      const tableName = tables[0].name;
      
      // Get column names
      const columns = sqlite.prepare(`PRAGMA table_info("${tableName}")`).all();
      const poleCol = columns.find(c => c.name.toLowerCase().includes('pole'))?.name || 'Pole Number';
      const propCol = columns.find(c => c.name.toLowerCase().includes('property'))?.name || 'Property ID';
      
      const stats = sqlite.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT "${poleCol}") as poles,
          COUNT(DISTINCT "${propCol}") as properties
        FROM "${tableName}"
      `).get();
      
      sqliteStats = stats;
      console.log(`\nSQLite Statistics (from ${tableName}):`);
      console.log(`  Total records: ${stats.total.toLocaleString()}`);
      console.log(`  Unique poles: ${stats.poles.toLocaleString()}`);
      console.log(`  Unique properties: ${stats.properties.toLocaleString()}\n`);
    }
    
    sqlite.close();
  } catch (error) {
    console.error('SQLite error:', error.message);
  }
  
  // 3. DuckDB Statistics
  let duckStats = { total: 0, poles: 0, properties: 0 };
  try {
    const db = new duckdb.Database(duckPath, { access_mode: 'READ_ONLY' });
    
    await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT "Pole Number") as poles,
          COUNT(DISTINCT "Property ID") as properties
        FROM excel_import
      `, (err, result) => {
        if (err) {
          console.log('DuckDB query error:', err.message);
          reject(err);
        } else if (result && result.length > 0) {
          duckStats = result[0];
          console.log('DuckDB Statistics:');
          console.log(`  Total records: ${result[0].total.toLocaleString()}`);
          console.log(`  Unique poles: ${result[0].poles.toLocaleString()}`);
          console.log(`  Unique properties: ${result[0].properties.toLocaleString()}\n`);
          resolve();
        } else {
          resolve();
        }
      });
    });
    
    db.close();
  } catch (error) {
    console.error('DuckDB error:', error.message);
  }
  
  // 4. Comparison Summary
  console.log('\n' + '='.repeat(60));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(60));
  console.log('Database    | Total Records | Unique Poles | Unique Properties');
  console.log('------------|---------------|--------------|------------------');
  console.log(`PostgreSQL  | ${String(pgStats.total).padStart(13)} | ${String(pgStats.poles).padStart(12)} | ${String(pgStats.properties).padStart(16)}`);
  console.log(`SQLite      | ${String(sqliteStats.total).padStart(13)} | ${String(sqliteStats.poles).padStart(12)} | ${String(sqliteStats.properties).padStart(16)}`);
  console.log(`DuckDB      | ${String(duckStats.total).padStart(13)} | ${String(duckStats.poles).padStart(12)} | ${String(duckStats.properties).padStart(16)}`);
  
  // Check if counts match
  console.log('\nValidation Results:');
  
  const poleDiff = Math.max(pgStats.poles, sqliteStats.poles, duckStats.poles) - 
                   Math.min(pgStats.poles, sqliteStats.poles, duckStats.poles);
  
  if (poleDiff <= 50) { // Allow small differences
    console.log('✅ Unique pole counts are consistent across all databases');
  } else {
    console.log(`⚠️  Pole count differences detected: ${poleDiff} poles`);
  }
  
  const propDiff = Math.max(pgStats.properties, sqliteStats.properties, duckStats.properties) - 
                   Math.min(pgStats.properties, sqliteStats.properties, duckStats.properties);
  
  if (propDiff <= 100) {
    console.log('✅ Unique property counts are consistent across all databases');
  } else {
    console.log(`⚠️  Property count differences detected: ${propDiff} properties`);
  }
  
  // Explain record count differences
  console.log('\nRecord Count Explanation:');
  console.log('- PostgreSQL has more records because it tracks daily status changes');
  console.log('- SQLite/DuckDB may have single records per property');
  console.log('- This is EXPECTED - PostgreSQL is designed for history tracking');
  
  await pgPool.end();
}

validateAllDatabases().catch(console.error);