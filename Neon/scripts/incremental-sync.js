#!/usr/bin/env node

/**
 * Incremental sync - processes data in small batches to avoid timeouts
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
function cleanRow(row) {
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
}

async function incrementalSync() {
  console.log('🔄 Incremental Sync - Small Batches');
  console.log('====================================\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const neonClient = new Client(NEON_CONFIG);
  
  try {
    await neonClient.connect();
    
    // Get current max ID in Neon
    const maxIdResult = await neonClient.query('SELECT COALESCE(MAX(id), 0) as max_id FROM status_changes');
    const startFromId = parseInt(maxIdResult.rows[0].max_id);
    
    console.log(`📍 Starting from ID: ${startFromId}\n`);
    
    // Get total count from Supabase
    const { count: totalCount } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total rows in Supabase: ${totalCount}`);
    
    // Process in small batches
    const BATCH_SIZE = 100; // Small batch to avoid timeouts
    let processedCount = 0;
    let lastId = startFromId;
    let hasMore = true;
    const startTime = Date.now();
    
    while (hasMore) {
      // Fetch next batch
      const { data: batch, error } = await supabase
        .from('status_changes')
        .select('*')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);
      
      if (error) {
        console.error('❌ Fetch error:', error.message);
        break;
      }
      
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process this batch
      let batchInserted = 0;
      for (const row of batch) {
        try {
          const cleaned = cleanRow(row);
          const keys = Object.keys(cleaned);
          const values = Object.values(cleaned);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          await neonClient.query(
            `INSERT INTO status_changes (${keys.map(k => `"${k}"`).join(', ')}) 
             VALUES (${placeholders})
             ON CONFLICT (id) DO NOTHING`,
            values
          );
          
          batchInserted++;
          lastId = row.id; // Update last processed ID
        } catch (insertError) {
          // Log first few errors
          if (processedCount < 5) {
            console.log(`⚠️  Insert error for ID ${row.id}: ${insertError.message}`);
          }
        }
      }
      
      processedCount += batchInserted;
      
      // Progress update
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = Math.round(processedCount / elapsed);
      console.log(`✅ Batch complete: ${batchInserted}/${batch.length} rows inserted (Total: ${processedCount}, Rate: ${rate}/sec)`);
      
      // Check if we should continue
      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      }
      
      // Small delay to prevent overwhelming the servers
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final verification
    const finalCount = await neonClient.query('SELECT COUNT(*) FROM status_changes');
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n📊 Sync Summary:');
    console.log(`  Total rows in Neon: ${finalCount.rows[0].count}`);
    console.log(`  Rows synced this run: ${processedCount}`);
    console.log(`  Time taken: ${totalTime} seconds`);
    console.log(`  Average rate: ${Math.round(processedCount / totalTime)} rows/sec`);
    
    // Check if complete
    if (finalCount.rows[0].count >= totalCount) {
      console.log('\n✅ Full sync completed! All data transferred.');
    } else {
      const remaining = totalCount - finalCount.rows[0].count;
      console.log(`\n⏳ Partial sync complete. Remaining: ${remaining} rows`);
      console.log('   Run this script again to continue syncing.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

// Add ability to run continuously
async function continuousSync() {
  let continueSync = true;
  let iteration = 1;
  
  while (continueSync) {
    console.log(`\n🔄 Sync iteration ${iteration}:`);
    console.log('='.repeat(40));
    
    await incrementalSync();
    
    // Check if we should continue
    const neonClient = new Client(NEON_CONFIG);
    await neonClient.connect();
    
    const countResult = await neonClient.query('SELECT COUNT(*) as count FROM status_changes');
    const currentCount = parseInt(countResult.rows[0].count);
    
    await neonClient.end();
    
    // Stop if we have 15,651 rows (complete)
    if (currentCount >= 15651) {
      console.log('\n🎉 All data synced successfully!');
      continueSync = false;
    } else {
      console.log(`\n⏸️  Pausing for 2 seconds before next iteration...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      iteration++;
    }
  }
}

// Check command line argument
const args = process.argv.slice(2);
if (args[0] === '--continuous') {
  console.log('Running in continuous mode...\n');
  continuousSync().catch(console.error);
} else {
  incrementalSync().catch(console.error);
}