const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config/database.json');

async function compareStorageApproaches() {
  const pgPool = new Pool(config.postgres);
  const sqlitePath = path.join(__dirname, '../../OneMap/SQL/onemap.db');
  const sqlite = new Database(sqlitePath, { readonly: true });
  
  try {
    console.log('=== STORAGE APPROACH COMPARISON ===\n');
    
    // 1. SQLite Approach
    console.log('SQLITE APPROACH:');
    console.log('-'.repeat(50));
    
    // Check main data table
    const sqliteMain = sqlite.prepare('SELECT COUNT(*) as count FROM latest_data').get();
    console.log(`Main Table (latest_data): ${sqliteMain.count.toLocaleString()} records`);
    
    // Check status history
    const sqliteHistory = sqlite.prepare('SELECT COUNT(*) as count FROM status_history').get();
    const sqliteChanges = sqlite.prepare('SELECT COUNT(*) as count FROM status_changes').get();
    console.log(`Status History: ${sqliteHistory.count.toLocaleString()} records`);
    console.log(`Status Changes: ${sqliteChanges.count.toLocaleString()} records`);
    
    // Sample status_changes structure
    console.log('\nSQLite status_changes sample:');
    const changes = sqlite.prepare(`
      SELECT property_id, pole_number, old_status, new_status, date_changed 
      FROM status_changes 
      LIMIT 3
    `).all();
    changes.forEach(c => {
      console.log(`  Property ${c.property_id}: ${c.old_status} → ${c.new_status} (${c.date_changed})`);
    });
    
    const totalSqlite = sqliteMain.count + sqliteHistory.count + sqliteChanges.count;
    console.log(`\nTotal SQLite Storage: ${totalSqlite.toLocaleString()} records`);
    
    // 2. PostgreSQL Approach
    console.log('\n\nPOSTGRESQL APPROACH:');
    console.log('-'.repeat(50));
    
    const pgMain = await pgPool.query('SELECT COUNT(*) FROM onemap_lawley_raw');
    console.log(`Main Table: ${pgMain.rows[0].count.toLocaleString()} records`);
    
    // Check if we're storing actual changes
    const pgChanges = await pgPool.query(`
      WITH changes AS (
        SELECT property_id, pole_number, status,
               LAG(status) OVER (PARTITION BY property_id ORDER BY source_file) as prev_status
        FROM onemap_lawley_raw
        WHERE property_id IS NOT NULL
      )
      SELECT COUNT(*) as total_records,
             COUNT(CASE WHEN status != prev_status THEN 1 END) as actual_changes
      FROM changes
    `);
    
    console.log(`Records with status changes: ${pgChanges.rows[0].actual_changes.toLocaleString()}`);
    console.log(`Unchanged records: ${(pgChanges.rows[0].total_records - pgChanges.rows[0].actual_changes).toLocaleString()}`);
    
    // 3. Storage Efficiency Analysis
    console.log('\n\nSTORAGE EFFICIENCY ANALYSIS:');
    console.log('-'.repeat(50));
    
    const pgSize = 139397;
    const sqliteSize = totalSqlite;
    const ratio = (pgSize / sqliteSize).toFixed(2);
    
    console.log(`PostgreSQL: ${pgSize.toLocaleString()} records`);
    console.log(`SQLite: ${sqliteSize.toLocaleString()} records`);
    console.log(`Ratio: ${ratio}x more records in PostgreSQL`);
    
    // 4. Recommendations
    console.log('\n\nRECOMMENDATIONS:');
    console.log('-'.repeat(50));
    console.log('Option 1: Keep Current Approach (Full History)');
    console.log('  Pros: Complete audit trail, easy queries, no data loss');
    console.log('  Cons: More storage (but still manageable)');
    console.log('  Storage: ~140K records for 10 days ≈ 5M records/year');
    
    console.log('\nOption 2: SQLite-Style (Latest + Changes Only)');
    console.log('  Pros: Much less storage (~30K records)');
    console.log('  Cons: Complex queries, need to reconstruct history');
    console.log('  Storage: ~30K records total');
    
    console.log('\nOption 3: Hybrid (Recent Full + Archived Changes)');
    console.log('  Keep last 30 days full history');
    console.log('  Archive older data to changes-only table');
    console.log('  Best balance of performance and history');
    
    // Check actual database size
    const dbSize = await pgPool.query(`
      SELECT pg_size_pretty(pg_database_size('fibreflow_staging')) as size
    `);
    
    console.log(`\nCurrent PostgreSQL Database Size: ${dbSize.rows[0].size}`);
    console.log('Projected Annual Size: ~500MB-1GB (very manageable)');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sqlite.close();
    await pgPool.end();
  }
}

compareStorageApproaches();