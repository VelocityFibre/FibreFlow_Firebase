#!/usr/bin/env node

/**
 * Full sync with proper pagination to get ALL rows
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

async function fetchAllSupabaseData(tableName) {
  console.log(`📥 Fetching ALL data from Supabase ${tableName}...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`  Fetching rows ${from} to ${from + pageSize}...`);
    
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(from, from + pageSize - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error:', error.message);
      break;
    }
    
    if (data && data.length > 0) {
      allData.push(...data);
      console.log(`  Got ${data.length} rows (total so far: ${allData.length})`);
      
      // Continue if we got a full page
      hasMore = data.length === pageSize;
      from += pageSize;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`✅ Fetched total: ${allData.length} rows`);
  return allData;
}

async function syncToNeon(tableName, data) {
  if (!data || data.length === 0) {
    console.log('No data to sync');
    return;
  }
  
  console.log(`📤 Syncing ${data.length} rows to Neon...`);
  
  const neonClient = new Client(NEON_CONFIG);
  
  try {
    await neonClient.connect();
    console.log('✅ Connected to Neon');
    
    // Drop and recreate table
    await neonClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    
    // Create table based on data
    const sample = data[0];
    const columns = Object.entries(sample).map(([key, value]) => {
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
        ${columns.join(',\n        ')}
      )
    `);
    
    // Insert data in batches
    const BATCH_SIZE = 500;
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const keys = Object.keys(batch[0]);
      const values = [];
      const placeholders = [];
      
      batch.forEach((row, rowIndex) => {
        const rowPlaceholders = keys.map((_, colIndex) => 
          `$${rowIndex * keys.length + colIndex + 1}`
        );
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
        
        keys.forEach(key => {
          values.push(row[key]);
        });
      });
      
      const query = `
        INSERT INTO ${tableName} (${keys.join(', ')}) 
        VALUES ${placeholders.join(', ')}
      `;
      
      await neonClient.query(query, values);
      inserted += batch.length;
      
      process.stdout.write(`\r  Inserted: ${inserted}/${data.length} rows`);
    }
    
    console.log('\n✅ All data inserted!');
    
    // Verify
    const result = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`📊 Verified rows in Neon: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

async function main() {
  console.log('🚀 Full Sync with Proper Pagination');
  console.log('===================================\n');
  
  // Fetch ALL data from Supabase
  const data = await fetchAllSupabaseData('status_changes');
  
  // Sync to Neon
  await syncToNeon('status_changes', data);
  
  console.log('\n✅ Full sync completed!');
}

main().catch(console.error);