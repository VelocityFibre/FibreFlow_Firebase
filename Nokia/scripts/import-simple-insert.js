#!/usr/bin/env node

const XLSX = require('xlsx');
const { neon, neonConfig } = require('@neondatabase/serverless');

console.log('📥 Nokia Import - Simple Insert Version');
console.log('======================================\n');

const EXCEL_FILE = process.argv[2] || '/home/ldp/Downloads/Nokia Export.xlsx';

// Configure Neon like the Angular service
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.NEON_CONNECTION_STRING || 
  'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

async function simpleImport() {
  try {
    console.log('📁 Reading Excel file:', EXCEL_FILE);
    
    // Read Excel
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} total records in Excel`);
    
    // Test connection
    console.log('🔌 Testing connection...');
    const testResult = await sql`SELECT COUNT(*) as count FROM nokia_data`;
    console.log(`✅ Connected! Current record count: ${testResult[0].count}`);
    
    // Filter valid records
    const validRecords = [];
    
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
          import_batch_id: `batch-${Date.now()}`
        });
      }
    });
    
    console.log(`✅ Valid records to import: ${validRecords.length}`);
    console.log(`⏭️  Skipping invalid records: ${data.length - validRecords.length}`);
    
    if (validRecords.length === 0) {
      console.log('❌ No valid records to import');
      return;
    }
    
    // Simple individual inserts (no conflict resolution)
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n⏳ Importing records...');
    
    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      const progress = i + 1;
      
      if (progress % 50 === 0 || progress === validRecords.length) {
        console.log(`📈 Progress: ${progress}/${validRecords.length} (${Math.round(progress/validRecords.length * 100)}%)`);
      }
      
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
        `;
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to insert ${record.drop_number}: ${error.message}`);
        errorCount++;
        
        // Stop after too many errors
        if (errorCount > 10) {
          console.log('⏹️  Too many errors, stopping import');
          break;
        }
      }
      
      // Small delay to avoid overwhelming the database
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Final count
    const finalResult = await sql`SELECT COUNT(*) as count FROM nokia_data`;
    const finalCount = parseInt(finalResult[0].count);
    
    console.log('\n🎉 Import Summary:');
    console.log('==================');
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Failed imports: ${errorCount} records`);
    console.log(`📊 Total records now in database: ${finalCount}`);
    
    // Show sample data
    if (finalCount > 0) {
      const sample = await sql`
        SELECT drop_number, serial_number, status, team 
        FROM nokia_data 
        ORDER BY id DESC 
        LIMIT 3
      `;
      console.log('\n📋 Sample records:');
      console.table(sample);
    }
    
    console.log('\n🌐 View your data at: https://fibreflow-73daf.web.app/nokia-data');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
  }
}

simpleImport();