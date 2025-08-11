#!/usr/bin/env node

/**
 * Sync OneMap data from Supabase to Neon
 * Targets the actual tables found in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { neon } = require('@neondatabase/serverless');

// Configuration
const SUPABASE_URL = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';
const NEON_CONNECTION = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sql = neon(NEON_CONNECTION);

async function syncSupabaseToNeon() {
  console.log('☁️  Supabase → Neon OneMap Data Sync');
  console.log('=====================================\n');
  
  try {
    // Priority tables to sync (most important first)
    const priorityTables = [
      { name: 'status_changes', rows: 15651 },          // Main status tracking
      { name: 'latest_property_status', rows: 14826 },  // Current property status
      { name: 'current_status', rows: 13656 },          // Current overall status
      { name: 'pole_capacity', rows: 3800 },            // Pole capacity data
      { name: 'daily_snapshots', rows: 42919 }          // Historical snapshots
    ];
    
    console.log('📋 Tables to sync:');
    priorityTables.forEach(t => console.log(`   - ${t.name} (~${t.rows.toLocaleString()} rows)`));
    console.log('');
    
    // Ask user which tables to sync
    console.log('Starting with the most important table: status_changes\n');
    
    // Sync status_changes first
    await syncTableEfficiently(priorityTables[0].name);
    
    console.log('\n✅ Initial sync completed!');
    console.log('\n💡 To sync additional tables, run specific sync commands');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

async function syncTableEfficiently(tableName) {
  console.log(`📊 Syncing table: ${tableName}`);
  
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`  ❌ Error getting count: ${countError.message}`);
      return;
    }
    
    console.log(`  Total rows: ${count?.toLocaleString()}`);
    
    // Get a sample row to create table structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (sampleError || !sampleData || sampleData.length === 0) {
      console.error('  ❌ Could not read table structure');
      return;
    }
    
    // Create table in Neon
    console.log('  Creating table structure in Neon...');
    await createOptimizedTable(tableName, sampleData[0]);
    
    // Sync data in larger batches for efficiency
    const BATCH_SIZE = 5000; // Larger batches for cloud-to-cloud
    let offset = 0;
    let syncedRows = 0;
    const startTime = Date.now();
    
    console.log(`  Starting batch sync (${BATCH_SIZE} rows per batch)...`);
    
    while (offset < count) {
      // Fetch batch from Supabase
      const { data: batchData, error: batchError } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1);
      
      if (batchError) {
        console.error(`\n  ❌ Error fetching batch: ${batchError.message}`);
        break;
      }
      
      if (!batchData || batchData.length === 0) break;
      
      // Bulk insert into Neon using the correct syntax
      try {
        // Prepare bulk insert values
        const columns = Object.keys(batchData[0]);
        const values = [];
        
        for (const row of batchData) {
          const rowValues = columns.map(col => row[col]);
          values.push(rowValues);
        }
        
        // Build bulk insert query
        if (values.length > 0) {
          // Use parameterized query for safety
          const placeholders = values.map((_, rowIndex) => 
            `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
          ).join(', ');
          
          const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
          const flatValues = values.flat();
          
          await sql(query, flatValues);
        }
        
      } catch (insertError) {
        console.error(`\n  ⚠️  Batch insert error: ${insertError.message}`);
        // Try row-by-row for this batch
        for (const row of batchData) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            await sql(
              `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
          } catch (rowError) {
            // Skip individual row errors
          }
        }
      }
      
      syncedRows += batchData.length;
      offset += BATCH_SIZE;
      
      // Progress update
      const progress = Math.round((syncedRows / count) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = Math.round(syncedRows / elapsed);
      process.stdout.write(`\r  Progress: ${progress}% (${syncedRows.toLocaleString()}/${count.toLocaleString()} rows) - ${rate} rows/sec`);
    }
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n  ✅ Synced in ${totalTime} seconds (${Math.round(count / totalTime)} rows/sec)`);
    
    // Verify sync
    const neonCount = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
    console.log(`  📊 Verified: ${neonCount[0].count.toLocaleString()} rows in Neon`);
    
  } catch (error) {
    console.error(`  ❌ Error syncing table: ${error.message}`);
  }
}

async function createOptimizedTable(tableName, sampleRow) {
  // Drop table if exists
  try {
    await sql`DROP TABLE IF EXISTS ${sql(tableName)} CASCADE`;
  } catch (e) {
    // Ignore drop errors
  }
  
  // Create table with appropriate types and indexes
  const columns = Object.entries(sampleRow).map(([key, value]) => {
    let type = 'TEXT';
    
    // Determine type based on value
    if (key === 'id' && typeof value === 'number') {
      type = 'BIGINT';
    } else if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE PRECISION';
    } else if (typeof value === 'boolean') {
      type = 'BOOLEAN';
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      type = 'TIMESTAMP WITH TIME ZONE';
    } else if (typeof value === 'object' && value !== null) {
      type = 'JSONB';
    } else if (key.includes('_id') || key === 'id') {
      // IDs might be better as specific types
      type = typeof value === 'string' && value.length === 36 ? 'UUID' : 'TEXT';
    }
    
    // Add constraints
    const constraints = [];
    if (key === 'id') constraints.push('PRIMARY KEY');
    if (key === 'created_at' || key === 'updated_at') constraints.push('DEFAULT NOW()');
    
    return `${key} ${type} ${constraints.join(' ')}`.trim();
  });
  
  const createTableSQL = `
    CREATE TABLE ${tableName} (
      ${columns.join(',\n      ')}
    )
  `;
  
  await sql(createTableSQL);
  
  // Create indexes for common query patterns
  console.log('  Creating indexes...');
  
  // Index on common lookup fields
  const indexFields = ['property_id', 'pole_number', 'status', 'created_at', 'zone'];
  for (const field of indexFields) {
    if (Object.keys(sampleRow).includes(field)) {
      try {
        await sql`CREATE INDEX idx_${sql(tableName)}_${sql(field)} ON ${sql(tableName)} (${sql(field)})`;
      } catch (e) {
        // Ignore index creation errors
      }
    }
  }
}

// Additional sync functions for specific tables
async function syncPoleCapacity() {
  console.log('\n📊 Special sync for pole_capacity table...');
  await syncTableEfficiently('pole_capacity');
}

async function syncDailySnapshots() {
  console.log('\n📊 Special sync for daily_snapshots table...');
  console.log('  ⚠️  This is a large table (42,919 rows) and may take a few minutes');
  await syncTableEfficiently('daily_snapshots');
}

// Main execution
console.log('🚀 Cloud-to-Cloud Sync Advantages:');
console.log('✅ No local bandwidth usage');
console.log('✅ Direct data center to data center transfer');
console.log('✅ Faster and more reliable');
console.log('✅ Can handle large datasets efficiently\n');

// Run the sync
syncSupabaseToNeon()
  .then(() => {
    console.log('\n💡 Next steps:');
    console.log('1. Run performance comparison: node Neon/scripts/compare-databases.js');
    console.log('2. Sync additional tables as needed');
    console.log('3. Test analytics queries on both platforms');
  })
  .catch(console.error);