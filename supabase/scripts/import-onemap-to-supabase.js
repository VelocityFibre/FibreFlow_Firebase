#!/usr/bin/env node

/**
 * Import OneMap Excel Data to Supabase
 * 
 * This script handles the import of OneMap Excel files into Supabase
 * for the Progress Summary dashboard.
 * 
 * Usage: node import-onemap-to-supabase.js [excel-file-path]
 */

const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// OneMap SQLite database path
const ONEMAP_DB_PATH = path.join(__dirname, '../../OneMap/SQL/database/onemap.db');

/**
 * Main import function
 */
async function importOneMapData() {
  console.log('🚀 Starting OneMap to Supabase import...\n');

  // Check if OneMap SQLite database exists
  if (!fs.existsSync(ONEMAP_DB_PATH)) {
    console.error(`❌ OneMap database not found at: ${ONEMAP_DB_PATH}`);
    console.log('💡 Make sure you have imported the Excel file to OneMap SQL first.');
    console.log('   Run: cd OneMap/SQL/scripts && npm run import [excel-file]');
    process.exit(1);
  }

  // Connect to OneMap SQLite database
  const db = new Database(ONEMAP_DB_PATH, { readonly: true });
  
  try {
    // Get data from OneMap
    console.log('📊 Reading data from OneMap SQL database...');
    const stmt = db.prepare(`
      SELECT 
        property_id,
        address,
        'Lawley' as project_name,
        CAST(zone AS INTEGER) as zone,
        agent as agent_name,
        pole_number,
        drop_number,
        status,
        date_stamp,
        flow_name_groups,
        -- Extract specific dates from status history
        CASE 
          WHEN status LIKE '%Permission%Approved%' THEN date_stamp 
        END as permission_date,
        CASE 
          WHEN status LIKE '%Pole%Planted%' THEN date_stamp 
        END as pole_planted_date,
        CASE 
          WHEN status LIKE '%Stringing%Complete%' THEN date_stamp 
        END as stringing_date,
        CASE 
          WHEN status LIKE '%Sign%Up%' THEN date_stamp 
        END as signup_date,
        CASE 
          WHEN status LIKE '%Drop%Complete%' THEN date_stamp 
        END as drop_date,
        CASE 
          WHEN status LIKE '%Connected%' THEN date_stamp 
        END as connected_date
      FROM status_changes
      WHERE property_id IS NOT NULL
      ORDER BY date_stamp
    `);
    
    const rows = stmt.all();
    console.log(`✅ Found ${rows.length} records to import\n`);

    // Import to Supabase in batches
    const BATCH_SIZE = 1000;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      console.log(`📤 Importing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} records)...`);
      
      const { data, error } = await supabase
        .from('status_changes')
        .upsert(batch, { 
          onConflict: 'property_id,pole_number,status,date_stamp',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('❌ Batch error:', error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`✅ Batch imported successfully`);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${imported} records`);
    if (errors > 0) {
      console.log(`❌ Failed to import: ${errors} records`);
    }

    // Test the views
    console.log('\n🔍 Testing views...');
    
    // Test build milestones
    const { data: milestones, error: msError } = await supabase
      .rpc('get_project_progress_summary', { project_name: 'Lawley' });

    if (msError) {
      console.error('❌ Error testing views:', msError.message);
    } else {
      console.log('✅ Views are working! Sample data:');
      if (milestones?.build_milestones?.length > 0) {
        console.log('\nBuild Milestones:');
        milestones.build_milestones.forEach(m => {
          console.log(`  ${m.name}: ${m.completed}/${m.scope} (${m.percentage}%)`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Import error:', error);
  } finally {
    db.close();
  }
}

/**
 * Alternative: Import from CSV export
 */
async function importFromCSV(csvPath) {
  console.log('📁 Importing from CSV:', csvPath);
  
  // Read CSV file
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const record = {};
    
    headers.forEach((header, index) => {
      record[header.toLowerCase().replace(/ /g, '_')] = values[index]?.trim() || null;
    });
    
    // Transform to match schema
    records.push({
      property_id: record.property_id,
      address: record.address,
      project_name: 'Lawley',
      zone: parseInt(record.zone) || null,
      agent_name: record.agent,
      pole_number: record.pole_number,
      drop_number: record.drop_number,
      status: record.status,
      date_stamp: record.date_stamp,
      flow_name_groups: record.flow_name_groups
    });
  }
  
  console.log(`📊 Parsed ${records.length} records from CSV`);
  
  // Import to Supabase
  const { data, error } = await supabase
    .from('status_changes')
    .insert(records);
    
  if (error) {
    console.error('❌ Import error:', error);
  } else {
    console.log('✅ CSV imported successfully!');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.length > 0 && args[0].endsWith('.csv')) {
  importFromCSV(args[0]);
} else {
  importOneMapData();
}