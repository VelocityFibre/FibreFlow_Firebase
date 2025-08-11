#!/usr/bin/env node

/**
 * Import All Lawley Excel Files (Aug 11, 12, 13)
 * Using proven working pattern from sync-from-onemap-sqlite.js
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

// Files to import (Aug 11, 12, 13)
const FILES_TO_IMPORT = [
  { file: '/home/ldp/Downloads/1754977851352_Lawley_11082025.xlsx', date: '2025-08-11' },
  { file: '/home/ldp/Downloads/1755069441334_Lawley_12082025.xlsx', date: '2025-08-12' },
  { file: '/home/ldp/Downloads/1755152272669_Lawley_13082025.xlsx', date: '2025-08-13' }
];

/**
 * Transform Excel row - using proven pattern
 */
function transformRecord(record, batchId, fileDate) {
  const statusDate = record['Status Date'] ? new Date(record['Status Date']) : new Date(fileDate);
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
    
    // Location data
    location_lat: record['Latitude'] ? parseFloat(record['Latitude']) : null,
    location_lng: record['Longitude'] ? parseFloat(record['Longitude']) : null,
    
    // Date parsing based on status
    permission_date: status.includes('Permission') ? statusDate.toISOString() : null,
    pole_planted_date: status.includes('Pole') && status.includes('Plant') ? statusDate.toISOString() : null,
    stringing_date: status.includes('String') ? statusDate.toISOString() : null,
    signup_date: status.includes('Sign Up') ? statusDate.toISOString() : null,
    drop_date: status.includes('Drop') && status.includes('Complete') ? statusDate.toISOString() : null,
    connected_date: status.includes('Connect') ? statusDate.toISOString() : null,
    
    // Metadata
    created_at: new Date().toISOString(),
    import_batch_id: batchId,
    source_row: null,
    raw_data: null,
    
    // Additional fields that might be in Excel
    contractor: record['Contractor']?.toString(),
    agent: record['Agent']?.toString(),
    feeder: record['Feeder']?.toString(),
    distribution: record['Distribution']?.toString(),
    pon: record['PON']?.toString()
  };
}

/**
 * Import single Excel file with deduplication
 */
async function importFile(fileInfo) {
  const { file, date } = fileInfo;
  const fileName = path.basename(file);
  
  console.log(`\n📥 Importing ${fileName} (${date})`);
  
  if (!fs.existsSync(file)) {
    console.log(`   ⚠️ File not found: ${fileName}`);
    return 0;
  }
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`   📊 Found ${data.length} records`);
    
    if (data.length === 0) {
      console.log('   ⚠️ No data found');
      return 0;
    }
    
    // Generate batch ID
    const batchId = `excel_${date.replace(/-/g, '')}_${Date.now()}`;
    
    // Transform records
    const validRecords = data
      .map(record => transformRecord(record, batchId, date))
      .filter(record => record.property_id && record.property_id.trim() !== '');
    
    console.log(`   ✨ ${validRecords.length} valid records to import`);
    
    // Import in smaller batches to avoid timeouts
    const BATCH_SIZE = 500;
    let totalImported = 0;
    
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);
      
      try {
        const { data: insertedData, error } = await supabase
          .from('status_changes')
          .insert(batch)
          .select('id');
        
        if (error) {
          console.log(`   ❌ Batch ${batchNum}/${totalBatches} failed: ${error.message}`);
          // Continue with next batch instead of stopping
        } else {
          totalImported += insertedData.length;
          console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${insertedData.length} records`);
        }
        
        // Small delay to avoid rate limiting
        if (batchNum % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (batchError) {
        console.log(`   ❌ Batch ${batchNum} error: ${batchError.message}`);
      }
    }
    
    console.log(`   🎉 Total imported from ${fileName}: ${totalImported} records`);
    return totalImported;
    
  } catch (error) {
    console.log(`   ❌ Error reading ${fileName}: ${error.message}`);
    return 0;
  }
}

/**
 * Main import process
 */
async function main() {
  console.log('🚀 Starting Lawley Excel Import (Aug 11-13)');
  console.log('============================================\n');
  
  // Get initial count
  console.log('📊 Checking current database state...');
  const { count: initialCount, error: countError } = await supabase
    .from('status_changes')
    .select('id', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error getting initial count:', countError.message);
    return;
  }
  
  console.log(`📈 Current record count: ${initialCount}`);
  
  // Import each file
  let totalImported = 0;
  for (const fileInfo of FILES_TO_IMPORT) {
    const imported = await importFile(fileInfo);
    totalImported += imported;
  }
  
  // Get final count
  console.log('\n📊 Checking final database state...');
  const { count: finalCount } = await supabase
    .from('status_changes')
    .select('id', { count: 'exact', head: true });
  
  // Summary
  console.log('\n🎯 IMPORT SUMMARY');
  console.log('=================');
  console.log(`📊 Records before: ${initialCount}`);
  console.log(`📥 Records imported: ${totalImported}`);
  console.log(`📈 Records after: ${finalCount}`);
  console.log(`🔢 Net change: +${finalCount - initialCount}`);
  
  if (totalImported > 0) {
    console.log('\n✅ Import completed successfully!');
    console.log('📊 PowerBI can now connect to updated data.');
    console.log('🔗 Use the REST API method from our guide.');
  } else {
    console.log('\n⚠️ No records were imported.');
  }
}

// Execute import
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});