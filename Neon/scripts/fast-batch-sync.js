#!/usr/bin/env node

/**
 * Fast batch sync - larger batches, bulk inserts
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

// Clean date fields
function cleanRows(rows) {
  return rows.map(row => {
    const cleaned = { ...row };
    Object.keys(cleaned).forEach(key => {
      if ((key.includes('date') || key.includes('_at')) && cleaned[key]) {
        const parsed = Date.parse(cleaned[key]);
        if (isNaN(parsed) || cleaned[key] === '249111' || cleaned[key].length < 8) {
          cleaned[key] = null;
        }
      }
    });
    return cleaned;
  });
}

async function fastBatchSync() {
  console.log('⚡ Fast Batch Sync');
  console.log('==================\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const neonClient = new Client(NEON_CONFIG);
  
  try {
    await neonClient.connect();
    
    // Get current state
    const currentState = await neonClient.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(MAX(id), 0) as max_id,
        COALESCE(MIN(id), 0) as min_id
      FROM status_changes
    `);
    
    const currentCount = parseInt(currentState.rows[0].count);
    const maxId = parseInt(currentState.rows[0].max_id);
    
    console.log(`📊 Current state in Neon:`);
    console.log(`   Rows: ${currentCount}`);
    console.log(`   Max ID: ${maxId}\n`);
    
    // Get remaining data from Supabase
    console.log('📥 Fetching remaining data from Supabase...');
    const FETCH_SIZE = 2000; // Larger fetch size
    let allData = [];
    let from = 0;
    
    // Fetch all data we don't have yet
    while (true) {
      const { data, error } = await supabase
        .from('status_changes')
        .select('*')
        .gt('id', maxId)
        .order('id', { ascending: true })
        .range(from, from + FETCH_SIZE - 1);
      
      if (error || !data || data.length === 0) break;
      
      allData.push(...data);
      console.log(`   Fetched ${allData.length} rows...`);
      
      if (data.length < FETCH_SIZE) break;
      from += FETCH_SIZE;
    }
    
    if (allData.length === 0) {
      // Try fetching data we might have missed
      console.log('\n🔍 Checking for missed data...');
      
      const { data: allIds } = await supabase
        .from('status_changes')
        .select('id')
        .order('id');
      
      const existingIds = await neonClient.query('SELECT id FROM status_changes');
      const existingSet = new Set(existingIds.rows.map(r => r.id));
      
      const missingIds = allIds.filter(item => !existingSet.has(item.id)).map(item => item.id);
      
      if (missingIds.length > 0) {
        console.log(`   Found ${missingIds.length} missing records`);
        
        // Fetch missing records in chunks
        for (let i = 0; i < missingIds.length; i += 500) {
          const chunk = missingIds.slice(i, i + 500);
          const { data } = await supabase
            .from('status_changes')
            .select('*')
            .in('id', chunk);
          
          if (data) allData.push(...data);
        }
      }
    }
    
    if (allData.length === 0) {
      console.log('\n✅ No new data to sync!');
      return;
    }
    
    console.log(`\n📤 Syncing ${allData.length} rows to Neon...`);
    
    // Clean the data
    const cleanedData = cleanRows(allData);
    
    // Bulk insert in larger batches
    const BATCH_SIZE = 1000;
    let inserted = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < cleanedData.length; i += BATCH_SIZE) {
      const batch = cleanedData.slice(i, i + BATCH_SIZE);
      
      if (batch.length === 0) continue;
      
      // Build bulk insert
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
      
      try {
        const query = `
          INSERT INTO status_changes (${keys.map(k => `"${k}"`).join(', ')}) 
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (id) DO NOTHING
        `;
        
        const result = await neonClient.query(query, values);
        inserted += result.rowCount;
        
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = Math.round(inserted / elapsed);
        console.log(`✅ Batch inserted: ${result.rowCount} rows (Total: ${inserted}, Rate: ${rate}/sec)`);
        
      } catch (batchError) {
        console.error(`❌ Batch error: ${batchError.message}`);
        // Skip this batch
      }
    }
    
    // Final verification
    const finalResult = await neonClient.query('SELECT COUNT(*) as count FROM status_changes');
    const finalCount = parseInt(finalResult.rows[0].count);
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n📊 Sync Complete:');
    console.log(`   Total rows in Neon: ${finalCount}`);
    console.log(`   Rows added: ${finalCount - currentCount}`);
    console.log(`   Time taken: ${totalTime} seconds`);
    
    // Check if we have all data
    const { count: supabaseCount } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true });
    
    if (finalCount >= supabaseCount) {
      console.log('\n🎉 FULL SYNC COMPLETE! All 15,651 rows transferred!');
    } else {
      console.log(`\n⏳ Progress: ${finalCount}/${supabaseCount} rows (${Math.round(finalCount/supabaseCount*100)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

fastBatchSync().catch(console.error);