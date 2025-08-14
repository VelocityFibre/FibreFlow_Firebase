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

async function setupSimple() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️ Setting up PowerBI integration (simplified)...');
    
    // 1. Create bi_views schema
    console.log('📁 Creating bi_views schema...');
    await client.query('CREATE SCHEMA IF NOT EXISTS bi_views');
    console.log('✅ Schema created');
    
    // 2. Create main event store tables
    console.log('📋 Creating event store tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS firebase_events (
          id SERIAL PRIMARY KEY,
          collection VARCHAR(100) NOT NULL,
          document_id VARCHAR(200) NOT NULL,
          operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
          data JSONB,
          previous_data JSONB,
          timestamp TIMESTAMP NOT NULL,
          sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(collection, document_id, timestamp)
      )
    `);
    console.log('✅ firebase_events table created');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS firebase_current_state (
          collection VARCHAR(100) NOT NULL,
          document_id VARCHAR(200) NOT NULL,
          data JSONB NOT NULL,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMP,
          
          PRIMARY KEY (collection, document_id)
      )
    `);
    console.log('✅ firebase_current_state table created');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_failures (
          id SERIAL PRIMARY KEY,
          collection VARCHAR(100) NOT NULL,
          document_id VARCHAR(200) NOT NULL,
          operation VARCHAR(20) NOT NULL,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP
      )
    `);
    console.log('✅ sync_failures table created');
    
    // 3. Create indexes
    console.log('🔍 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_firebase_events_collection ON firebase_events(collection)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_firebase_events_document ON firebase_events(document_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_firebase_events_timestamp ON firebase_events(sync_timestamp DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_firebase_events_data ON firebase_events USING GIN(data)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_firebase_current_state_data ON firebase_current_state USING GIN(data)');
    console.log('✅ Indexes created');
    
    // 4. Create basic BI views
    console.log('📊 Creating BI views...');
    
    // Property Status View
    await client.query(`
      CREATE OR REPLACE VIEW bi_views.property_status AS
      SELECT 
          (data->>'property_id')::VARCHAR AS "Property ID",
          (data->>'pole_number')::VARCHAR AS "Pole Number",
          (data->>'drop_number')::VARCHAR AS "Drop Number",
          (data->>'status')::VARCHAR AS "Current Status",
          CASE 
              WHEN data->>'status' LIKE '%Approved%' THEN 'Approved'
              WHEN data->>'status' LIKE '%In Progress%' THEN 'In Progress'
              WHEN data->>'status' LIKE '%Declined%' THEN 'Declined'
              WHEN data->>'status' LIKE '%Scheduled%' THEN 'Scheduled'
              WHEN data->>'status' LIKE '%Installed%' THEN 'Completed'
              ELSE 'Other'
          END AS "Status Category",
          COALESCE(
              data->>'agent_name',
              data->>'contractor_name',
              data->>'assigned_to'
          )::VARCHAR AS "Agent Name",
          (data->>'address')::VARCHAR AS "Address",
          (data->>'zone')::VARCHAR AS "Zone",
          CASE 
              WHEN data->>'pole_number' IS NOT NULL THEN 1 
              ELSE 0 
          END AS "Has Pole",
          CASE 
              WHEN data->>'drop_number' IS NOT NULL THEN 1 
              ELSE 0 
          END AS "Has Drop",
          last_updated AS "Last Updated"
      FROM firebase_current_state
      WHERE collection IN ('status_changes', 'planned-poles', 'pole-installations')
      AND deleted = FALSE
    `);
    console.log('✅ property_status view created');
    
    // Agent Performance View
    await client.query(`
      CREATE OR REPLACE VIEW bi_views.agent_performance AS
      WITH agent_stats AS (
          SELECT 
              COALESCE(
                  data->>'agent_name',
                  data->>'contractor_name',
                  'Unassigned'
              ) AS agent,
              COUNT(*) AS total_properties,
              SUM(CASE WHEN data->>'status' LIKE '%Approved%' THEN 1 ELSE 0 END) AS approvals,
              SUM(CASE WHEN data->>'status' LIKE '%Installed%' THEN 1 ELSE 0 END) AS completions,
              SUM(CASE WHEN data->>'status' LIKE '%Declined%' THEN 1 ELSE 0 END) AS declines,
              MAX(last_updated) AS last_activity
          FROM firebase_current_state
          WHERE collection IN ('status_changes', 'planned-poles')
          AND deleted = FALSE
          GROUP BY agent
      )
      SELECT 
          agent AS "Agent Name",
          total_properties AS "Total Properties",
          approvals AS "Approvals",
          completions AS "Completions",
          declines AS "Declines",
          ROUND(100.0 * completions / NULLIF(total_properties, 0), 2) AS "Completion Rate %",
          ROUND(100.0 * approvals / NULLIF(total_properties, 0), 2) AS "Approval Rate %",
          last_activity AS "Last Activity"
      FROM agent_stats
      WHERE agent IS NOT NULL
      ORDER BY total_properties DESC
    `);
    console.log('✅ agent_performance view created');
    
    // Project Summary View
    await client.query(`
      CREATE OR REPLACE VIEW bi_views.project_summary AS
      SELECT 
          (data->>'id')::VARCHAR AS "Project ID",
          (data->>'title')::VARCHAR AS "Project Name",
          (data->>'status')::VARCHAR AS "Project Status",
          (data->>'type')::VARCHAR AS "Project Type",
          CASE 
              WHEN data->>'status' = 'active' THEN 'Active'
              WHEN data->>'status' = 'completed' THEN 'Completed'
              WHEN data->>'status' = 'on-hold' THEN 'On Hold'
              ELSE 'Pending'
          END AS "Status Group",
          last_updated AS "Last Updated"
      FROM firebase_current_state
      WHERE collection = 'projects'
      AND deleted = FALSE
    `);
    console.log('✅ project_summary view created');
    
    // 5. Create PowerBI reader user
    console.log('👤 Creating PowerBI reader user...');
    const powerbiPassword = 'PowerBI_FibreFlow_2025_' + Math.random().toString(36).substring(2, 8);
    
    try {
      await client.query(`CREATE USER powerbi_reader WITH PASSWORD '${powerbiPassword}'`);
      console.log('✅ PowerBI reader user created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        await client.query(`ALTER USER powerbi_reader PASSWORD '${powerbiPassword}'`);
        console.log('✅ PowerBI reader password updated');
      } else {
        throw error;
      }
    }
    
    // 6. Grant permissions
    console.log('🔐 Granting permissions...');
    await client.query('GRANT CONNECT ON DATABASE neondb TO powerbi_reader');
    await client.query('GRANT USAGE ON SCHEMA public TO powerbi_reader');
    await client.query('GRANT USAGE ON SCHEMA bi_views TO powerbi_reader');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO powerbi_reader');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA bi_views TO powerbi_reader');
    console.log('✅ Permissions granted');
    
    // 7. Test the setup
    console.log('🧪 Testing setup...');
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'bi_views'
      ORDER BY table_name
    `);
    
    console.log('📊 Available BI views:');
    views.rows.forEach(row => {
      console.log(`  ✅ bi_views.${row.table_name}`);
    });
    
    // 8. Save connection details
    const fs = require('fs');
    const path = require('path');
    
    const connectionDetails = {
      host: 'ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech',
      database: 'neondb',
      username: 'powerbi_reader',
      password: powerbiPassword,
      port: 5432,
      ssl: 'require',
      connectionString: `Host=ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech;Port=5432;Database=neondb;Username=powerbi_reader;Password=${powerbiPassword};SSL Mode=Require;Trust Server Certificate=true`,
      setupDate: new Date().toISOString(),
      availableViews: views.rows.map(row => `bi_views.${row.table_name}`)
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'powerbi-connection-details.json'),
      JSON.stringify(connectionDetails, null, 2)
    );
    
    console.log('\n🎉 PowerBI Integration Setup Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 PowerBI Connection Details for Lew:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Host: ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech');
    console.log('Database: neondb');
    console.log('Username: powerbi_reader');
    console.log(`Password: ${powerbiPassword}`);
    console.log('Port: 5432');
    console.log('SSL Mode: Require');
    console.log('Schema: bi_views');
    console.log('═══════════════════════════════════════════════════════');
    console.log('💾 Connection details saved to: powerbi-connection-details.json');
    
    return connectionDetails;
    
  } finally {
    client.release();
  }
}

if (require.main === module) {
  setupSimple()
    .then(() => {
      console.log('\n✅ Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupSimple };