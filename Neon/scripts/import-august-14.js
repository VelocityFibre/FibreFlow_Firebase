#!/usr/bin/env node

/**
 * Import August 14 Excel File with Detailed Feedback
 * Using Neon serverless connection method
 */

const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Connection string (same as test-connection.js)
const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function importExcel(filePath) {
  const sql = neon(connectionString);
  const filename = path.basename(filePath);
  const batchId = `BATCH_${Date.now()}_${filename}`;
  
  console.log('📋 EXCEL IMPORT REPORT - AUGUST 14, 2025');
  console.log('=' .repeat(60));
  console.log(`File: ${filename}`);
  console.log(`Size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Batch ID: ${batchId}`);
  console.log(`Start Time: ${new Date().toISOString()}\n`);
  
  try {
    // Read Excel file
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length.toLocaleString()} rows in Excel\n`);
    
    // Create batch record
    console.log('🔄 Creating import batch record...');
    await sql`
      INSERT INTO import_batches (id, filename, import_date, total_rows, status)
      VALUES (${batchId}, ${filename}, NOW(), ${data.length}, 'in_progress')
    `;
    
    // Get current data for comparison
    console.log('📊 Loading existing data from database...');
    const existingData = await sql`
      SELECT property_id, status, created_at 
      FROM status_changes 
      WHERE property_id IS NOT NULL
    `;
    
    const existingMap = new Map(
      existingData.map(row => [row.property_id, row])
    );
    
    console.log(`✅ Found ${existingData.length.toLocaleString()} existing records\n`);
    
    // Process data
    console.log('🔍 Analyzing changes...');
    let stats = {
      total: data.length,
      new: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    const changes = [];
    const newRecords = [];
    
    for (const row of data) {
      const propertyId = row['Property ID'];
      const status = row['Status'];
      
      if (!propertyId || !status) {
        stats.errors++;
        continue;
      }
      
      const existing = existingMap.get(propertyId);
      
      if (!existing) {
        // New property
        stats.new++;
        newRecords.push({
          property_id: propertyId,
          status: status,
          pole_number: row['Pole Number'] || null,
          drop_number: row['Drop Number'] || null,
          address: row['Location Address'] || null,
          owner_name: row['Owner Name'] || null,
          agent_name: row['Agent Name'] || null,
          suburb: row['Suburb'] || null,
          created_at: new Date()
        });
      } else if (existing.status !== status) {
        // Status changed
        stats.updated++;
        changes.push({
          property_id: propertyId,
          old_status: existing.status,
          new_status: status,
          pole_number: row['Pole Number'] || null
        });
      } else {
        // No change
        stats.skipped++;
      }
    }
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('─'.repeat(40));
    console.log(`Total rows: ${stats.total.toLocaleString()}`);
    console.log(`New properties: ${stats.new.toLocaleString()}`);
    console.log(`Status updates: ${stats.updated.toLocaleString()}`);
    console.log(`Skipped (no changes): ${stats.skipped.toLocaleString()}`);
    console.log(`Errors: ${stats.errors.toLocaleString()}\n`);
    
    // Apply changes
    if (newRecords.length > 0) {
      console.log(`✍️  Inserting ${newRecords.length} new records...`);
      
      // Insert in batches of 100
      for (let i = 0; i < newRecords.length; i += 100) {
        const batch = newRecords.slice(i, i + 100);
        const values = batch.map(r => 
          `(${[
            r.property_id,
            `'${r.status}'`,
            r.pole_number ? `'${r.pole_number}'` : 'NULL',
            r.drop_number ? `'${r.drop_number}'` : 'NULL',
            r.address ? `'${r.address.replace(/'/g, "''")}'` : 'NULL',
            r.owner_name ? `'${r.owner_name.replace(/'/g, "''")}'` : 'NULL',
            r.agent_name ? `'${r.agent_name.replace(/'/g, "''")}'` : 'NULL',
            r.suburb ? `'${r.suburb.replace(/'/g, "''")}'` : 'NULL',
            'NOW()'
          ].join(', ')})`
        ).join(',\n');
        
        await sql.unsafe(`
          INSERT INTO status_changes 
          (property_id, status, pole_number, drop_number, address, owner_name, agent_name, suburb, created_at)
          VALUES ${values}
        `);
      }
      console.log('✅ New records inserted\n');
    }
    
    if (changes.length > 0) {
      console.log(`🔄 Updating ${changes.length} status changes...`);
      
      // Update and track history
      for (const change of changes) {
        // Update current status
        await sql`
          UPDATE status_changes 
          SET status = ${change.new_status}
          WHERE property_id = ${change.property_id}
        `;
        
        // Record in history
        await sql`
          INSERT INTO status_history 
          (property_id, old_status, new_status, changed_at, import_batch_id)
          VALUES (${change.property_id}, ${change.old_status}, ${change.new_status}, NOW(), ${batchId})
        `;
      }
      console.log('✅ Status updates completed\n');
    }
    
    // Update batch record
    await sql`
      UPDATE import_batches 
      SET status = 'completed',
          new_records = ${stats.new},
          updated_records = ${stats.updated},
          skipped_records = ${stats.skipped},
          error_records = ${stats.errors},
          completed_at = NOW()
      WHERE id = ${batchId}
    `;
    
    // Sample of changes for report
    console.log('📝 SAMPLE OF CHANGES:');
    console.log('─'.repeat(60));
    
    if (newRecords.length > 0) {
      console.log('\n🆕 New Properties (first 5):');
      newRecords.slice(0, 5).forEach(r => {
        console.log(`   Property ${r.property_id}: ${r.status}`);
        if (r.pole_number) console.log(`      Pole: ${r.pole_number}`);
      });
    }
    
    if (changes.length > 0) {
      console.log('\n🔄 Status Updates (first 5):');
      changes.slice(0, 5).forEach(c => {
        console.log(`   Property ${c.property_id}: ${c.old_status} → ${c.new_status}`);
        if (c.pole_number) console.log(`      Pole: ${c.pole_number}`);
      });
    }
    
    // Final summary
    console.log('\n✅ IMPORT COMPLETED SUCCESSFULLY');
    console.log('─'.repeat(60));
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log(`Batch ID: ${batchId}`);
    
    // Log to file
    const logEntry = `
## Import Report - August 14, 2025

**File**: ${filename}  
**Date Processed**: ${new Date().toISOString()}  
**Batch ID**: ${batchId}  
**File Size**: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB  

### Results:
- Total Rows: ${stats.total.toLocaleString()}
- New Properties: ${stats.new.toLocaleString()}
- Status Updates: ${stats.updated.toLocaleString()}
- Skipped (No Changes): ${stats.skipped.toLocaleString()}
- Errors: ${stats.errors.toLocaleString()}

### Status: ✅ Completed Successfully

---
`;
    
    const logPath = path.join(__dirname, '..', 'logs', 'import-processing-log.md');
    fs.appendFileSync(logPath, logEntry);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    
    // Update batch status
    try {
      await sql`
        UPDATE import_batches 
        SET status = 'failed', 
            error_message = ${error.message},
            completed_at = NOW()
        WHERE id = ${batchId}
      `;
    } catch (e) {
      // Ignore update error
    }
    
    throw error;
  }
}

// Run import
const filePath = '/home/ldp/Downloads/1755237660935_Lawley_14082025.xlsx';
importExcel(filePath)
  .then(stats => {
    console.log('\n🎉 Import process completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });