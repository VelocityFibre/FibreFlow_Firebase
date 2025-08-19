#!/usr/bin/env node

const XLSX = require('xlsx');
const { neon, neonConfig } = require('@neondatabase/serverless');

console.log('🚀 Nokia Import - Neon Serverless Version');
console.log('=========================================\n');

const EXCEL_FILE = process.argv[2] || '/home/ldp/Downloads/Nokia Export.xlsx';
const BATCH_SIZE = 10; // Very small batches for serverless

// Configure Neon like the Angular service
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.NEON_CONNECTION_STRING || 
  'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

async function serverlessImport() {
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
    
    console.log(`📊 Found ${data.length} total records in Excel`);
    
    // Test connection first
    console.log('🔌 Testing Neon serverless connection...');
    const testResult = await sql`SELECT 1 as test, NOW() as current_time`;
    console.log('✅ Connection successful!', testResult[0]);
    
    // Check current table status
    const countResult = await sql`SELECT COUNT(*) as count FROM nokia_data`;
    const existingCount = parseInt(countResult[0].count);
    console.log(`📊 Existing records in database: ${existingCount}`);
    
    // Filter and prepare valid records
    const validRecords = [];
    let skippedCount = 0;
    
    data.forEach((row, index) => {
      const dropNumber = (row['Drop Number'] || '').toString().trim();
      const serialNumber = (row['Serial Number'] || '').toString().trim();
      
      if (dropNumber && serialNumber) {
        validRecords.push({
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
          import_batch_id: `serverless-${Date.now()}`
        });
      } else {
        skippedCount++;
      }
    });
    
    console.log(`✅ Valid records to import: ${validRecords.length}`);
    console.log(`⏭️  Skipped records (missing required fields): ${skippedCount}`);
    
    if (validRecords.length === 0) {
      console.log('❌ No valid records found to import');
      return;
    }
    
    // Import in very small batches using serverless approach
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`\n⏳ Starting import in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      try {
        // Insert records individually using Neon serverless
        for (const record of batch) {
          try {
            await sql`
              INSERT INTO nokia_data (
                drop_number, serial_number, olt_address, ont_rx_signal_dbm,
                link_budget_ont_olt_db, olt_rx_signal_dbm, link_budget_olt_ont_db,
                status, latitude, longitude, current_ont_rx, team, measurement_date, import_batch_id
              ) VALUES (
                ${record.drop_number}, ${record.serial_number}, ${record.olt_address},
                ${record.ont_rx_signal_dbm}, ${record.link_budget_ont_olt_db},
                ${record.olt_rx_signal_dbm}, ${record.link_budget_olt_ont_db},
                ${record.status}, ${record.latitude}, ${record.longitude},
                ${record.current_ont_rx}, ${record.team}, ${record.measurement_date},
                ${record.import_batch_id}
              )
              ON CONFLICT (drop_number) DO UPDATE SET
                serial_number = EXCLUDED.serial_number,
                ont_rx_signal_dbm = EXCLUDED.ont_rx_signal_dbm,
                status = EXCLUDED.status,
                team = EXCLUDED.team,
                measurement_date = EXCLUDED.measurement_date,
                import_batch_id = EXCLUDED.import_batch_id
            `;
            successCount++;
          } catch (recordError) {
            console.error(`❌ Failed to insert ${record.drop_number}:`, recordError.message);
            errorCount++;
          }
        }
        
        console.log(`✅ Batch ${batchNum} completed successfully`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (batchError) {
        console.error(`❌ Batch ${batchNum} failed:`, batchError.message);
        errorCount += batch.length;
      }
    }
    
    // Final verification
    const finalCountResult = await sql`SELECT COUNT(*) as count FROM nokia_data`;
    const finalCount = parseInt(finalCountResult[0].count);
    
    console.log('\n🎉 Import Complete!');
    console.log('==================');
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);
    console.log(`📊 Total records in database: ${finalCount}`);
    console.log(`📈 Records added this import: ${finalCount - existingCount}`);
    
    // Sample verification
    const sampleResult = await sql`
      SELECT drop_number, serial_number, status, team 
      FROM nokia_data 
      ORDER BY id DESC 
      LIMIT 3
    `;
    console.log('\n📋 Sample imported records:');
    console.table(sampleResult);
    
    console.log('\n🌐 View your data at: https://fibreflow-73daf.web.app/nokia-data');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Error details:', error);
  }
}

serverlessImport();