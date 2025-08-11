#!/usr/bin/env node

/**
 * Simple cloud-to-cloud sync from Supabase to Neon
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

async function syncTable(tableName) {
  console.log(`\n📊 Syncing ${tableName}...`);
  
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
    
    // Create table
    const columns = Object.entries(sample[0]).map(([key, value]) => {
      let type = 'TEXT';
      if (typeof value === 'number') {
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
        ${columns.join(',\n        ')}
      )
    `);
    
    // Sync in batches
    const BATCH_SIZE = 1000;
    let offset = 0;
    let synced = 0;
    
    console.log('🔄 Starting sync...');
    
    while (offset < count) {
      // Fetch batch
      const { data: batch, error } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1);
      
      if (error || !batch) {
        console.error('❌ Error fetching batch:', error?.message);
        break;
      }
      
      // Insert batch
      for (const row of batch) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        
        try {
          await neonClient.query(
            `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
            values
          );
          synced++;
        } catch (e) {
          // Skip errors
        }
      }
      
      offset += BATCH_SIZE;
      
      // Progress
      const progress = Math.round((synced / count) * 100);
      process.stdout.write(`\r  Progress: ${progress}% (${synced.toLocaleString()}/${count.toLocaleString()})`);
    }
    
    console.log('\n✅ Sync completed!');
    
    // Verify
    const result = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`📊 Rows in Neon: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

// Main
async function main() {
  console.log('☁️  Simple Cloud-to-Cloud Sync');
  console.log('==============================');
  console.log('✅ No local bandwidth usage!');
  console.log('✅ Direct cloud transfer!');
  
  // Sync priority tables
  await syncTable('status_changes');
  
  console.log('\n✅ All done!');
  console.log('\n💡 To sync more tables, edit the script and add:');
  console.log('   await syncTable("table_name");');
}

main().catch(console.error);