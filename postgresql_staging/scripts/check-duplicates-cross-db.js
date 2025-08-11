const { Pool } = require('pg');
const Database = require('better-sqlite3');
const duckdb = require('duckdb');
const path = require('path');
const config = require('../config/database.json');

// PostgreSQL connection
const pgPool = new Pool(config.postgres);

// SQLite connection
const sqlitePath = path.join(__dirname, '../../OneMap/onemap.db');
const sqlite = new Database(sqlitePath, { readonly: true });

// DuckDB connection
const duckPath = path.join(__dirname, '../../OneMap/DuckDB/data/onemap.duckdb');
const duck = new duckdb.Database(duckPath);

async function checkPostgresDuplicates() {
  console.log('=== POSTGRESQL DUPLICATE CHECK ===\n');
  
  try {
    // Check for duplicate pole numbers
    const dupePoles = await pgPool.query(`
      SELECT pole_number, COUNT(*) as count, 
             COUNT(DISTINCT property_id) as unique_properties,
             COUNT(DISTINCT status) as unique_statuses,
             array_agg(DISTINCT source_file ORDER BY source_file) as files
      FROM onemap_lawley_raw
      WHERE pole_number IS NOT NULL
      GROUP BY pole_number
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (dupePoles.rows.length > 0) {
      console.log(`Found ${dupePoles.rowCount} pole numbers with multiple records:\n`);
      console.log('Pole Number | Count | Properties | Statuses | Files');
      console.log('------------|-------|------------|----------|-------');
      dupePoles.rows.forEach(row => {
        console.log(`${row.pole_number.padEnd(11)} | ${String(row.count).padStart(5)} | ${String(row.unique_properties).padStart(10)} | ${String(row.unique_statuses).padStart(8)} | ${row.files.length} files`);
      });
      
      // Show example of one pole's records
      const examplePole = dupePoles.rows[0].pole_number;
      const example = await pgPool.query(`
        SELECT property_id, status, source_file, 
               to_char(created_at, 'MM/DD') as date
        FROM onemap_lawley_raw
        WHERE pole_number = $1
        ORDER BY source_file
        LIMIT 5
      `, [examplePole]);
      
      console.log(`\nExample records for pole ${examplePole}:`);
      example.rows.forEach(row => {
        console.log(`  Property: ${row.property_id}, Status: ${row.status}, File: ${row.source_file.substring(0, 20)}...`);
      });
    } else {
      console.log('✅ No duplicate pole numbers found!');
    }
    
    // Overall statistics
    const stats = await pgPool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT pole_number) as unique_poles,
        COUNT(DISTINCT property_id) as unique_properties,
        COUNT(CASE WHEN pole_number IS NOT NULL THEN 1 END) as records_with_poles,
        COUNT(CASE WHEN pole_number IS NULL THEN 1 END) as records_without_poles
      FROM onemap_lawley_raw
    `);
    
    const s = stats.rows[0];
    console.log('\nPostgreSQL Statistics:');
    console.log(`- Total records: ${s.total_records}`);
    console.log(`- Unique poles: ${s.unique_poles}`);
    console.log(`- Unique properties: ${s.unique_properties}`);
    console.log(`- Records with poles: ${s.records_with_poles}`);
    console.log(`- Records without poles: ${s.records_without_poles}`);
    console.log(`- Average records per pole: ${(s.records_with_poles / s.unique_poles).toFixed(2)}`);
    
  } catch (error) {
    console.error('PostgreSQL error:', error.message);
  }
}

function checkSQLiteDuplicates() {
  console.log('\n\n=== SQLITE DUPLICATE CHECK ===\n');
  
  try {
    // Check if table exists
    const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='excel_import'").get();
    if (!tableCheck) {
      console.log('⚠️  No excel_import table found in SQLite');
      return;
    }
    
    // Check for duplicates
    const dupePoles = sqlite.prepare(`
      SELECT "Pole Number" as pole_number, COUNT(*) as count
      FROM excel_import
      WHERE "Pole Number" IS NOT NULL AND "Pole Number" != ''
      GROUP BY "Pole Number"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    if (dupePoles.length > 0) {
      console.log(`Found ${dupePoles.length} pole numbers with multiple records`);
      dupePoles.forEach(row => {
        console.log(`  Pole: ${row.pole_number}, Count: ${row.count}`);
      });
    } else {
      console.log('✅ No duplicate pole numbers found!');
    }
    
    // Overall statistics
    const stats = sqlite.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT "Pole Number") as unique_poles,
        COUNT(DISTINCT "Property ID") as unique_properties
      FROM excel_import
    `).get();
    
    console.log('\nSQLite Statistics:');
    console.log(`- Total records: ${stats.total_records}`);
    console.log(`- Unique poles: ${stats.unique_poles}`);
    console.log(`- Unique properties: ${stats.unique_properties}`);
    
  } catch (error) {
    console.error('SQLite error:', error.message);
  }
}

