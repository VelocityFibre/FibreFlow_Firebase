const Airtable = require('airtable');
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

// SQL Server config
const sqlConfig = {
  server: process.env.AZURE_SQL_SERVER || 'fibreflow.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'fibreflow',
  user: process.env.AZURE_SQL_USER || 'fibreflowadmin',
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    port: 1433
  }
};

// Airtable setup
const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT || 'patEKhZokLJqTadpy.bb45706b4ccc11a26c18a6d3c4510d5e4092db2f38303388d04856916d820b67'
}).base('appkYMgaK0cHVu4Zg');

// Table mappings
const TABLE_MAPPINGS = {
  Projects: {
    airtableFields: {
      'Project Name': 'project_name',
      'Status': 'status',
      'Customer (from Customers)': 'customer_id',
      'Region': 'region',
      'Start Date': 'start_date',
      'Total Homes PO': 'total_homes',
      'Homes Connected': 'homes_connected',
      'Poles Planted': 'poles_planted',
      'Overall Progress %': 'progress_percentage'
    },
    sqlTable: 'projects'
  },
  Customers: {
    airtableFields: {
      'Client Name': 'client_name',
      'Client Type': 'client_type',
      'Total Projects': 'total_projects',
      'Active Projects': 'active_projects'
    },
    sqlTable: 'customers'
  },
  Staff: {
    airtableFields: {
      'Name': 'name',
      'Role': 'role',
      'Department': 'department',
      'Email': 'email',
      'Phone': 'phone'
    },
    sqlTable: 'staff'
  }
};

async function createTables(pool) {
  console.log('Creating SQL tables...');
  
  // Create customers table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customers')
    CREATE TABLE customers (
      id NVARCHAR(255) PRIMARY KEY,
      client_name NVARCHAR(255),
      client_type NVARCHAR(100),
      total_projects INT,
      active_projects INT,
      last_synced DATETIME DEFAULT GETDATE()
    )
  `);

  // Create projects table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects')
    CREATE TABLE projects (
      id NVARCHAR(255) PRIMARY KEY,
      project_name NVARCHAR(255),
      status NVARCHAR(100),
      customer_id NVARCHAR(255),
      region NVARCHAR(100),
      start_date DATE,
      total_homes INT,
      homes_connected INT,
      poles_planted INT,
      progress_percentage FLOAT,
      last_synced DATETIME DEFAULT GETDATE()
    )
  `);

  // Create staff table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'staff')
    CREATE TABLE staff (
      id NVARCHAR(255) PRIMARY KEY,
      name NVARCHAR(255),
      role NVARCHAR(100),
      department NVARCHAR(100),
      email NVARCHAR(255),
      phone NVARCHAR(50),
      last_synced DATETIME DEFAULT GETDATE()
    )
  `);

  // Create sync log table
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sync_log')
    CREATE TABLE sync_log (
      id INT IDENTITY(1,1) PRIMARY KEY,
      table_name NVARCHAR(100),
      records_synced INT,
      sync_status NVARCHAR(50),
      error_message NVARCHAR(MAX),
      sync_timestamp DATETIME DEFAULT GETDATE()
    )
  `);

  console.log('✅ SQL tables created');
}

async function syncTable(pool, airtableTable, mapping) {
  console.log(`\nSyncing ${airtableTable}...`);
  let recordCount = 0;
  
  try {
    // Fetch all records from Airtable
    const records = await base(airtableTable).select().all();
    console.log(`Found ${records.length} records in Airtable`);

    // Clear existing data (for full sync)
    await pool.request().query(`DELETE FROM ${mapping.sqlTable}`);

    // Prepare bulk insert
    for (const record of records) {
      const request = pool.request();
      request.input('id', sql.NVarChar(255), record.id);

      // Build column and value arrays
      const columns = ['id'];
      const values = ['@id'];

      // Map Airtable fields to SQL columns
      for (const [airtableField, sqlColumn] of Object.entries(mapping.airtableFields)) {
        const value = record.get(airtableField);
        
        // Handle array values (like customer references)
        let processedValue = value;
        if (Array.isArray(value)) {
          processedValue = value[0]; // Take first value for now
        }

        columns.push(sqlColumn);
        values.push(`@${sqlColumn}`);
        
        // Add parameter with appropriate type
        if (sqlColumn.includes('date')) {
          request.input(sqlColumn, sql.Date, processedValue);
        } else if (sqlColumn.includes('projects') || sqlColumn.includes('homes') || sqlColumn.includes('planted')) {
          request.input(sqlColumn, sql.Int, processedValue || 0);
        } else if (sqlColumn.includes('percentage')) {
          request.input(sqlColumn, sql.Float, processedValue || 0);
        } else {
          request.input(sqlColumn, sql.NVarChar(255), processedValue || null);
        }
      }

      // Add last_synced
      columns.push('last_synced');
      values.push('GETDATE()');

      // Execute insert
      const query = `INSERT INTO ${mapping.sqlTable} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
      await request.query(query);
      recordCount++;
    }

    // Log success
    await pool.request()
      .input('table_name', sql.NVarChar(100), airtableTable)
      .input('records_synced', sql.Int, recordCount)
      .input('sync_status', sql.NVarChar(50), 'success')
      .query(`INSERT INTO sync_log (table_name, records_synced, sync_status) 
              VALUES (@table_name, @records_synced, @sync_status)`);

    console.log(`✅ Synced ${recordCount} records to ${mapping.sqlTable}`);

  } catch (error) {
    console.error(`❌ Error syncing ${airtableTable}:`, error.message);
    
    // Log error
    await pool.request()
      .input('table_name', sql.NVarChar(100), airtableTable)
      .input('records_synced', sql.Int, recordCount)
      .input('sync_status', sql.NVarChar(50), 'error')
      .input('error_message', sql.NVarChar, error.message)
      .query(`INSERT INTO sync_log (table_name, records_synced, sync_status, error_message) 
              VALUES (@table_name, @records_synced, @sync_status, @error_message)`);
  }
}

async function main() {
  console.log('🚀 Starting Airtable to Azure SQL sync...\n');
  
  try {
    // Connect to SQL Server
    console.log('Connecting to Azure SQL Database...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to Azure SQL\n');

    // Create tables if needed
    await createTables(pool);

    // Sync each table
    for (const [airtableTable, mapping] of Object.entries(TABLE_MAPPINGS)) {
      await syncTable(pool, airtableTable, mapping);
    }

    // Show summary
    const result = await pool.request().query(`
      SELECT table_name, MAX(sync_timestamp) as last_sync, SUM(records_synced) as total_records
      FROM sync_log
      WHERE sync_status = 'success'
      GROUP BY table_name
    `);
    
    console.log('\n📊 Sync Summary:');
    console.table(result.recordset);

    // Close connection
    await pool.close();
    console.log('\n✅ Sync completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run sync
if (require.main === module) {
  main();
}

module.exports = { syncTable, createTables };