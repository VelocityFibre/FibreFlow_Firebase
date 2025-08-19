const XLSX = require('xlsx');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Configuration
const NEON_CONNECTION_STRING = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL;
const EXCEL_FILE_PATH = process.argv[2] || '/home/ldp/Downloads/Nokia Export.xlsx';
const BATCH_SIZE = 100; // Insert records in batches for performance

if (!NEON_CONNECTION_STRING) {
  console.error('❌ Error: NEON_CONNECTION_STRING environment variable is required');
  process.exit(1);
}

// Initialize Neon connection
const sql = neon(NEON_CONNECTION_STRING);

console.log('🚀 Nokia Excel Import Script');
console.log('='.repeat(50));
console.log(`📁 File: ${EXCEL_FILE_PATH}`);
console.log(`🗄️  Database: ${NEON_CONNECTION_STRING.split('@')[1]?.split('/')[0] || 'Neon'}`);

async function main() {
  try {
    // Check if table exists
    console.log('\n🔍 Checking database table...');
    const tableExists = await checkTableExists();
    
    if (!tableExists) {
      console.log('⚠️  Table "nokia_data" does not exist. Creating it now...');
      await createTable();
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table "nokia_data" exists');
    }
    
    // Read and validate Excel file
    console.log('\n📊 Reading Excel file...');
    const data = readExcelFile(EXCEL_FILE_PATH);
    
    if (data.length === 0) {
      console.log('⚠️  No data found in Excel file');
      return;
    }
    
    console.log(`📈 Found ${data.length} records to import`);
    
    // Generate import batch ID
    const importBatchId = `import-${Date.now()}`;
    console.log(`🏷️  Import Batch ID: ${importBatchId}`);
    
    // Transform and validate data
    console.log('\n🔧 Transforming data...');
    const transformedData = data.map((row, index) => transformRow(row, importBatchId, index + 1));
    
    // Filter out invalid rows
    const validData = transformedData.filter(row => row !== null);
    const errorCount = transformedData.length - validData.length;
    
    console.log(`✅ Valid records: ${validData.length}`);
    if (errorCount > 0) {
      console.log(`⚠️  Skipped invalid records: ${errorCount}`);
    }
    
    // Import data in batches
    console.log('\n💾 Importing data to Neon database...');
    let importedCount = 0;
    
    for (let i = 0; i < validData.length; i += BATCH_SIZE) {
      const batch = validData.slice(i, i + BATCH_SIZE);
      await insertBatch(batch);
      importedCount += batch.length;
      
      console.log(`   Imported ${importedCount}/${validData.length} records...`);
    }
    
    // Generate summary
    console.log('\n📋 Import Summary:');
    console.log(`   Total Excel records: ${data.length}`);
    console.log(`   Valid records: ${validData.length}`);
    console.log(`   Invalid records: ${errorCount}`);
    console.log(`   Successfully imported: ${importedCount}`);
    console.log(`   Import batch: ${importBatchId}`);
    
    // Show sample of imported data
    console.log('\n🔍 Sample of imported data:');
    const sampleData = await sql`
      SELECT drop_number, serial_number, status, ont_rx_signal_dbm, team, measurement_date
      FROM nokia_data 
      WHERE import_batch_id = ${importBatchId}
      LIMIT 5
    `;
    
    sampleData.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.drop_number} | ${row.serial_number} | ${row.status} | ${row.ont_rx_signal_dbm}dBm | ${row.team}`);
    });
    
    console.log('\n🎉 Import completed successfully!');
    console.log(`\n🌐 View data at: https://fibreflow-73daf.web.app/nokia-data`);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function checkTableExists() {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nokia_data'
      );
    `;
    return result[0].exists;
  } catch (error) {
    console.error('Error checking table existence:', error.message);
    return false;
  }
}

async function createTable() {
  const createTableSQL = `
    CREATE TABLE nokia_data (
      id SERIAL PRIMARY KEY,
      project_id TEXT,
      drop_number TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      olt_address TEXT,
      ont_rx_signal_dbm DECIMAL(8,3),
      link_budget_ont_olt_db DECIMAL(8,3),
      olt_rx_signal_dbm DECIMAL(8,3),
      link_budget_olt_ont_db DECIMAL(8,3),
      current_ont_rx DECIMAL(8,3),
      status TEXT,
      team TEXT,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      measurement_timestamp DECIMAL(12,8),
      measurement_date DATE,
      import_batch_id TEXT NOT NULL,
      imported_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT unique_drop_serial_date UNIQUE(drop_number, serial_number, measurement_date)
    );
    
    CREATE INDEX idx_nokia_data_drop_number ON nokia_data(drop_number);
    CREATE INDEX idx_nokia_data_serial_number ON nokia_data(serial_number);
    CREATE INDEX idx_nokia_data_status ON nokia_data(status);
    CREATE INDEX idx_nokia_data_team ON nokia_data(team);
    CREATE INDEX idx_nokia_data_measurement_date ON nokia_data(measurement_date);
    CREATE INDEX idx_nokia_data_import_batch ON nokia_data(import_batch_id);
  `;
  
  await sql.unsafe(createTableSQL);
}

function readExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    return data;
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
}

function transformRow(row, importBatchId, rowNumber) {
  try {
    // Parse signal strength values
    function parseSignal(value) {
      if (!value || value === '' || value === 'NULL') return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    
    // Parse date
    function parseDate(dateStr) {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    }
    
    // Required fields validation
    if (!row['Drop Number'] || !row['Serial Number']) {
      console.log(`   Row ${rowNumber}: Missing required fields (Drop Number or Serial Number)`);
      return null;
    }
    
    return {
      drop_number: row['Drop Number']?.toString() || null,
      serial_number: row['Serial Number']?.toString() || null,
      olt_address: row['OLT Address']?.toString() || null,
      ont_rx_signal_dbm: parseSignal(row['ONT Rx SIG (dBm)']),
      link_budget_ont_olt_db: parseSignal(row['Link Budget ONT->OLT (dB)']),
      olt_rx_signal_dbm: parseSignal(row['OLT Rx SIG (dBm)']),
      link_budget_olt_ont_db: parseSignal(row['Link Budget OLT->ONT (dB)']),
      current_ont_rx: parseSignal(row['Current ONT RX']),
      status: row['Status']?.toString() || null,
      team: row['Team']?.toString() || null,
      latitude: typeof row['Latitude'] === 'number' ? row['Latitude'] : null,
      longitude: typeof row['Longitude'] === 'number' ? row['Longitude'] : null,
      measurement_timestamp: typeof row['Timestamp'] === 'number' ? row['Timestamp'] : null,
      measurement_date: parseDate(row['Date']),
      import_batch_id: importBatchId
    };
  } catch (error) {
    console.log(`   Row ${rowNumber}: Transformation error - ${error.message}`);
    return null;
  }
}

async function insertBatch(batch) {
  if (batch.length === 0) return;
  
  // Build the VALUES clause for batch insert
  const valuesClauses = batch.map((_, index) => {
    const baseIndex = index * 14; // 14 fields per record
    const placeholders = Array.from({ length: 14 }, (_, i) => `$${baseIndex + i + 1}`);
    return `(${placeholders.join(', ')})`;
  });
  
  // Flatten all values
  const allValues = batch.flatMap(row => [
    row.drop_number,
    row.serial_number,
    row.olt_address,
    row.ont_rx_signal_dbm,
    row.link_budget_ont_olt_db,
    row.olt_rx_signal_dbm,
    row.link_budget_olt_ont_db,
    row.current_ont_rx,
    row.status,
    row.team,
    row.latitude,
    row.longitude,
    row.measurement_timestamp,
    row.measurement_date,
    row.import_batch_id
  ]);
  
  const insertSQL = `
    INSERT INTO nokia_data (
      drop_number, serial_number, olt_address, ont_rx_signal_dbm, 
      link_budget_ont_olt_db, olt_rx_signal_dbm, link_budget_olt_ont_db, 
      current_ont_rx, status, team, latitude, longitude, 
      measurement_timestamp, measurement_date, import_batch_id
    ) VALUES ${valuesClauses.join(', ')}
    ON CONFLICT (drop_number, serial_number, measurement_date) 
    DO UPDATE SET
      ont_rx_signal_dbm = EXCLUDED.ont_rx_signal_dbm,
      current_ont_rx = EXCLUDED.current_ont_rx,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
  
  await sql.unsafe(insertSQL, allValues);
}

// Run the import
if (require.main === module) {
  main();
}