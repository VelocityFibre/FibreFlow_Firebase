// Find where the Lawley OneMap data actually ended up
import { neon } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function findLawleyData() {
  try {
    const sql = neon(connectionString);
    
    console.log('🔍 Searching for Lawley OneMap data across all tables...\n');
    
    // Tables that might contain OneMap data based on the list
    const candidateTables = [
      'current_status',
      'status_changes', 
      'latest_property_status',
      'current_pole_statuses',
      'nokia_data'
    ];
    
    for (const table of candidateTables) {
      try {
        console.log(`📊 Checking ${table}:`);
        
        // For each table, try direct queries without variable interpolation
        let query, count, columns, sample;
        
        if (table === 'current_status') {
          count = await sql`SELECT COUNT(*) as count FROM current_status`;
          if (count[0].count > 0) {
            sample = await sql`SELECT * FROM current_status LIMIT 1`;
          }
        } else if (table === 'status_changes') {
          count = await sql`SELECT COUNT(*) as count FROM status_changes`;
          if (count[0].count > 0) {
            sample = await sql`SELECT * FROM status_changes LIMIT 1`;
          }
        } else if (table === 'latest_property_status') {
          count = await sql`SELECT COUNT(*) as count FROM latest_property_status`;
          if (count[0].count > 0) {
            sample = await sql`SELECT * FROM latest_property_status LIMIT 1`;
          }
        } else if (table === 'current_pole_statuses') {
          count = await sql`SELECT COUNT(*) as count FROM current_pole_statuses`;
          if (count[0].count > 0) {
            sample = await sql`SELECT * FROM current_pole_statuses LIMIT 1`;
          }
        } else if (table === 'nokia_data') {
          count = await sql`SELECT COUNT(*) as count FROM nokia_data`;
          if (count[0].count > 0) {
            sample = await sql`SELECT * FROM nokia_data LIMIT 1`;
          }
        }
        
        console.log(`  Records: ${count[0].count}`);
        
        if (count[0].count > 0 && sample && sample.length > 0) {
          const record = sample[0];
          console.log(`  📋 Sample columns:`, Object.keys(record).slice(0, 10));
          
          // Check if this looks like Lawley data
          const recordStr = JSON.stringify(record).toLowerCase();
          if (recordStr.includes('lawley') || recordStr.includes('law.') || record.project_name?.includes('Lawley')) {
            console.log(`  🎯 FOUND LAWLEY DATA!`);
            console.log(`  🎯 Sample record:`, record);
          } else {
            // Show first few values to see data pattern
            const sampleValues = Object.entries(record).slice(0, 3).map(([k,v]) => `${k}: ${v}`);
            console.log(`  📋 Sample values:`, sampleValues);
          }
        }
        console.log('');
        
      } catch (error) {
        console.log(`  ❌ Error checking ${table}: ${error.message}\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

findLawleyData();