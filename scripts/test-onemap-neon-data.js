import { Client } from 'pg';

// Neon database configuration (from environment.ts)
const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function testOneMapData() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Neon database');
    
    // Check if tables exist
    console.log('\n=== CHECKING TABLES ===');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%onemap%'
    `);
    console.log('OneMap tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check onemap_status_changes table
    if (tablesResult.rows.some(r => r.table_name === 'onemap_status_changes')) {
      console.log('\n=== ONEMAP STATUS CHANGES TABLE ===');
      
      // Count total records
      const countResult = await client.query('SELECT COUNT(*) as count FROM onemap_status_changes');
      console.log('Total records:', countResult.rows[0].count);
      
      // Get sample data
      const sampleResult = await client.query(`
        SELECT property_id, pole_number, drop_number, status, status_date, zone, contractor 
        FROM onemap_status_changes 
        ORDER BY status_date DESC 
        LIMIT 5
      `);
      console.log('\nSample records:');
      sampleResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. Property: ${row.property_id}, Pole: ${row.pole_number || 'N/A'}, Status: ${row.status}`);
      });
      
      // Get unique statuses
      const statusResult = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM onemap_status_changes 
        GROUP BY status 
        ORDER BY count DESC 
        LIMIT 10
      `);
      console.log('\nTop statuses:');
      statusResult.rows.forEach(row => {
        console.log(`- ${row.status}: ${row.count} records`);
      });
    }
    
    // Check onemap_import_batches table
    if (tablesResult.rows.some(r => r.table_name === 'onemap_import_batches')) {
      console.log('\n=== ONEMAP IMPORT BATCHES ===');
      const batchResult = await client.query(`
        SELECT file_name, import_date, record_count, status, created_by 
        FROM onemap_import_batches 
        ORDER BY import_date DESC 
        LIMIT 5
      `);
      console.log('Recent imports:');
      batchResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.file_name} - ${row.record_count} records (${row.status})`);
      });
    }
    
    if (tablesResult.rows.length === 0) {
      console.log('\n❌ No OneMap tables found. You need to import OneMap data first.');
      console.log('Visit https://fibreflow-73daf.web.app/settings and use the OneMap tab to import Excel files.');
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await client.end();
  }
}

testOneMapData();