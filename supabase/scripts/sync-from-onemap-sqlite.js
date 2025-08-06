#!/usr/bin/env node

/**
 * Sync OneMap SQLite Database to Supabase
 * 
 * This script syncs your existing OneMap SQLite database to Supabase
 * for the Progress Summary dashboard.
 * 
 * Usage: node sync-from-onemap-sqlite.js
 */

const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQLite database path - CORRECTED to use the actual database location
const SQLITE_DB_PATH = path.join(__dirname, '../../OneMap/SQL/scripts/onemap.db');

/**
 * Transform SQLite data to match Supabase schema
 */
function transformRecord(record) {
  return {
    property_id: record.property_id,
    address: record.address,
    project_name: record.project || 'Lawley',
    zone: record.zone ? parseInt(record.zone) : null,
    agent_name: record.agent,
    pole_number: record.pole_number,
    drop_number: record.drop_number,
    status: record.status,
    date_stamp: record.status_date || record.created_at,
    flow_name_groups: null, // Will be null for now
    
    // Extract dates based on status patterns
    permission_date: record.status?.includes('Permission') && record.status?.includes('Approved') ? 
      (record.status_date || record.created_at) : null,
    pole_planted_date: record.status?.includes('Pole') && record.status?.includes('Planted') ? 
      (record.status_date || record.created_at) : null,
    stringing_date: record.status?.includes('Stringing') && record.status?.includes('Complete') ? 
      (record.status_date || record.created_at) : null,
    signup_date: record.status?.includes('Sign') && record.status?.includes('Up') ? 
      (record.status_date || record.created_at) : null,
    drop_date: record.status?.includes('Drop') && record.status?.includes('Complete') ? 
      (record.status_date || record.created_at) : null,
    connected_date: record.status?.includes('Connected') ? 
      (record.status_date || record.created_at) : null
  };
}

/**
 * Main sync function
 */
