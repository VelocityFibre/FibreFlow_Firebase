#!/usr/bin/env node

/**
 * Sync with data cleanup to handle invalid dates
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

// Clean data - fix invalid dates
function cleanData(data) {
  return data.map(row => {
    const cleaned = { ...row };
    
    // Check each field for date issues
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      
      // If it looks like a date field
      if (key.includes('date') || key.includes('Date') || key.includes('_at')) {
        if (value && typeof value === 'string') {
          // Check if it's a valid date
          const parsed = Date.parse(value);
          if (isNaN(parsed) || value === '249111' || value.length < 8) {
            cleaned[key] = null; // Set invalid dates to null
            console.log(`  Fixed invalid date in ${key}: ${value} → null`);
          }
        }
      }
    });
    
    return cleaned;
  });
}

async function fetchAllData(tableName) {
  console.log(`📥 Fetching all data from ${tableName}...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const allData = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error:', error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allData.push(...data);
    console.log(`  Fetched ${allData.length} rows...`);
    
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  console.log(`✅ Total fetched: ${allData.length} rows`);
  return allData;
}

async function syncToNeon(tableName, data) {
  if (!data || data.length === 0) return;
  
  console.log(`\n🧹 Cleaning data...`);
  const cleanedData = cleanData(data);
  
  console.log(`\n📤 Syncing ${cleanedData.length} rows to Neon...`);
  
  const neonClient = new Client(NEON_CONFIG);
  
  try {
    await neonClient.connect();
    
    // Get structure from cleaned data
    const sample = cleanedData[0];
    const columns = Object.entries(sample).map(([key, value]) => {
      let type = 'TEXT';
      
      // Better type detection
      if (key === 'id') {
        if (typeof value === 'number') {
          type = 'BIGINT PRIMARY KEY';
        } else {
          type = 'TEXT PRIMARY KEY';
        }
      } else if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
      } else if (typeof value === 'boolean') {
        type = 'BOOLEAN';
      } else if (key.includes('date') || key.includes('Date') || key.includes('_at')) {
        type = 'TIMESTAMP'; // All date fields as timestamp
      }
      
      return `"${key}" ${type}`;
    });
    
    // Drop and create table
    await neonClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    await neonClient.query(`
      CREATE TABLE ${tableName} (
        ${columns.join(',\n        ')}
      )
    `);
    
    console.log('✅ Table created');
    
    // Insert in smaller batches with error handling
    const BATCH_SIZE = 100;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < cleanedData.length; i += BATCH_SIZE) {
      const batch = cleanedData.slice(i, i + BATCH_SIZE);
      
      // Try batch insert first
      try {
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
          INSERT INTO ${tableName} (${keys.map(k => `"${k}"`).join(', ')}) 
          VALUES ${placeholders.join(', ')}
        `;
        
        await neonClient.query(query, values);
        inserted += batch.length;
        
      } catch (batchError) {
        console.log(`\n⚠️  Batch error: ${batchError.message}`);
        
        // Insert row by row for this batch
        for (const row of batch) {
          try {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            await neonClient.query(
              `INSERT INTO ${tableName} (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
              values
            );
            inserted++;
          } catch (rowError) {
            errors++;
            if (errors <= 5) {
              console.log(`  Row error: ${rowError.message}`);
            }
          }
        }
      }
      
      process.stdout.write(`\r  Progress: ${inserted}/${cleanedData.length} rows (${errors} errors)`);
    }
    
    console.log('\n✅ Insert completed!');
    
    // Final verification
    const result = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`\n📊 Final count in Neon: ${result.rows[0].count}`);
    
    // Show sample data
    const sampleResult = await neonClient.query(`SELECT * FROM ${tableName} LIMIT 5`);
    console.log('\n📋 Sample data:');
    console.table(sampleResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

async function main() {
  console.log('🚀 Full Sync with Data Cleanup');
  console.log('==============================\n');
  
  const data = await fetchAllData('status_changes');
  await syncToNeon('status_changes', data);
  
  console.log('\n✅ Done!');
}

main().catch(console.error);