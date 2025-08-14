const { Pool } = require('pg');

// Neon connection configuration
const pool = new Pool({
  host: 'ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_AlX83ojfZpBk',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function populateInitialData() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Populating initial data for PowerBI testing...');
    
    // Check if we have existing data in status_changes table
    const existingData = await client.query('SELECT COUNT(*) FROM status_changes LIMIT 10');
    const existingCount = parseInt(existingData.rows[0].count);
    
    console.log(`📋 Found ${existingCount} records in status_changes table`);
    
    if (existingCount > 0) {
      console.log('🔄 Converting existing data to Firebase event format...');
      
      // Get a sample of existing data
      const sampleData = await client.query(`
        SELECT * FROM status_changes 
        ORDER BY id 
        LIMIT 1000
      `);
      
      console.log(`📥 Converting ${sampleData.rows.length} records...`);
      
      // Convert to Firebase event format
      for (let i = 0; i < sampleData.rows.length; i++) {
        const row = sampleData.rows[i];
        
        // Convert row to JSON format similar to Firebase
        const firebaseData = {
          property_id: row.property_id,
          pole_number: row.pole_number,
          drop_number: row.drop_number,
          status: row.status,
          agent_name: row.agent_name,
          address: row.address,
          suburb: row.suburb,
          zone: row.zone,
          distribution: row.distribution,
          feeder: row.feeder,
          latitude: row.latitude,
          longitude: row.longitude,
          permission_date: row.permission_date,
          signup_date: row.signup_date,
          installation_date: row.installation_date
        };
        
        // Insert into firebase_events
        await client.query(`
          INSERT INTO firebase_events (
            collection,
            document_id,
            operation,
            data,
            timestamp,
            sync_timestamp
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          ON CONFLICT (collection, document_id, timestamp) DO NOTHING
        `, [
          'status_changes',
          `legacy_${row.id}`,
          'create',
          JSON.stringify(firebaseData),
          new Date(row.created_at || Date.now()).toISOString()
        ]);
        
        // Insert into current state
        await client.query(`
          INSERT INTO firebase_current_state (
            collection,
            document_id,
            data,
            last_updated
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (collection, document_id) 
          DO UPDATE SET 
            data = EXCLUDED.data,
            last_updated = CURRENT_TIMESTAMP
        `, [
          'status_changes',
          `legacy_${row.id}`,
          JSON.stringify(firebaseData)
        ]);
        
        if ((i + 1) % 100 === 0) {
          console.log(`✅ Processed ${i + 1}/${sampleData.rows.length} records`);
        }
      }
      
      console.log('✅ Data conversion complete');
    } else {
      console.log('📝 Creating sample data for testing...');
      
      // Create some sample data for testing
      const sampleRecords = [
        {
          property_id: 'SAMPLE001',
          pole_number: 'LAW.P.B001',
          drop_number: 'DR001001',
          status: 'Home Sign Ups: Approved & Installation Scheduled',
          agent_name: 'John Smith',
          address: '123 Test Street',
          zone: 'Zone A',
          distribution: 'Test Distribution',
          feeder: 'Test Feeder'
        },
        {
          property_id: 'SAMPLE002',
          pole_number: 'LAW.P.B002',
          drop_number: 'DR001002',
          status: 'Pole Permission: Approved',
          agent_name: 'Jane Doe',
          address: '456 Demo Avenue',
          zone: 'Zone B',
          distribution: 'Demo Distribution',
          feeder: 'Demo Feeder'
        },
        {
          property_id: 'SAMPLE003',
          pole_number: null,
          drop_number: 'DR001003',
          status: 'Home Sign Ups: Declined',
          agent_name: 'Mike Johnson',
          address: '789 Example Road',
          zone: 'Zone C',
          distribution: 'Example Distribution',
          feeder: 'Example Feeder'
        }
      ];
      
      for (let i = 0; i < sampleRecords.length; i++) {
        const record = sampleRecords[i];
        
        // Insert into firebase_events
        await client.query(`
          INSERT INTO firebase_events (
            collection,
            document_id,
            operation,
            data,
            timestamp,
            sync_timestamp
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
          'status_changes',
          `sample_${i + 1}`,
          'create',
          JSON.stringify(record),
          new Date().toISOString()
        ]);
        
        // Insert into current state
        await client.query(`
          INSERT INTO firebase_current_state (
            collection,
            document_id,
            data,
            last_updated
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `, [
          'status_changes',
          `sample_${i + 1}`,
          JSON.stringify(record)
        ]);
      }
      
      console.log('✅ Sample data created');
    }
    
    // Test the views
    console.log('🧪 Testing BI views with data...');
    
    const propertyCount = await client.query('SELECT COUNT(*) FROM bi_views.property_status');
    console.log(`📊 Property Status view: ${propertyCount.rows[0].count} records`);
    
    const agentCount = await client.query('SELECT COUNT(*) FROM bi_views.agent_performance');
    console.log(`👤 Agent Performance view: ${agentCount.rows[0].count} records`);
    
    // Show sample data
    const sampleProperties = await client.query(`
      SELECT "Property ID", "Pole Number", "Current Status", "Agent Name", "Zone" 
      FROM bi_views.property_status 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample Property Data:');
    console.log('════════════════════════════════════════════════════════════════');
    sampleProperties.rows.forEach(row => {
      console.log(`🏠 ${row['Property ID']} | ${row['Pole Number'] || 'No Pole'} | ${row['Current Status']} | ${row['Agent Name']} | ${row['Zone']}`);
    });
    
    const sampleAgents = await client.query(`
      SELECT "Agent Name", "Total Properties", "Completion Rate %", "Approval Rate %" 
      FROM bi_views.agent_performance 
      ORDER BY "Total Properties" DESC 
      LIMIT 5
    `);
    
    console.log('\n👤 Agent Performance Data:');
    console.log('════════════════════════════════════════════════════════════════');
    sampleAgents.rows.forEach(row => {
      console.log(`👨‍💼 ${row['Agent Name']} | ${row['Total Properties']} properties | ${row['Completion Rate %'] || 0}% completed | ${row['Approval Rate %'] || 0}% approved`);
    });
    
    console.log('\n✅ Initial data population complete!');
    console.log('🔗 Lew can now connect PowerBI and see data in the bi_views schema');
    
  } finally {
    client.release();
  }
}

if (require.main === module) {
  populateInitialData()
    .then(() => {
      console.log('\n🎉 Data population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Data population failed:', error.message);
      process.exit(1);
    });
}

module.exports = { populateInitialData };