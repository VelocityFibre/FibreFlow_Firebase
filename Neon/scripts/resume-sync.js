#!/usr/bin/env node

/**
 * Resume sync to get all remaining data
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Configs
const SUPABASE_URL = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function getMissingData() {
  console.log('🔍 Finding missing data...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const neonClient = new Client(NEON_CONFIG);
  
  try {
    await neonClient.connect();
    
    // Get current state in Neon
    const neonStats = await neonClient.query(`
      SELECT 
        COUNT(*) as count,
        MIN(id) as min_id,
        MAX(id) as max_id
      FROM status_changes
    `);
    
    console.log('Current Neon state:');
    console.log(`  Rows: ${neonStats.rows[0].count}`);
    console.log(`  ID range: ${neonStats.rows[0].min_id} - ${neonStats.rows[0].max_id}\n`);
    
    // Get all IDs from Supabase
    console.log('📥 Fetching all IDs from Supabase...');
    const allIds = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('status_changes')
        .select('id')
        .range(from, from + pageSize - 1)
        .order('id');
      
      if (error || !data || data.length === 0) break;
      
      allIds.push(...data.map(d => d.id));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    
    console.log(`  Total IDs in Supabase: ${allIds.length}`);
    
    // Get existing IDs from Neon
    const neonIds = await neonClient.query('SELECT id FROM status_changes');
    const existingIds = new Set(neonIds.rows.map(r => r.id));
    
    // Find missing IDs
    const missingIds = allIds.filter(id => !existingIds.has(id));
    console.log(`  Missing IDs: ${missingIds.length}\n`);
    
    if (missingIds.length === 0) {
      console.log('✅ All data is already synced!');
      return;
    }
    
    // Fetch and sync missing data in batches
    console.log('📤 Syncing missing data...');
    const BATCH_SIZE = 500;
    let synced = 0;
    
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batchIds = missingIds.slice(i, i + BATCH_SIZE);
      
      // Fetch batch from Supabase
      const { data: batchData, error } = await supabase
        .from('status_changes')
        .select('*')
        .in('id', batchIds);
      
      if (error || !batchData) continue;
      
      // Insert into Neon
      for (const row of batchData) {
        try {
          // Clean date fields
          Object.keys(row).forEach(key => {
            if ((key.includes('date') || key.includes('_at')) && row[key]) {
              const parsed = Date.parse(row[key]);
              if (isNaN(parsed) || row[key] === '249111') {
                row[key] = null;
              }
            }
          });
          
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          await neonClient.query(
            `INSERT INTO status_changes (${keys.map(k => `"${k}"`).join(', ')}) 
             VALUES (${placeholders})
             ON CONFLICT (id) DO NOTHING`,
            values
          );
          synced++;
        } catch (e) {
          // Skip errors
        }
      }
      
      process.stdout.write(`\r  Progress: ${synced}/${missingIds.length} rows synced`);
    }
    
    console.log('\n\n✅ Sync completed!');
    
    // Final verification
    const finalCount = await neonClient.query('SELECT COUNT(*) FROM status_changes');
    console.log(`\n📊 Final count in Neon: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

getMissingData().catch(console.error);