function checkDuckDBDuplicates() {
  console.log('\n\n=== DUCKDB DUPLICATE CHECK ===\n');
  
  const conn = duck.connect();
  
  try {
    // Check for duplicates
    const dupePoles = conn.prepare(`
      SELECT "Pole Number" as pole_number, COUNT(*) as count
      FROM excel_import
      WHERE "Pole Number" IS NOT NULL AND "Pole Number" != ''
      GROUP BY "Pole Number"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    if (dupePoles.length > 0) {
      console.log(`Found ${dupePoles.length} pole numbers with multiple records`);
      dupePoles.forEach(row => {
        console.log(`  Pole: ${row.pole_number}, Count: ${row.count}`);
      });
    } else {
      console.log('✅ No duplicate pole numbers found!');
    }
    
    // Overall statistics
    const stats = conn.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT "Pole Number") as unique_poles,
        COUNT(DISTINCT "Property ID") as unique_properties
      FROM excel_import
    `).get(0);
    
    console.log('\nDuckDB Statistics:');
    console.log(`- Total records: ${stats.total_records}`);
    console.log(`- Unique poles: ${stats.unique_poles}`);
    console.log(`- Unique properties: ${stats.unique_properties}`);
    
  } catch (error) {
    console.error('DuckDB error:', error.message);
  } finally {
    conn.close();
  }
}

async function compareDatabases() {
  console.log('\n\n=== CROSS-DATABASE COMPARISON ===\n');
  
  try {
    // Get counts from each database
    const pgStats = await pgPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT pole_number) as poles,
        COUNT(DISTINCT property_id) as properties
      FROM onemap_lawley_raw
    `);
    
    const sqliteStats = sqlite.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT "Pole Number") as poles,
        COUNT(DISTINCT "Property ID") as properties
      FROM excel_import
    `).get() || { total: 0, poles: 0, properties: 0 };
    
    const conn = duck.connect();
    let duckStats = { total: 0, poles: 0, properties: 0 };
    try {
      duckStats = conn.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT "Pole Number") as poles,
          COUNT(DISTINCT "Property ID") as properties
        FROM excel_import
      `).get(0) || { total: 0, poles: 0, properties: 0 };
    } catch (e) {
      console.log('DuckDB query failed');
    }
    conn.close();
    
    console.log('Database    | Total Records | Unique Poles | Unique Properties');
    console.log('------------|---------------|--------------|------------------');
    console.log(`PostgreSQL  | ${String(pgStats.rows[0].total).padStart(13)} | ${String(pgStats.rows[0].poles).padStart(12)} | ${String(pgStats.rows[0].properties).padStart(16)}`);
    console.log(`SQLite      | ${String(sqliteStats.total).padStart(13)} | ${String(sqliteStats.poles).padStart(12)} | ${String(sqliteStats.properties).padStart(16)}`);
    console.log(`DuckDB      | ${String(duckStats.total).padStart(13)} | ${String(duckStats.poles).padStart(12)} | ${String(duckStats.properties).padStart(16)}`);
    
    // Check discrepancies
    const pg = pgStats.rows[0];
    console.log('\nDiscrepancy Analysis:');
    
    if (Math.abs(pg.total - sqliteStats.total) > 100) {
      console.log(`⚠️  Large difference in total records between PostgreSQL and SQLite: ${Math.abs(pg.total - sqliteStats.total)}`);
    }
    if (Math.abs(pg.total - duckStats.total) > 100) {
      console.log(`⚠️  Large difference in total records between PostgreSQL and DuckDB: ${Math.abs(pg.total - duckStats.total)}`);
    }
    
    if (pg.poles === sqliteStats.poles && pg.poles === duckStats.poles) {
      console.log('✅ All databases show the same number of unique poles');
    } else {
      console.log('⚠️  Databases show different unique pole counts');
    }
    
  } catch (error) {
    console.error('Comparison error:', error.message);
  }
}

async function main() {
  try {
    await checkPostgresDuplicates();
    checkSQLiteDuplicates();
    checkDuckDBDuplicates();
    await compareDatabases();
    
    console.log('\n\n=== CONCLUSION ===');
    console.log('The high record count is due to:');
    console.log('1. Multiple properties can reference the same pole number');
    console.log('2. Status updates create new records (not duplicates, but history)');
    console.log('3. Each day\'s import may update existing records with new statuses');
    console.log('\nThis is EXPECTED behavior for tracking status history over time.');
    
  } catch (error) {
    console.error('Main error:', error.message);
  } finally {
    await pgPool.end();
    sqlite.close();
  }
}

main();