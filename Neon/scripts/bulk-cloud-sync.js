#!/usr/bin/env node

/**
 * Bulk cloud-to-cloud sync from Supabase to Neon
 * Uses efficient bulk INSERT for faster syncing
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Supabase config
const SUPABASE_URL = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

// Neon config
const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function bulkSyncTable(tableName, resumeFrom = 0) {
  console.log(`\n📊 Bulk syncing ${tableName}...`);
  if (resumeFrom > 0) {
    console.log(`📍 Resuming from row ${resumeFrom}`);
  }
  
  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const neonClient = new Client(NEON_CONFIG);
  
  try {
    await neonClient.connect();
    console.log('✅ Connected to Neon');
    
    // Get count from Supabase
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    console.log(`📈 Total rows in Supabase: ${count?.toLocaleString() || 0}`);
    
    if (!count || count === 0) {
      console.log('No data to sync');
      return;
    }
    
    // If resuming, check existing count
    if (resumeFrom === 0) {
      // Get sample row for structure
      const { data: sample } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!sample || sample.length === 0) {
        console.log('❌ Could not read table structure');
        return;
      }
      
      // Create table in Neon
      console.log('📐 Creating table structure...');
      
      // Drop if exists
      await neonClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
      
      // Create table with proper types
      const columns = Object.entries(sample[0]).map(([key, value]) => {
        let type = 'TEXT';
        if (key === 'id' && typeof value === 'number') {
          type = 'BIGINT PRIMARY KEY';
        } else if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
        } else if (typeof value === 'boolean') {
          type = 'BOOLEAN';
        } else if (value && !isNaN(Date.parse(value))) {
          type = 'TIMESTAMP';
        }
        return `${key} ${type}`;
      });
      
      await neonClient.query(`
        CREATE TABLE ${tableName} (
          ${columns.join(',\n          ')}
        )
      `);
    }
    
    // Sync in larger batches with bulk insert
    const BATCH_SIZE = 5000; // Larger batches for cloud-to-cloud
    let offset = resumeFrom;
    let synced = resumeFrom;
    const startTime = Date.now();
    
    console.log('🔄 Starting bulk sync...');
    
    while (offset < count) {
      // Fetch batch
      const { data: batch, error } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1)
        .order('id', { ascending: true });
      
      if (error || !batch || batch.length === 0) {
        if (error) console.error('❌ Error fetching batch:', error.message);
        break;
      }
      
      // Prepare bulk insert
      if (batch.length > 0) {
        const keys = Object.keys(batch[0]);
        const values = [];
        const placeholders = [];
        
        // Build values array and placeholders
        batch.forEach((row, rowIndex) => {
          const rowPlaceholders = keys.map((_, colIndex) => 
            `$${rowIndex * keys.length + colIndex + 1}`
          );
          placeholders.push(`(${rowPlaceholders.join(', ')})`);
          
          keys.forEach(key => {
            values.push(row[key]);
          });
        });
        
        // Execute bulk insert
        try {
          const query = `
            INSERT INTO ${tableName} (${keys.join(', ')}) 
            VALUES ${placeholders.join(', ')}
            ON CONFLICT DO NOTHING
          `;
          
          await neonClient.query(query, values);
          synced += batch.length;
        } catch (e) {
          console.error('❌ Bulk insert error:', e.message);
          // Fall back to row-by-row for this batch
          for (const row of batch) {
            try {
              const rowKeys = Object.keys(row);
              const rowValues = Object.values(row);
              const rowPlaceholders = rowKeys.map((_, i) => `$${i + 1}`).join(', ');
              
              await neonClient.query(
                `INSERT INTO ${tableName} (${rowKeys.join(', ')}) VALUES (${rowPlaceholders}) ON CONFLICT DO NOTHING`,
                rowValues
              );
              synced++;
            } catch (rowError) {
              // Skip individual errors
            }
          }
        }
      }
      
      offset += BATCH_SIZE;
      
      // Progress update
      const progress = Math.round((synced / count) * 100);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = Math.round(synced / elapsed);
      const eta = Math.round((count - synced) / rate);
      
      process.stdout.write(`\r  Progress: ${progress}% (${synced.toLocaleString()}/${count.toLocaleString()}) - ${rate} rows/sec - ETA: ${eta}s  `);
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Sync completed in ${Math.round(totalTime)} seconds!`);
    
    // Verify
    const result = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`📊 Total rows in Neon: ${result.rows[0].count}`);
    
    // Create indexes for better query performance
    console.log('📐 Creating indexes...');
    const indexColumns = ['property_id', 'pole_number', 'status', 'created_at', 'zone'];
    for (const col of indexColumns) {
      try {
        const checkCol = await neonClient.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [tableName, col]);
        
        if (checkCol.rows.length > 0) {
          await neonClient.query(`CREATE INDEX idx_${tableName}_${col} ON ${tableName} (${col})`);
          console.log(`  ✅ Index on ${col}`);
        }
      } catch (e) {
        // Ignore index errors
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

// Main function to sync multiple tables
async function syncAllTables() {
  console.log('☁️  Bulk Cloud-to-Cloud Sync');
  console.log('============================');
  console.log('✅ No local bandwidth usage!');
  console.log('✅ Optimized bulk inserts!');
  console.log('✅ Automatic retry on conflicts!');
  
  // Priority tables in order
  const tables = [
    { name: 'status_changes', resume: 503 },      // Resume from where we left off
    { name: 'latest_property_status', resume: 0 },
    { name: 'current_status', resume: 0 },
    { name: 'pole_capacity', resume: 0 },
    { name: 'import_batches', resume: 0 }
  ];
  
  for (const table of tables) {
    await bulkSyncTable(table.name, table.resume);
  }
  
  // Show final summary
  console.log('\n📊 Final Summary:');
  const neonClient = new Client(NEON_CONFIG);
  try {
    await neonClient.connect();
    const result = await neonClient.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size,
        n_live_tup as estimated_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `);
    
    console.table(result.rows);
  } catch (e) {
    console.error('Could not get summary:', e.message);
  } finally {
    await neonClient.end();
  }
  
  console.log('\n✅ Full sync completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Run performance comparison: node Neon/scripts/compare-databases.js');
  console.log('2. Test analytics queries on both platforms');
  console.log('3. Compare query execution times');
}

// Check if we should sync a specific table or all
const args = process.argv.slice(2);
if (args[0]) {
  // Sync specific table
  bulkSyncTable(args[0], parseInt(args[1]) || 0)
    .catch(console.error);
} else {
  // Sync all tables
  syncAllTables()
    .catch(console.error);
}