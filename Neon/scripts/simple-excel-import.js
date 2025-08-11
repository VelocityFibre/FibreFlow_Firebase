#!/usr/bin/env node

/**
 * Simple Excel Import - Compatible with existing table structure
 */

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function importExcel(filePath) {
  const client = new Client(NEON_CONFIG);
  const filename = path.basename(filePath);
  const batchId = `BATCH_${Date.now()}_${filename}`;
  
  let stats = {
    total: 0,
    new: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    console.log('📄 SIMPLE EXCEL IMPORT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`File: ${filename}`);
    console.log(`Batch ID: ${batchId}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    stats.total = data.length;
    console.log(`📊 Found ${data.length} rows to process\n`);
    
    // Create batch record
    await client.query(
      `INSERT INTO import_batches (id, filename, import_date, total_rows, status) VALUES ($1, $2, NOW(), $3, 'in_progress')`,
      [batchId, filename, stats.total]
    );
    
    console.log('📤 Processing rows...\n');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const propertyId = String(row['Property ID']);
      
      if (!propertyId) {
        stats.errors++;
        continue;
      }
      
      try {
        // Check if record exists
        const existingQuery = `SELECT id, status FROM status_changes WHERE property_id = $1`;
        const existing = await client.query(existingQuery, [propertyId]);
        
        // Prepare data for insert/update
        const rowData = {
          property_id: propertyId,
          pole_number: row['Pole Number'] || null,
          drop_number: row['Drop Number'] || null,
          status: row['Status'] || null,
          address: row['Location Address'] || row['Address'] || null,
          zone: row['Zone'] || null,
          pon: row['PON'] || row['PONs'] || null,
          agent_name: row['Agent Name'] || null,
          permission_date: parseDate(row['Permission Date']),
          signup_date: parseDate(row['Signup Date']),
          project_name: row['Project Name'] || 'Lawley',
          import_batch_id: batchId
        };
        
        if (existing.rows.length > 0) {
          // Record exists - check for status change
          const oldStatus = existing.rows[0].status;
          const newStatus = rowData.status;
          
          if (oldStatus !== newStatus && newStatus) {
            // Status changed - record in history and update
            await client.query(`
              INSERT INTO status_history (property_id, pole_number, old_status, new_status, import_batch_id)
              VALUES ($1, $2, $3, $4, $5)
            `, [propertyId, rowData.pole_number, oldStatus, newStatus, batchId]);
            
            // Update the main record
            const updateFields = Object.keys(rowData).filter(k => rowData[k] !== null && k !== 'property_id');
            const updateValues = updateFields.map(k => rowData[k]);
            const setClause = updateFields.map((f, idx) => `${f} = $${idx + 2}`).join(', ');
            
            await client.query(`
              UPDATE status_changes 
              SET ${setClause}
              WHERE property_id = $1
            `, [propertyId, ...updateValues]);
            
            stats.updated++;
            console.log(`📝 Updated: ${propertyId} - Status: ${oldStatus} → ${newStatus}`);
          } else {
            stats.skipped++;
          }
        } else {
          // New record
          const fields = Object.keys(rowData).filter(k => rowData[k] !== null);
          const values = fields.map(k => rowData[k]);
          const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');
          
          await client.query(`
            INSERT INTO status_changes (${fields.join(', ')})
            VALUES (${placeholders})
          `, values);
          
          // Record initial status in history
          if (rowData.status) {
            await client.query(`
              INSERT INTO status_history (property_id, pole_number, old_status, new_status, import_batch_id)
              VALUES ($1, $2, $3, $4, $5)
            `, [propertyId, rowData.pole_number, null, rowData.status, batchId]);
          }
          
          stats.new++;
          console.log(`✅ New: ${propertyId} - Status: ${rowData.status}`);
        }
        
      } catch (rowError) {
        console.error(`❌ Error on row ${i + 2}: ${rowError.message}`);
        stats.errors++;
      }
      
      // Progress update every 500 rows
      if ((i + 1) % 500 === 0) {
        console.log(`   Progress: ${i + 1}/${data.length} rows processed...`);
      }
    }
    
    // Update batch record
    await client.query(`
      UPDATE import_batches 
      SET status = 'completed', processed_rows = $2, error_rows = $3
      WHERE id = $1
    `, [batchId, stats.new + stats.updated, stats.errors]);
    
    // Final report
    console.log('\n\n📊 IMPORT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Rows: ${stats.total}`);
    console.log(`✅ New Records: ${stats.new}`);
    console.log(`📝 Updated Records: ${stats.updated}`);
    console.log(`⏭️  Skipped (No Changes): ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    
    // Show recent status changes
    const recentChanges = await client.query(`
      SELECT property_id, pole_number, old_status, new_status, changed_at
      FROM status_history
      WHERE import_batch_id = $1
      ORDER BY changed_at DESC
      LIMIT 10
    `, [batchId]);
    
    if (recentChanges.rows.length > 0) {
      console.log('\n📋 Recent Status Changes:');
      recentChanges.rows.forEach(change => {
        const oldStatus = change.old_status || '[New Record]';
        const pole = change.pole_number || '[No Pole]';
        console.log(`   ${change.property_id} (${pole}): ${oldStatus} → ${change.new_status}`);
      });
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    
    // Update batch record with error
    await client.query(`
      UPDATE import_batches 
      SET status = 'failed'
      WHERE id = $1
    `, [batchId]);
    
    throw error;
  } finally {
    await client.end();
  }
}

// Parse date safely
function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node simple-excel-import.js <excel-file-path>');
    console.log('\nExample:');
    console.log('  node simple-excel-import.js /home/ldp/Downloads/Lawley_11082025.xlsx');
    return;
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  
  try {
    await importExcel(filePath);
    console.log('\n🎉 Import completed successfully!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importExcel };