const sql = require('mssql');
require('dotenv').config();

// SQL configurations for both databases
const airtableDbConfig = {
  server: process.env.AZURE_SQL_SERVER || 'fibreflow.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'fibreflow',
  user: process.env.AZURE_SQL_USER || 'fibreflowadmin',
  password: process.env.AZURE_SQL_PASSWORD || 'Xoouphae2415!',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

const firebaseDbConfig = {
  ...airtableDbConfig,
  database: 'fromfirebase'
};

async function checkSyncStatus() {
  console.log('🔍 Checking Sync Status...\n');

  // Check Airtable Sync
  try {
    console.log('📊 AIRTABLE SYNC STATUS:');
    const pool1 = await sql.connect(airtableDbConfig);
    
    const projects = await pool1.request().query('SELECT COUNT(*) as count FROM projects');
    console.log(`  ✓ Projects: ${projects.recordset[0].count} records`);
    
    const tracker = await pool1.request().query('SELECT COUNT(*) as count FROM daily_tracker');
    console.log(`  ✓ Daily Tracker: ${tracker.recordset[0].count} records`);
    
    const recent = await pool1.request().query(`
      SELECT TOP 1 date, project_name 
      FROM daily_tracker 
      ORDER BY date DESC
    `);
    if (recent.recordset.length > 0) {
      console.log(`  ✓ Latest entry: ${recent.recordset[0].project_name} on ${new Date(recent.recordset[0].date).toLocaleDateString()}`);
    }
    
    await pool1.close();
  } catch (err) {
    console.log(`  ❌ Airtable sync error: ${err.message}`);
  }

  console.log('\n📊 FIREBASE SYNC STATUS:');
  
  // Check Firebase Sync
  try {
    const pool2 = await sql.connect(firebaseDbConfig);
    
    const fbProjects = await pool2.request().query('SELECT COUNT(*) as count FROM projects');
    console.log(`  ✓ Projects: ${fbProjects.recordset[0].count} records`);
    
    const staff = await pool2.request().query('SELECT COUNT(*) as count FROM staff');
    console.log(`  ✓ Staff: ${staff.recordset[0].count} records`);
    
    const tasks = await pool2.request().query('SELECT COUNT(*) as count FROM tasks');
    console.log(`  ✓ Tasks: ${tasks.recordset[0].count} records`);
    
    await pool2.close();
  } catch (err) {
    console.log(`  ❌ Firebase sync error: ${err.message}`);
  }
  
  console.log('\n✅ Sync status check complete!');
}

checkSyncStatus().catch(console.error);