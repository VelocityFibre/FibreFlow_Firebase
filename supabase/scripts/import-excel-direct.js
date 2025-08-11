#!/usr/bin/env node

/**
 * Direct Excel Import to Supabase
 * Imports Excel files directly to Supabase with quick validation
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Supabase configuration
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b284Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

if (!supabaseKey) {
  console.error('❌ Missing Supabase API key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Files to import
const FILES_TO_IMPORT = [
  '/home/ldp/Downloads/1754977851352_Lawley_11082025.xlsx',
  '/home/ldp/Downloads/1755069441334_Lawley_12082025.xlsx', 
  '/home/ldp/Downloads/1755152272669_Lawley_13082025.xlsx'
];

/**
 * Transform Excel row to Supabase record
 */
function transformRecord(record, batchId, sourceRow) {
  return {
    property_id: record['Property ID']?.toString(),
    address: record['Address']?.toString(),
    project_name: 'Lawley',
    zone: record['Zone'] ? parseInt(record['Zone']) : null,
    agent_name: record['Agent']?.toString(),
    pole_number: record['Pole Number']?.toString(),
    drop_number: record['Drop Number']?.toString(),
    status: record['Status']?.toString(),
    date_stamp: record['Status Date'] ? new Date(record['Status Date']).toISOString() : new Date().toISOString(),
    
    // Additional fields from Excel
    flow_name_groups: record['Flow Name Groups']?.toString(),
    location_lat: record['Latitude'] ? parseFloat(record['Latitude']) : null,
    location_lng: record['Longitude'] ? parseFloat(record['Longitude']) : null,
    
    // Import metadata
    import_batch_id: batchId,
    source_row: sourceRow,
    created_at: new Date().toISOString(),
    
    // Date extraction based on status
    permission_date: record['Status']?.includes('Permission') ? 
      (record['Status Date'] ? new Date(record['Status Date']).toISOString() : null) : null,
    signup_date: record['Status']?.includes('Sign Up') ? 
      (record['Status Date'] ? new Date(record['Status Date']).toISOString() : null) : null,
    pole_planted_date: record['Status']?.includes('Pole') && record['Status']?.includes('Plant') ? 
      (record['Status Date'] ? new Date(record['Status Date']).toISOString() : null) : null,
    connected_date: record['Status']?.includes('Connect') ? 
      (record['Status Date'] ? new Date(record['Status Date']).toISOString() : null) : null
  };
}

/**
 * Import a single Excel file
 */
async function importExcelFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📥 Importing ${fileName}...`);
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`   📊 Found ${data.length} records`);
    
    if (data.length === 0) {
      console.log('   ⚠️ No data found, skipping');
      return;
    }
    
    // Generate batch ID
    const batchId = `import_${Date.now()}_${fileName.replace('.xlsx', '')}`;
    
    // Transform records
    const transformedRecords = data.map((record, index) => 
      transformRecord(record, batchId, index + 1)
    ).filter(record => record.property_id); // Only include records with property ID
    
    console.log(`   ✨ Transformed ${transformedRecords.length} valid records`);
    
    // Import in batches to avoid timeout
    const BATCH_SIZE = 1000;
    let imported = 0;
    
    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE);
      
      const { data: insertedData, error } = await supabase
        .from('status_changes')
        .insert(batch);
        
      if (error) {
        console.log(`   ❌ Error in batch ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`);
        if (error.details) console.log(`      Details: ${error.details}`);
      } else {
        imported += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} records`);
      }
    }
    
    console.log(`   🎉 Successfully imported ${imported} records from ${fileName}`);
    return imported;
    
  } catch (error) {
    console.log(`   ❌ Error importing ${fileName}: ${error.message}`);
    return 0;
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Direct Excel Import to Supabase\n');
  
  // Get current record count
  const { count: currentCount } = await supabase
    .from('status_changes')
    .select('id', { count: 'exact', head: true });
    
  console.log(`📊 Current Supabase records: ${currentCount}`);
  
  let totalImported = 0;
  
  // Import each file
  for (const filePath of FILES_TO_IMPORT) {
    if (fs.existsSync(filePath)) {
      const imported = await importExcelFile(filePath);
      totalImported += imported;
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  }
  
  // Get final count
  const { count: finalCount } = await supabase
    .from('status_changes')
    .select('id', { count: 'exact', head: true });
  
  console.log(`\n📈 IMPORT SUMMARY:`);
  console.log(`   Before: ${currentCount} records`);
  console.log(`   Imported: ${totalImported} records`); 
  console.log(`   After: ${finalCount} records`);
  console.log(`   Net Change: +${finalCount - currentCount}`);
  
  console.log(`\n✅ Import completed! PowerBI ready to connect.`);
}

// Run the import
main().catch(console.error);