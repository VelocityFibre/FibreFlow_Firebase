// Simple test to check if we can connect to Neon and if tables exist
import { neon } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function testNeon() {
  try {
    const sql = neon(connectionString);
    
    console.log('Testing Neon connection...');
    
    // Test basic query
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log('✅ Connection successful!');
    console.log('Current time:', result[0].current_time);
    console.log('Database version:', result[0].db_version.substring(0, 50) + '...');
    
    // Check if OneMap tables exist
    console.log('\nChecking for OneMap tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%onemap%'
    `;
    
    if (tables.length > 0) {
      console.log('✅ Found OneMap tables:', tables.map(t => t.table_name));
      
      // Check all OneMap tables
      for (const table of ['onemap_status_history', 'onemap_lawley_raw', 'onemap_import_batches']) {
        try {
          const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
          console.log(`✅ Records in ${table}:`, count[0].count);
          
          if (count[0].count > 0) {
            // Get a sample record to see structure
            const sample = await sql`SELECT * FROM ${sql(table)} LIMIT 1`;
            if (sample.length > 0) {
              console.log(`✅ ${table} columns:`, Object.keys(sample[0]).slice(0, 10)); // Show first 10 columns
            }
          }
        } catch (error) {
          console.log(`❌ Error reading ${table}:`, error.message);
        }
      }
    } else {
      console.log('❌ No OneMap tables found');
      console.log('You need to import data first via the OneMap tab in FibreFlow settings');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testNeon();