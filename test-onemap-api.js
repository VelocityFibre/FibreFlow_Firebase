// Test OneMap API endpoint directly to verify the data is accessible
import { neon } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function testOneMapAPI() {
  try {
    const sql = neon(connectionString);
    
    console.log('🧪 Testing OneMap Data Grid API queries...\n');
    
    // Test the exact query used in OneMapNeonService.getOneMapGridData()
    console.log('1️⃣ Testing main grid data query...');
    const gridData = await sql`
      SELECT 
        property_id,
        pole_number,
        drop_number,
        status,
        status_date,
        zone,
        feeder,
        distribution,
        contractor,
        agent,
        address,
        project_name
      FROM status_changes 
      WHERE project_name = 'Lawley'
      ORDER BY created_at DESC 
      LIMIT 1000
    `;
    
    console.log('✅ Grid data query result:', gridData.length, 'records');
    if (gridData.length > 0) {
      console.log('📄 Sample record:', {
        property_id: gridData[0].property_id,
        pole_number: gridData[0].pole_number,
        status: gridData[0].status,
        project_name: gridData[0].project_name
      });
    }
    
    // Test the summary stats query
    console.log('\n2️⃣ Testing summary stats query...');
    const summaryStats = await sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT property_id) as total_properties,
        COUNT(DISTINCT pole_number) FILTER (WHERE pole_number IS NOT NULL AND pole_number \!= '') as total_poles,
        COUNT(DISTINCT drop_number) FILTER (WHERE drop_number IS NOT NULL AND drop_number \!= '') as total_drops
      FROM status_changes 
      WHERE project_name = 'Lawley'
    `;
    
    console.log('✅ Summary stats result:', summaryStats[0]);
    
    // Test the filter options query  
    console.log('\n3️⃣ Testing filter options query...');
    const filterOptions = await sql`
      SELECT DISTINCT 
        status,
        zone,
        contractor
      FROM status_changes 
      WHERE project_name = 'Lawley'
      AND (status IS NOT NULL OR zone IS NOT NULL OR contractor IS NOT NULL)
      ORDER BY status, zone, contractor
    `;
    
    console.log('✅ Filter options result:', filterOptions.length, 'distinct combinations');
    
    // Extract unique values like the service does
    const statuses = [...new Set(filterOptions.map(row => row.status).filter(Boolean))];
    const zones = [...new Set(filterOptions.map(row => row.zone).filter(Boolean))];  
    const contractors = [...new Set(filterOptions.map(row => row.contractor).filter(Boolean))];
    
    console.log('📊 Available filters:');
    console.log('   Statuses:', statuses.slice(0, 3), '...', `(${statuses.length} total)`);
    console.log('   Zones:', zones.slice(0, 3), '...', `(${zones.length} total)`);
    console.log('   Contractors:', contractors.slice(0, 3), '...', `(${contractors.length} total)`);
    
    console.log('\n🎉 All OneMap API queries working correctly\!');
    console.log('🌐 The OneMap Data Grid should now display data at:');
    console.log('    https://fibreflow-73daf.web.app/onemap/pages/data-grid');
    
  } catch (error) {
    console.error('❌ OneMap API test failed:', error);
  }
}

testOneMapAPI();
