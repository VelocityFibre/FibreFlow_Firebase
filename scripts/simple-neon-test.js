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
      
      // Check onemap_lawley_raw table (most likely to have data)
      try {
        const count = await sql`SELECT COUNT(*) as count FROM onemap_lawley_raw`;
        console.log('✅ Records in onemap_lawley_raw:', count[0].count);
        
        // Check recent imports to see what files were imported
        const recentImports = await sql`
          SELECT DISTINCT source_file, import_date, COUNT(*) as records
          FROM onemap_lawley_raw 
          WHERE source_file IS NOT NULL
          GROUP BY source_file, import_date
          ORDER BY import_date DESC
          LIMIT 5
        `;
        
        if (recentImports.length > 0) {
          console.log('✅ Recent OneMap imports:');
          recentImports.forEach((imp, i) => {
            console.log(`  ${i + 1}. ${imp.source_file} - ${imp.records} records (${imp.import_date})`);
          });
          
          // Get a sample record to see actual data
          const sample = await sql`
            SELECT 
              property_id, 
              pole_number, 
              drop_number, 
              status,
              date_status_changed,
              site,
              field_agent_name_pole_permission,
              source_file
            FROM onemap_lawley_raw 
            WHERE source_file LIKE '%Lawley%'
            LIMIT 3
          `;
          
          if (sample.length > 0) {
            console.log('✅ Sample Lawley data records:');
            sample.forEach((rec, i) => {
              console.log(`  ${i + 1}. Property: ${rec.property_id}, Pole: ${rec.pole_number || 'N/A'}, Status: ${rec.status}`);
            });
          }
        }
        
      } catch (error) {
        console.log('❌ Error reading onemap_lawley_raw:', error.message);
      }
      
      // Check import batches table
      try {
        const batches = await sql`SELECT * FROM onemap_import_batches ORDER BY import_started DESC LIMIT 5`;
        console.log('\n📊 Import batches:', batches.length);
        
        if (batches.length > 0) {
          batches.forEach((batch, i) => {
            console.log(`  ${i + 1}. ${batch.source_file}: ${batch.processed_rows || 0} rows processed (${batch.status})`);
            if (batch.error_details) {
              console.log(`     Error: ${JSON.stringify(batch.error_details)}`);
            }
          });
        } else {
          console.log('  No import batches found - data may not have been imported yet');
        }
        
        // Check all public tables to see if data exists elsewhere
        const allTables = await sql`
          SELECT table_name, 
                 (SELECT COUNT(*) 
                  FROM information_schema.tables t2 
                  WHERE t2.table_name = t1.table_name) as row_count
          FROM information_schema.tables t1
          WHERE table_schema = 'public'
          AND table_name NOT LIKE 'pg_%'
          ORDER BY table_name
        `;
        
        console.log('\n📋 All tables in database:');
        for (const table of allTables) {
          console.log(`  - ${table.table_name}`);
        }
        
      } catch (error) {
        console.log('❌ Error checking import batches:', error.message);
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