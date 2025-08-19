#!/usr/bin/env node

const XLSX = require('xlsx');
const { Client } = require('pg');
const path = require('path');

console.log('🔄 Nokia Excel Import - Robust Version');
console.log('======================================\n');

const EXCEL_FILE = process.argv[2] || '/home/ldp/Downloads/Nokia Export.xlsx';
const BATCH_SIZE = 25; // Smaller batches for reliability
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const QUERY_TIMEOUT = 20000; // 20 seconds

const connectionConfig = {
  connectionString: process.env.NEON_CONNECTION_STRING || 
    'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  query_timeout: QUERY_TIMEOUT,
  statement_timeout: QUERY_TIMEOUT,
};

async function robustImport() {
  const client = new Client(connectionConfig);
  
  try {
    console.log('📁 Reading Excel file:', EXCEL_FILE);
    
    // Check file exists
    const fs = require('fs');
    if (!fs.existsSync(EXCEL_FILE)) {
      throw new Error(`Excel file not found: ${EXCEL_FILE}`);
    }
    
    // Read Excel
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} total records`);
    
    // Filter valid records only
    const validRecords = [];
    let skippedCount = 0;
    
    data.forEach((row, index) => {
      const dropNumber = (row['Drop Number'] || '').toString().trim();
      const serialNumber = (row['Serial Number'] || '').toString().trim();
      
      if (dropNumber && serialNumber) {
        const transformedRow = {
          drop_number: dropNumber,
          serial_number: serialNumber,
          olt_address: (row['OLT Address'] || '').toString(),
          ont_rx_signal_dbm: parseFloat(row['ONT Rx SIG (dBm)']) || null,
          link_budget_ont_olt_db: parseFloat(row['Link Budget ONT->OLT (dB)']) || null,
          olt_rx_signal_dbm: parseFloat(row['OLT Rx SIG (dBm)']) || null,
          link_budget_olt_ont_db: parseFloat(row['Link Budget OLT->ONT (dB)']) || null,
          status: (row['Status'] || 'Unknown').toString(),
          latitude: parseFloat(row['Latitude']) || null,
          longitude: parseFloat(row['Longitude']) || null,
          current_ont_rx: parseFloat(row['Current ONT RX']) || null,
          team: (row['Team'] || '').toString(),
          measurement_date: row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : null,
          import_batch_id: `import-${Date.now()}`
        };
        validRecords.push(transformedRow);
      } else {
        skippedCount++;
      }
    });
    
    console.log(`✅ Valid records to import: ${validRecords.length}`);
    console.log(`⏭️  Skipped records (missing Drop/Serial): ${skippedCount}`);
    
    if (validRecords.length === 0) {
      console.log('❌ No valid records found to import');
      return;
    }
    
    // Connect to database
    console.log('\n🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected');
    
    // Check current count
    const countResult = await client.query('SELECT COUNT(*) as count FROM nokia_data');
    const existingCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Existing records in database: ${existingCount}`);
    
    // Import in small batches
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);
      
      console.log(`\n⏳ Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      try {
        // Build batch insert query
        const values = [];
        const placeholders = [];
        
        batch.forEach((record, index) => {
          const baseIndex = index * 14;
          placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14})`);
          
          values.push(
            record.drop_number,
            record.serial_number,
            record.olt_address,
            record.ont_rx_signal_dbm,
            record.link_budget_ont_olt_db,
            record.olt_rx_signal_dbm,
            record.link_budget_olt_ont_db,
            record.status,
            record.latitude,
            record.longitude,
            record.current_ont_rx,
            record.team,
            record.measurement_date,
            record.import_batch_id
          );
        });
        
        const insertQuery = `
          INSERT INTO nokia_data (
            drop_number, serial_number, olt_address, ont_rx_signal_dbm,
            link_budget_ont_olt_db, olt_rx_signal_dbm, link_budget_olt_ont_db,
            status, latitude, longitude, current_ont_rx, team, measurement_date, import_batch_id
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (drop_number) DO UPDATE SET
            serial_number = EXCLUDED.serial_number,
            ont_rx_signal_dbm = EXCLUDED.ont_rx_signal_dbm,
            status = EXCLUDED.status,
            team = EXCLUDED.team,
            measurement_date = EXCLUDED.measurement_date,
            import_batch_id = EXCLUDED.import_batch_id
        `;
        
        await client.query(insertQuery, values);
        successCount += batch.length;
        console.log(`✅ Batch ${batchNum} completed successfully`);
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        errorCount += batch.length;
        
        // Try individual inserts for this batch
        console.log('🔄 Trying individual record inserts...');
        for (const record of batch) {
          try {
            await client.query(`
              INSERT INTO nokia_data (
                drop_number, serial_number, olt_address, ont_rx_signal_dbm,
                link_budget_ont_olt_db, olt_rx_signal_dbm, link_budget_olt_ont_db,
                status, latitude, longitude, current_ont_rx, team, measurement_date, import_batch_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (drop_number) DO UPDATE SET
                serial_number = EXCLUDED.serial_number,
                ont_rx_signal_dbm = EXCLUDED.ont_rx_signal_dbm,
                status = EXCLUDED.status,
                team = EXCLUDED.team,
                measurement_date = EXCLUDED.measurement_date,
                import_batch_id = EXCLUDED.import_batch_id
            `, [
              record.drop_number, record.serial_number, record.olt_address,
              record.ont_rx_signal_dbm, record.link_budget_ont_olt_db,
              record.olt_rx_signal_dbm, record.link_budget_olt_ont_db,
              record.status, record.latitude, record.longitude,
              record.current_ont_rx, record.team, record.measurement_date,
              record.import_batch_id
            ]);
            successCount++;
            errorCount--;
          } catch (individualError) {
            console.error(`❌ Failed to insert record ${record.drop_number}:`, individualError.message);
          }
        }
      }
    }
    
    // Final verification
    const finalCountResult = await client.query('SELECT COUNT(*) as count FROM nokia_data');
    const finalCount = parseInt(finalCountResult.rows[0].count);
    
    console.log('\n🎉 Import Complete!');
    console.log('==================');
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);
    console.log(`📊 Total records in database: ${finalCount}`);
    console.log(`📈 Records added this import: ${finalCount - existingCount}`);
    
    // Sample verification
    const sampleResult = await client.query('SELECT drop_number, serial_number, status, team FROM nokia_data ORDER BY id DESC LIMIT 3');
    console.log('\n📋 Sample imported records:');
    console.table(sampleResult.rows);
    
    console.log('\n🌐 View your data at: https://fibreflow-73daf.web.app/nokia-data');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    try {
      await client.end();
      console.log('\n🔌 Database connection closed');
    } catch (e) {
      // Ignore close errors
    }
  }
}

robustImport();