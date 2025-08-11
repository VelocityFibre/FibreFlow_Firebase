#!/usr/bin/env node

/**
 * Simple Excel Import using existing sync pattern
 * Based on the working sync-from-onemap-sqlite.js script
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Supabase configuration - use same pattern as working script
const supabaseUrl = process.env.SUPABASE_URL || 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test with just the latest file first
const TEST_FILE = '/home/ldp/Downloads/1755152272669_Lawley_13082025.xlsx';

/**
 * Transform Excel row - based on existing sync pattern
 */
function transformRecord(record) {
  const statusDate = record['Status Date'] ? new Date(record['Status Date']) : new Date();
  const status = record['Status']?.toString() || '';
  
  return {
    property_id: record['Property ID']?.toString(),
    address: record['Address']?.toString(),
    project_name: 'Lawley',
    zone: record['Zone'] ? parseInt(record['Zone']) : null,
    agent_name: record['Agent']?.toString(),
    pole_number: record['Pole Number']?.toString(),
    drop_number: record['Drop Number']?.toString(),
    status: status,
    date_stamp: statusDate.toISOString(),
    flow_name_groups: record['Flow Name Groups']?.toString(),
    
    // Date parsing based on existing pattern
    permission_date: status.includes('Permission') ? statusDate.toISOString() : null,
    pole_planted_date: status.includes('Pole') && status.includes('Plant') ? statusDate.toISOString() : null,
    stringing_date: status.includes('String') ? statusDate.toISOString() : null,
    signup_date: status.includes('Sign Up') ? statusDate.toISOString() : null,
    drop_date: status.includes('Drop') && status.includes('Complete') ? statusDate.toISOString() : null,
    connected_date: status.includes('Connect') ? statusDate.toISOString() : null,
    
    created_at: new Date().toISOString(),
    import_batch_id: `excel_import_${Date.now()}`,
    source_row: null,
    raw_data: null
  };
}

/**
 * Main import function
 */
async function importLatestFile() {
  console.log('🚀 Testing Excel Import with Latest File\n');
  
  if (!fs.existsSync(TEST_FILE)) {
    console.error('❌ Test file not found:', TEST_FILE);
    return;
  }
  
  try {
    // Read Excel file
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(TEST_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`📊 Found ${data.length} records`);
    
    // Transform first few records for testing
    const testBatch = data.slice(0, 5).map(transformRecord).filter(r => r.property_id);
    console.log(`✨ Testing with ${testBatch.length} records`);
    
    // Try inserting test batch
    console.log('🧪 Attempting insert...');
    const { data: insertedData, error } = await supabase
      .from('status_changes')
      .insert(testBatch)
      .select();
    
    if (error) {
      console.log('❌ Insert failed:', error.message);
      if (error.details) console.log('   Details:', error.details);
      if (error.hint) console.log('   Hint:', error.hint);
    } else {
      console.log(`✅ Successfully inserted ${insertedData.length} test records!`);
      
      // Get updated count
      const { count } = await supabase
        .from('status_changes')
        .select('id', { count: 'exact', head: true });
      
      console.log(`📈 New total count: ${count}`);
      console.log('\n🎉 Test successful! Ready to import all files.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

importLatestFile().catch(console.error);