async function syncFromSQLite() {
  console.log('🚀 Starting OneMap SQLite → Supabase sync...\n');

  // Check if SQLite database exists
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    console.error(`❌ OneMap database not found at: ${SQLITE_DB_PATH}`);
    process.exit(1);
  }

  // Connect to SQLite database
  const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Error opening SQLite database:', err.message);
      process.exit(1);
    }
  });

  try {
    console.log('📊 Analyzing SQLite database...');
    
    // Get database stats
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT property_id) as unique_properties,
          COUNT(DISTINCT pole_number) as unique_poles,
          COUNT(DISTINCT status) as unique_statuses,
          MIN(created_at) as earliest_date,
          MAX(created_at) as latest_date
        FROM status_changes
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log(`📈 Database Statistics:`);
    console.log(`   Total Records: ${stats.total_records.toLocaleString()}`);
    console.log(`   Unique Properties: ${stats.unique_properties.toLocaleString()}`);
    console.log(`   Unique Poles: ${stats.unique_poles.toLocaleString()}`);
    console.log(`   Status Types: ${stats.unique_statuses}`);
    console.log(`   Date Range: ${stats.earliest_date} to ${stats.latest_date}\n`);

    // Get all records from SQLite
    console.log('📋 Reading all records from SQLite...');
    const records = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          property_id,
          pole_number,
          drop_number,
          status,
          status_date,
          agent,
          address,
          zone,
          project,
          created_at
        FROM status_changes
        ORDER BY created_at ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`✅ Found ${records.length.toLocaleString()} records to sync\n`);

    // Transform records for Supabase
    console.log('🔄 Transforming data for Supabase schema...');
    const transformedRecords = records.map(transformRecord);

    // Clear existing data in Supabase (optional - ask user)
    console.log('🗑️  Clearing existing Supabase data...');
    const { error: deleteError } = await supabase
      .from('status_changes')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError && !deleteError.message.includes('No rows found')) {
      console.error('❌ Error clearing existing data:', deleteError.message);
    } else {
      console.log('✅ Existing data cleared\n');
    }

    // Import to Supabase in batches
    const BATCH_SIZE = 1000;
    let imported = 0;
    let errors = 0;

    console.log('📤 Importing to Supabase...');
    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(transformedRecords.length / BATCH_SIZE);
      
      process.stdout.write(`\r   Batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      const { data, error } = await supabase
        .from('status_changes')
        .insert(batch);

      if (error) {
        console.error(`\n❌ Batch ${batchNum} error:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }

    console.log(`\n\n📊 Sync Summary:`);
    console.log(`✅ Successfully synced: ${imported.toLocaleString()} records`);
    if (errors > 0) {
      console.log(`❌ Failed to sync: ${errors.toLocaleString()} records`);
    }

    // Test the views with real data
    console.log('\n🔍 Testing dashboard views with real data...');
    
    const { data: dashboardData, error: dashboardError } = await supabase
      .rpc('get_project_progress_summary', { p_project_name: 'Lawley' });

    if (dashboardError) {
      console.error('❌ Error testing dashboard:', dashboardError.message);
    } else if (dashboardData) {
      const parsed = typeof dashboardData === 'string' ? JSON.parse(dashboardData) : dashboardData;
      
      console.log('✅ Dashboard views working! Sample data:');
      
      if (parsed.build_milestones?.length > 0) {
        console.log('\n📊 Build Milestones:');
        parsed.build_milestones.forEach(m => {
          console.log(`   ${m.name}: ${m.completed}/${m.scope} (${m.percentage}%)`);
        });
      }
      
      if (parsed.zone_progress?.length > 0) {
        console.log(`\n🗺️  Zone Progress: ${parsed.zone_progress.length} zones`);
        const totalHomes = parsed.zone_progress.reduce((sum, z) => sum + z.home_count, 0);
        console.log(`   Total Homes: ${totalHomes.toLocaleString()}`);
      }
      
      if (parsed.daily_progress?.length > 0) {
        console.log(`\n📅 Daily Progress: Last ${parsed.daily_progress.length} days`);
      }
      
      console.log(`\n🎯 Prerequisites: ${parsed.prerequisites?.length || 0} items`);
      console.log(`\n🏁 Key Milestones: ${parsed.key_milestones?.length || 0} tracked`);
    }

    console.log('\n🎉 Sync completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test your Angular app: http://localhost:4200/analytics/project-progress');
    console.log('   2. Deploy to production: npm run build && firebase deploy');
    console.log('   3. View live dashboard: https://fibreflow-73daf.web.app/analytics/project-progress');

  } catch (error) {
    console.error('❌ Sync error:', error);
  } finally {
    db.close();
  }
}

/**
 * Check what data exists in SQLite first
 */
async function checkSQLiteData() {
  console.log('🔍 Checking SQLite database content...\n');
  
  const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);
  
  try {
    // Check if table exists
    const tables = await new Promise((resolve, reject) => {
      db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='status_changes'
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (tables.length === 0) {
      console.log('❌ No status_changes table found in SQLite database');
      console.log('💡 Run your import script first to populate the database');
      return false;
    }

    // Sample some data
    const sample = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM status_changes LIMIT 3
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📋 Sample SQLite data:');
    sample.forEach((row, i) => {
      console.log(`\n   Record ${i + 1}:`);
      console.log(`     Property ID: ${row.property_id}`);
      console.log(`     Pole: ${row.pole_number}`);
      console.log(`     Status: ${row.status}`);
      console.log(`     Agent: ${row.agent}`);
      console.log(`     Date: ${row.status_date || row.created_at}`);
    });

    return true;

  } catch (error) {
    console.error('❌ Error checking SQLite:', error);
    return false;
  } finally {
    db.close();
  }
}

// Main execution
async function main() {
  const hasData = await checkSQLiteData();
  
  if (hasData) {
    console.log('\n✅ SQLite data looks good!');
    console.log('\n🚀 Proceeding with sync to Supabase...\n');
    await syncFromSQLite();
  }
}

main().catch(console.error);