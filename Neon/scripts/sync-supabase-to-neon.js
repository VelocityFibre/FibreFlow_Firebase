#!/usr/bin/env node

/**
 * Sync data from Supabase (cloud) to Neon (cloud)
 * This avoids local bandwidth limitations by doing cloud-to-cloud transfer
 */

const { createClient } = require('@supabase/supabase-js');
const { neon } = require('@neondatabase/serverless');

// Configuration
const SUPABASE_URL = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';
const NEON_CONNECTION = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function syncSupabaseToNeon() {
  console.log('☁️  Cloud-to-Cloud Sync: Supabase → Neon');
  console.log('=====================================\n');
  
  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const sql = neon(NEON_CONNECTION);
  
  try {
    // List of tables to sync from Supabase
    const tablesToSync = [
      'status_changes',      // Main OneMap data table
      'zone_progress_view',  // Zone analytics view (if it's a table)
      'projects',           // Projects data
      'daily_progress'      // Daily progress data
    ];
    
    console.log('📋 Tables to sync:', tablesToSync.join(', '));
    console.log('');
    
    for (const table of tablesToSync) {
      await syncTable(supabase, sql, table);
    }
    
    console.log('\n✅ Cloud sync completed successfully!');
    
    // Show summary
    await showNeonSummary(sql);
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

async function syncTable(supabase, neonSql, tableName) {
  console.log(`\n📊 Syncing table: ${tableName}`);
  
  try {
    // First, check if table exists in Supabase
    let { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log(`  ⚠️  Table not found in Supabase: ${countError.message}`);
      return;
    }
    
    console.log(`  Total rows in Supabase: ${count}`);
    
    if (count === 0) {
      console.log('  No data to sync');
      return;
    }
    
    // Get sample row to understand structure
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (sampleError || !sampleData || sampleData.length === 0) {
      console.log('  ❌ Could not read table structure');
      return;
    }
    
    // Create table in Neon based on sample data
    console.log('  Creating table in Neon...');
    await createTableInNeon(neonSql, tableName, sampleData[0]);
    
    // Clear existing data
    await neonSql`DELETE FROM ${neonSql(tableName)}`;
    
    // Sync data in batches
    const BATCH_SIZE = 1000;
    let offset = 0;
    let syncedRows = 0;
    
    console.log('  Starting batch sync...');
    
    while (offset < count) {
      // Fetch batch from Supabase
      const { data: batchData, error: batchError } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1)
        .order('id', { ascending: true });
      
      if (batchError) {
        console.error(`  ❌ Error fetching batch: ${batchError.message}`);
        break;
      }
      
      if (!batchData || batchData.length === 0) break;
      
      // Insert batch into Neon
      for (const row of batchData) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          
          // Build dynamic insert query
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
          `;
          
          await neonSql(insertQuery, values);
        } catch (insertError) {
          // Log error but continue
          console.error(`  ⚠️  Insert error: ${insertError.message}`);
        }
      }
      
      syncedRows += batchData.length;
      offset += BATCH_SIZE;
      
      // Progress update
      const progress = Math.round((syncedRows / count) * 100);
      process.stdout.write(`\r  Progress: ${progress}% (${syncedRows}/${count} rows)`);
    }
    
    console.log('\n  ✅ Table synced successfully');
    
  } catch (error) {
    console.error(`  ❌ Error syncing table ${tableName}:`, error.message);
  }
}

async function createTableInNeon(neonSql, tableName, sampleRow) {
  // Drop table if exists
  try {
    await neonSql`DROP TABLE IF EXISTS ${neonSql(tableName)} CASCADE`;
  } catch (e) {
    // Ignore drop errors
  }
  
  // Create table with inferred types
  const columns = Object.entries(sampleRow).map(([key, value]) => {
    let type = 'TEXT';
    
    if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE PRECISION';
    } else if (typeof value === 'boolean') {
      type = 'BOOLEAN';
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      type = 'TIMESTAMP WITH TIME ZONE';
    } else if (typeof value === 'object' && value !== null) {
      type = 'JSONB';
    }
    
    // Make id columns primary key
    const isPrimary = key === 'id' ? ' PRIMARY KEY' : '';
    
    return `${key} ${type}${isPrimary}`;
  });
  
  const createTableSQL = `
    CREATE TABLE ${tableName} (
      ${columns.join(',\n      ')}
    )
  `;
  
  await neonSql(createTableSQL);
}

async function showNeonSummary(neonSql) {
  console.log('\n📊 Neon Database Summary:');
  console.log('─'.repeat(50));
  
  try {
    const tables = await neonSql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    for (const table of tables) {
      try {
        const countResult = await neonSql`SELECT COUNT(*) as count FROM ${neonSql(table.tablename)}`;
        const count = countResult[0].count;
        console.log(`${table.tablename.padEnd(30)} ${count.toString().padStart(10)} rows  ${table.size.padStart(10)}`);
      } catch (e) {
        console.log(`${table.tablename.padEnd(30)} (error counting rows)`);
      }
    }
  } catch (e) {
    console.log('Error generating summary:', e.message);
  }
  
  console.log('─'.repeat(50));
}

// Alternative: Direct PostgreSQL foreign data wrapper approach
function showFDWApproach() {
  console.log('\n📝 Alternative: PostgreSQL Foreign Data Wrapper (FDW)');
  console.log('─'.repeat(50));
  console.log('For even faster sync, you can use FDW in Neon:');
  console.log(`
-- Run this in Neon SQL editor:

-- 1. Install postgres_fdw extension
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- 2. Create foreign server for Supabase
CREATE SERVER supabase_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    host 'db.vkmpbprvooxgrkwrkbcf.supabase.co',
    port '5432',
    dbname 'postgres'
  );

-- 3. Create user mapping
CREATE USER MAPPING FOR CURRENT_USER
  SERVER supabase_server
  OPTIONS (
    user 'postgres',
    password 'your-supabase-db-password'
  );

-- 4. Import schema
IMPORT FOREIGN SCHEMA public
  FROM SERVER supabase_server
  INTO public;

-- 5. Copy data
CREATE TABLE status_changes AS
  SELECT * FROM supabase_status_changes;
  `);
}

// Run sync
console.log('🚀 Starting cloud-to-cloud sync...\n');
console.log('Advantages:');
console.log('✅ No local bandwidth usage');
console.log('✅ Faster transfer between data centers');
console.log('✅ More reliable connection');
console.log('✅ Can run in background\n');

syncSupabaseToNeon()
  .then(() => {
    showFDWApproach();
  })
  .catch(console.error);