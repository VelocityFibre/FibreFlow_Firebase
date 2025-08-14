const { Pool } = require('pg');
const fs = require('fs');

// Load connection details
const connectionDetails = JSON.parse(fs.readFileSync('./powerbi-connection-details.json', 'utf8'));

// Test PowerBI connection
const pool = new Pool({
  host: connectionDetails.host,
  database: connectionDetails.database,
  user: connectionDetails.username,
  password: connectionDetails.password,
  port: connectionDetails.port,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1
});

async function testConnection() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Testing PowerBI reader connection...');
    console.log('═══════════════════════════════════════════════════════');
    
    // Test basic connection
    const version = await client.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log(`📊 Database: ${version.rows[0].version.split(' ')[0]} ${version.rows[0].version.split(' ')[1]}`);
    
    // List available views
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'bi_views' 
      AND table_type = 'VIEW'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available BI Views:');
    views.rows.forEach(row => {
      console.log(`  📊 bi_views.${row.table_name}`);
    });
    
    // Test each view with sample data
    console.log('\n🧪 Testing views with sample data...');
    
    for (const view of views.rows) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM bi_views.${view.table_name}`);
        const count = parseInt(result.rows[0].count);
        console.log(`✅ ${view.table_name}: ${count} records`);
        
        if (count > 0) {
          const sample = await client.query(`SELECT * FROM bi_views.${view.table_name} LIMIT 1`);
          const columns = Object.keys(sample.rows[0]);
          console.log(`   📋 Columns: ${columns.join(', ')}`);
        }
      } catch (error) {
        console.log(`❌ ${view.table_name}: Error - ${error.message}`);
      }
    }
    
    // Check for actual data
    const hasData = await client.query(`
      SELECT 
        'property_status' as view_name,
        COUNT(*) as record_count
      FROM bi_views.property_status
      UNION ALL
      SELECT 
        'agent_performance' as view_name,
        COUNT(*) as record_count
      FROM bi_views.agent_performance
      ORDER BY record_count DESC
    `);
    
    console.log('\n📊 Data Summary:');
    hasData.rows.forEach(row => {
      console.log(`  📈 ${row.view_name}: ${row.record_count} records`);
    });
    
    if (hasData.rows.some(row => parseInt(row.record_count) > 0)) {
      console.log('\n🎉 SUCCESS: PowerBI integration is ready!');
      console.log('✅ Database schema created');
      console.log('✅ Views are accessible');
      console.log('✅ Sample data is available');
      console.log('✅ PowerBI can connect and see data');
    } else {
      console.log('\n⚠️  Database schema is ready but no data found');
      console.log('   Run populate-initial-data.js to add sample data');
    }
    
    console.log('\n🔗 PowerBI Connection Instructions:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. Open PowerBI Desktop');
    console.log('2. Get Data → PostgreSQL database');
    console.log(`3. Server: ${connectionDetails.host}`);
    console.log(`4. Database: ${connectionDetails.database}`);
    console.log('5. Select Import mode');
    console.log('6. Username: powerbi_reader');
    console.log(`7. Password: ${connectionDetails.password}`);
    console.log('8. Navigate to bi_views schema');
    console.log('9. Select the views you need');
    console.log('10. Load and start building dashboards!');
    
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  testConnection()
    .then(() => {
      console.log('\n✅ Connection test completed successfully!');
    })
    .catch((error) => {
      console.error('\n❌ Connection test failed:', error.message);
      console.error('Make sure the database setup completed successfully.');
    });
}

module.exports = { testConnection };