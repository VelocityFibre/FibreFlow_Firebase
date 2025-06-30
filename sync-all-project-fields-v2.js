require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');
const fs = require('fs');

const sqlConfig = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// Complete mapping of ALL Airtable fields to SQL columns
const fieldMapping = {
  // Basic Info
  'Project Name': 'project_name',
  'Status': 'status',
  'Region': 'region',
  'Province': 'province',
  'Customer': 'customer',
  
  // Dates
  'Start Date': 'start_date',
  'End Date': 'end_date',
  'Project Duration Mths': 'project_duration_months',
  
  // Homes metrics
  'Total Homes PO': 'total_homes_po',
  'Homes Connected': 'homes_connected',
  'Homes Connected %': 'homes_connected_percent',
  'Home Sign-ups': 'home_signups',
  'Home Sign-Ups %': 'home_signups_percent',
  'Home Drops': 'home_drops',
  'Home Drops %': 'home_drops_percent',
  
  // Poles metrics
  'Poles Planted': 'poles_planted',
  'Poles Planted %': 'poles_planted_percent',
  
  // Trenching metrics
  'Trenching Complete': 'trenching_complete',
  'Trenching % Complete': 'trenching_percent_complete',
  
  // Stringing metrics
  'Stringing BOQ': 'stringing_boq',
  'Stringing Complete': 'stringing_complete',
  'Total Stringing %': 'total_stringing_percent',
  '24F Complete': 'col_24f_complete',
  '48F Complete': 'col_48f_complete',
  '96F Complete': 'col_96f_complete',
  '144F Complete': 'col_144f_complete',
  '288F Complete': 'col_288f_complete',
  
  // Permissions
  'Permissions Complete': 'permissions_complete',
  'Permissions Missing': 'permissions_missing',
  'Permissions Declined': 'permissions_declined',
  'Permissions %': 'permissions_percent',
  
  // Other fields
  'Auto Project Status': 'auto_project_status',
  'Next Steps Recommendation': 'next_steps_recommendation',
  'Calculation': 'calculation'
};

async function syncAllProjectFields() {
  console.log('🚀 Starting comprehensive Airtable to SQL sync for ALL fields...\n');
  
  let pool;
  try {
    // Load Airtable data
    console.log('📥 Loading Airtable data...');
    const airtableData = JSON.parse(fs.readFileSync('airtable-projects-full.json', 'utf8'));
    console.log(`   Found ${airtableData.length} projects\n`);
    
    // Connect to SQL
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Connected successfully\n');
    
    // Process each project
    for (const record of airtableData) {
      const projectName = record.fields['Project Name'];
      console.log(`\n📋 Processing: ${projectName}`);
      
      try {
        // Build update query dynamically
        const updates = [];
        const request = pool.request();
        let fieldCount = 0;
        
        // Add all field mappings
        for (const [airtableField, sqlColumn] of Object.entries(fieldMapping)) {
          if (record.fields.hasOwnProperty(airtableField)) {
            let value = record.fields[airtableField];
            let shouldUpdate = true;
            
            // Skip null or undefined values
            if (value === null || value === undefined || value === '') {
              shouldUpdate = false;
            }
            
            // Handle objects (like computed fields with error states)
            if (shouldUpdate && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
              // For computed fields with errors, skip them
              if (value.state === 'error' || value.errorType) {
                shouldUpdate = false;
              } else {
                // Otherwise convert to JSON string
                value = JSON.stringify(value);
              }
            }
            
            // Convert percentages
            if (shouldUpdate && sqlColumn.includes('_percent')) {
              if (typeof value === 'string' && value.endsWith('%')) {
                value = parseFloat(value.replace('%', '')) / 100;
              } else if (typeof value === 'number') {
                // Already a decimal, keep as is
              } else {
                // Skip invalid percentage values
                shouldUpdate = false;
              }
            }
            
            // Handle arrays (convert to comma-separated string)
            if (shouldUpdate && Array.isArray(value)) {
              value = value.length > 0 ? value.join(', ') : null;
              if (!value) shouldUpdate = false;
            }
            
            // Handle dates
            if (shouldUpdate && airtableField.includes('Date') && value) {
              try {
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime())) {
                  shouldUpdate = false;
                } else {
                  value = dateValue;
                }
              } catch (e) {
                shouldUpdate = false;
              }
            }
            
            // Ensure string length limits for nvarchar fields
            if (shouldUpdate && typeof value === 'string' && value.length > 4000) {
              value = value.substring(0, 4000);
            }
            
            // Only add to update if we should update
            if (shouldUpdate) {
              updates.push(`${sqlColumn} = @${sqlColumn}`);
              request.input(sqlColumn, value);
              fieldCount++;
            }
          }
        }
        
        // Add metadata
        updates.push('last_synced = GETDATE()');
        
        // Execute update
        if (updates.length > 1) { // More than just last_synced
          request.input('projectName', projectName);
          
          const query = `
            UPDATE projects 
            SET ${updates.join(', ')}
            WHERE project_name = @projectName
          `;
          
          const result = await request.query(query);
          
          if (result.rowsAffected[0] > 0) {
            console.log(`   ✅ Updated successfully (${fieldCount} fields)`);
          } else {
            console.log(`   ⚠️  No matching project found in SQL`);
          }
        } else {
          console.log(`   ⏭️  Skipped - no valid data to update`);
        }
        
      } catch (err) {
        console.error(`   ❌ Error updating ${projectName}:`, err.message);
      }
    }
    
    // Log sync completion
    await pool.request()
      .input('tableName', 'projects')
      .input('recordsSynced', airtableData.length)
      .input('status', 'completed')
      .query(`
        INSERT INTO sync_log (table_name, records_synced, sync_status)
        VALUES (@tableName, @recordsSynced, @status)
      `);
    
    console.log('\n✅ Sync completed successfully!');
    
  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    
    // Log error
    if (pool) {
      try {
        await pool.request()
          .input('tableName', 'projects')
          .input('status', 'failed')
          .input('errorMessage', err.message)
          .query(`
            INSERT INTO sync_log (table_name, sync_status, error_message)
            VALUES (@tableName, @status, @errorMessage)
          `);
      } catch (logErr) {
        console.error('Failed to log error:', logErr.message);
      }
    }
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the sync
syncAllProjectFields().catch(console.error);