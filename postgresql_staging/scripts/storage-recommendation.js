const { Pool } = require('pg');
const config = require('../config/database.json');

async function analyzeStorageAndRecommend() {
  const pgPool = new Pool(config.postgres);
  
  try {
    console.log('='.repeat(70));
    console.log('POSTGRESQL STORAGE ANALYSIS & RECOMMENDATION');
    console.log('='.repeat(70));
    console.log();
    
    // Current situation
    console.log('CURRENT POSTGRESQL APPROACH:');
    console.log('-'.repeat(50));
    console.log('• Storing EVERY record from EVERY daily import');
    console.log('• 139,397 records for 10 days of data');
    console.log('• ~14,000 records added per day');
    console.log();
    
    // Check how many are actual changes
    const actualChanges = await pgPool.query(`
      WITH daily_status AS (
        SELECT 
          property_id,
          pole_number,
          status,
          source_file,
          LAG(status) OVER (PARTITION BY property_id ORDER BY source_file) as prev_status,
          LAG(pole_number) OVER (PARTITION BY property_id ORDER BY source_file) as prev_pole
        FROM onemap_lawley_raw
        WHERE property_id IS NOT NULL
      )
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status != prev_status OR status IS NULL THEN 1 END) as status_changes,
        COUNT(CASE WHEN pole_number != prev_pole THEN 1 END) as pole_changes,
        COUNT(CASE WHEN status = prev_status AND pole_number = prev_pole THEN 1 END) as no_changes
      FROM daily_status
    `);
    
    const stats = actualChanges.rows[0];
    console.log('CHANGE ANALYSIS:');
    console.log(`• Total records: ${stats.total_records.toLocaleString()}`);
    console.log(`• Status changes: ${stats.status_changes.toLocaleString()}`);
    console.log(`• Pole changes: ${stats.pole_changes.toLocaleString()}`);
    console.log(`• No changes: ${stats.no_changes.toLocaleString()} (${((stats.no_changes/stats.total_records)*100).toFixed(1)}%)`);
    console.log();
    
    // Storage projections
    console.log('STORAGE PROJECTIONS:');
    console.log('-'.repeat(50));
    const dailyRecords = 14000;
    const yearlyRecords = dailyRecords * 365;
    const recordSize = 1; // KB estimate
    
    console.log(`• Daily: ${dailyRecords.toLocaleString()} records`);
    console.log(`• Monthly: ${(dailyRecords * 30).toLocaleString()} records`);
    console.log(`• Yearly: ${yearlyRecords.toLocaleString()} records (~${(yearlyRecords * recordSize / 1024).toFixed(0)} MB)`);
    console.log();
    
    // Options
    console.log('RECOMMENDED APPROACH:');
    console.log('='.repeat(50));
    console.log();
    
    console.log('Option 1: OPTIMIZE CURRENT APPROACH (Recommended) ✅');
    console.log('-'.repeat(50));
    console.log('Keep full history but optimize storage:');
    console.log();
    console.log('CREATE VIEW latest_status AS');
    console.log('  SELECT DISTINCT ON (property_id) *');
    console.log('  FROM onemap_lawley_raw');
    console.log('  ORDER BY property_id, source_file DESC;');
    console.log();
    console.log('CREATE TABLE status_changes AS');
    console.log('  SELECT * FROM (...) WHERE status changed;');
    console.log();
    console.log('Benefits:');
    console.log('• Keep complete audit trail');
    console.log('• Easy to query any date');
    console.log('• Can always reconstruct history');
    console.log('• Storage is still reasonable (~5GB/year)');
    console.log();
    
    console.log('Option 2: SQLITE-STYLE APPROACH');
    console.log('-'.repeat(50));
    console.log('Store only latest + changes:');
    console.log('• latest_records table (15K records)');
    console.log('• status_changes table (only when changed)');
    console.log('• ~80% storage reduction');
    console.log('• BUT: Complex queries, harder to debug');
    console.log();
    
    console.log('Option 3: ARCHIVE OLD DATA');
    console.log('-'.repeat(50));
    console.log('• Keep last 30 days in main table');
    console.log('• Move older data to archive table');
    console.log('• Compress archived data');
    console.log();
    
    // Current database size
    const dbSize = await pgPool.query(`
      SELECT 
        pg_size_pretty(pg_database_size('fibreflow_staging')) as db_size,
        pg_size_pretty(pg_total_relation_size('onemap_lawley_raw')) as table_size
    `);
    
    console.log('CURRENT STORAGE USAGE:');
    console.log('-'.repeat(50));
    console.log(`Database size: ${dbSize.rows[0].db_size}`);
    console.log(`Table size: ${dbSize.rows[0].table_size}`);
    console.log();
    
    console.log('MY RECOMMENDATION:');
    console.log('='.repeat(50));
    console.log('🎯 Keep the current approach for now because:');
    console.log();
    console.log('1. Storage is cheap (5GB/year costs ~$0.50/month)');
    console.log('2. Query simplicity is valuable');
    console.log('3. Complete audit trail is important');
    console.log('4. You can always optimize later if needed');
    console.log();
    console.log('Consider optimization only if:');
    console.log('• Database exceeds 50GB');
    console.log('• Query performance degrades');
    console.log('• Costs become significant');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pgPool.end();
  }
}

analyzeStorageAndRecommend();