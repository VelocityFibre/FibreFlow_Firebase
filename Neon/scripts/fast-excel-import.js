#!/usr/bin/env node

/**
 * Fast Excel Import - Batch processing for large files
 */

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool',
  ssl: { rejectUnauthorized: false }
};

async function fastImportExcel(filePath) {
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
    
    console.log('⚡ FAST EXCEL IMPORT - BATCH PROCESSING');
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
    
    // Get all existing property IDs to avoid lookups
    console.log('📥 Loading existing records...');
    const existingQuery = `SELECT property_id, status FROM status_changes`;
    const existingResult = await client.query(existingQuery);
    const existingMap = new Map();
    existingResult.rows.forEach(row => {
      existingMap.set(row.property_id, row.status);
    });
    console.log(`   Found ${existingMap.size} existing records\n`);
    
    // Process in batches
    const BATCH_SIZE = 1000;
    const newRecords = [];
    const updates = [];
    const statusChanges = [];
    
    console.log('📤 Processing data...');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const propertyId = String(row['Property ID']);
      
      if (!propertyId) {
        stats.errors++;
        continue;
      }
      
      // Prepare data
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
      
      const existingStatus = existingMap.get(propertyId);
      
      if (existingStatus !== undefined) {
        // Record exists
        if (existingStatus !== rowData.status && rowData.status) {
          // Status changed
          updates.push(rowData);
          statusChanges.push({
            property_id: propertyId,
            pole_number: rowData.pole_number,
            old_status: existingStatus,
            new_status: rowData.status,
            import_batch_id: batchId
          });
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } else {
        // New record
        newRecords.push(rowData);
        if (rowData.status) {
          statusChanges.push({
            property_id: propertyId,
            pole_number: rowData.pole_number,
            old_status: null,
            new_status: rowData.status,
            import_batch_id: batchId
          });
        }
        stats.new++;
      }
      
      // Process batches
      if ((i + 1) % BATCH_SIZE === 0 || i === data.length - 1) {
        await processBatches(client, newRecords, updates, statusChanges);
        console.log(`   Processed ${i + 1}/${data.length} rows (New: ${stats.new}, Updated: ${stats.updated}, Skipped: ${stats.skipped})`);
        
        // Clear arrays
        newRecords.length = 0;
        updates.length = 0;
        statusChanges.length = 0;
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
    
    // Show some recent status changes
    if (stats.updated > 0 || stats.new > 0) {
      const recentChanges = await client.query(`
        SELECT property_id, pole_number, old_status, new_status
        FROM status_history
        WHERE import_batch_id = $1
        ORDER BY changed_at DESC
        LIMIT 10
      `, [batchId]);
      
      if (recentChanges.rows.length > 0) {
        console.log('\n📋 Sample Status Changes:');
        recentChanges.rows.forEach(change => {
          const oldStatus = change.old_status || '[New Record]';
          const pole = change.pole_number || '[No Pole]';
          console.log(`   ${change.property_id} (${pole}): ${oldStatus} → ${change.new_status}`);
        });
      }
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    
    try {
      await client.query(`
        UPDATE import_batches 
        SET status = 'failed'
        WHERE id = $1
      `, [batchId]);
    } catch (updateError) {
      // Ignore batch update error
    }
    
    throw error;
  } finally {
    await client.end();
  }
}

// Process batches of records
async function processBatches(client, newRecords, updates, statusChanges) {
  try {
    // Insert new records
    if (newRecords.length > 0) {
      await bulkInsert(client, 'status_changes', newRecords);
    }
    
    // Update existing records
    if (updates.length > 0) {
      for (const update of updates) {
        const updateFields = Object.keys(update).filter(k => update[k] !== null && k !== 'property_id');
        const updateValues = updateFields.map(k => update[k]);
        const setClause = updateFields.map((f, idx) => `${f} = $${idx + 2}`).join(', ');
        
        await client.query(`
          UPDATE status_changes 
          SET ${setClause}
          WHERE property_id = $1
        `, [update.property_id, ...updateValues]);
      }
    }
    
    // Insert status history
    if (statusChanges.length > 0) {
      await bulkInsert(client, 'status_history', statusChanges);
    }
    
  } catch (error) {
    console.error('Error processing batch:', error.message);
    throw error;
  }
}

// Bulk insert function
async function bulkInsert(client, tableName, records) {
  if (records.length === 0) return;
  
  const sampleRecord = records[0];
  let columns = Object.keys(sampleRecord);
  
  // Exclude 'id' column if present - let database auto-generate
  columns = columns.filter(col => col !== 'id');
  
  const values = [];
  const placeholders = [];
  
  records.forEach((record, recordIndex) => {
    const recordPlaceholders = columns.map((_, colIndex) => 
      `$${recordIndex * columns.length + colIndex + 1}`
    );
    placeholders.push(`(${recordPlaceholders.join(', ')})`);
    
    columns.forEach(col => {
      values.push(record[col]);
    });
  });
  
  const query = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES ${placeholders.join(', ')}
  `;
  
  await client.query(query, values);
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
    console.log('Usage: node fast-excel-import.js <excel-file-path>');
    console.log('\nExample:');
    console.log('  node fast-excel-import.js /home/ldp/Downloads/Lawley_11082025.xlsx');
    return;
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  
  try {
    const startTime = Date.now();
    await fastImportExcel(filePath);
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n🎉 Import completed successfully in ${duration} seconds!`);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}