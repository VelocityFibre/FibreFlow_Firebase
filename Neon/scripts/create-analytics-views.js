#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  query_timeout: 30000,
  statement_timeout: 30000
};

async function createAnalyticsViews() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // First, let's check the table structure
    console.log('Checking status_changes table structure...\n');
    const schemaQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'status_changes'
      ORDER BY ordinal_position
    `;
    const schemaResult = await client.query(schemaQuery);
    console.log('Available columns:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n\nCreating analytics views...\n');
    
    // 1. Create zone_progress view
    console.log('1. Creating zone_progress view...');
    const createZoneProgressView = `
      CREATE OR REPLACE VIEW zone_progress AS
      WITH zone_stats AS (
        SELECT 
          zone,
          COUNT(DISTINCT CASE WHEN address IS NOT NULL THEN address END) as home_count,
          COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) as permissions,
          COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) as poles,
          COUNT(DISTINCT CASE WHEN status = 'Home Installation: In Progress' THEN pole_number END) as stringing,
          COUNT(DISTINCT CASE WHEN status LIKE 'Home Sign Ups:%' THEN address END) as signups,
          COUNT(DISTINCT CASE WHEN status = 'Home Installation: Installed' THEN address END) as installations,
          COUNT(DISTINCT CASE WHEN permission_date IS NOT NULL THEN pole_number END) as pole_permissions_with_date,
          COUNT(DISTINCT CASE WHEN signup_date IS NOT NULL THEN address END) as signups_with_date
        FROM status_changes
        WHERE zone IS NOT NULL
        GROUP BY zone
      )
      SELECT 
        zone,
        home_count,
        permissions,
        poles,
        stringing,
        signups,
        installations,
        CASE 
          WHEN home_count > 0 THEN ROUND((signups::numeric / home_count::numeric * 100)::numeric, 2)
          ELSE 0 
        END as signup_percentage,
        CASE 
          WHEN home_count > 0 THEN ROUND((installations::numeric / home_count::numeric * 100)::numeric, 2)
          ELSE 0 
        END as installation_percentage
      FROM zone_stats
      ORDER BY zone;
    `;
    await client.query(createZoneProgressView);
    console.log('✓ zone_progress view created');
    
    // 2. Create daily_progress view
    console.log('\n2. Creating daily_progress view...');
    const createDailyProgressView = `
      CREATE OR REPLACE VIEW daily_progress AS
      WITH daily_stats AS (
        SELECT 
          DATE(COALESCE(permission_date, created_at)) as progress_date,
          COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' AND DATE(permission_date) = DATE(COALESCE(permission_date, created_at)) THEN pole_number END) as permissions,
          COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' AND DATE(permission_date) = DATE(COALESCE(permission_date, created_at)) THEN pole_number END) as poles_planted,
          COUNT(DISTINCT CASE WHEN status LIKE 'Home Sign Ups:%' AND DATE(signup_date) = DATE(COALESCE(permission_date, created_at)) THEN address END) as sign_ups,
          COUNT(DISTINCT CASE WHEN status = 'Home Installation: Installed' AND DATE(installation_date) = DATE(COALESCE(permission_date, created_at)) THEN address END) as installations
        FROM status_changes
        WHERE COALESCE(permission_date, created_at) IS NOT NULL
        GROUP BY DATE(COALESCE(permission_date, created_at))
      )
      SELECT 
        progress_date,
        permissions,
        poles_planted,
        sign_ups,
        installations,
        SUM(permissions) OVER (ORDER BY progress_date) as cumulative_permissions,
        SUM(poles_planted) OVER (ORDER BY progress_date) as cumulative_poles,
        SUM(sign_ups) OVER (ORDER BY progress_date) as cumulative_signups,
        SUM(installations) OVER (ORDER BY progress_date) as cumulative_installations
      FROM daily_stats
      WHERE progress_date IS NOT NULL
      ORDER BY progress_date DESC;
    `;
    await client.query(createDailyProgressView);
    console.log('✓ daily_progress view created');
    
    // 3. Create key_milestones view
    console.log('\n3. Creating key_milestones view...');
    const createKeyMilestonesView = `
      CREATE OR REPLACE VIEW key_milestones AS
      WITH milestone_data AS (
        SELECT 
          'First Pole Permission' as milestone,
          MIN(permission_date) as milestone_date,
          'Pole Permission: Approved' as status,
          1 as display_order
        FROM status_changes
        WHERE status = 'Pole Permission: Approved' AND permission_date IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'First Home Sign Up' as milestone,
          MIN(signup_date) as milestone_date,
          'Home Sign Ups' as status,
          2 as display_order
        FROM status_changes
        WHERE status LIKE 'Home Sign Ups:%' AND signup_date IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'First Installation' as milestone,
          MIN(installation_date) as milestone_date,
          'Home Installation: Installed' as status,
          3 as display_order
        FROM status_changes
        WHERE status = 'Home Installation: Installed' AND installation_date IS NOT NULL
        
        UNION ALL
        
        SELECT 
          '1000th Pole Permission' as milestone,
          permission_date as milestone_date,
          'Pole Permission: Approved' as status,
          4 as display_order
        FROM (
          SELECT permission_date, ROW_NUMBER() OVER (ORDER BY permission_date) as rn
          FROM (
            SELECT DISTINCT pole_number, permission_date
            FROM status_changes
            WHERE status = 'Pole Permission: Approved' AND permission_date IS NOT NULL
          ) t
        ) t2
        WHERE rn = 1000
        
        UNION ALL
        
        SELECT 
          '100th Installation' as milestone,
          installation_date as milestone_date,
          'Home Installation: Installed' as status,
          5 as display_order
        FROM (
          SELECT installation_date, ROW_NUMBER() OVER (ORDER BY installation_date) as rn
          FROM (
            SELECT DISTINCT address, installation_date
            FROM status_changes
            WHERE status = 'Home Installation: Installed' AND installation_date IS NOT NULL
          ) t
        ) t2
        WHERE rn = 100
      )
      SELECT 
        milestone,
        milestone_date,
        status,
        CASE WHEN milestone_date <= CURRENT_DATE THEN true ELSE false END as achieved
      FROM milestone_data
      WHERE milestone_date IS NOT NULL
      ORDER BY display_order;
    `;
    await client.query(createKeyMilestonesView);
    console.log('✓ key_milestones view created');
    
    // 4. Create prerequisites view
    console.log('\n4. Creating prerequisites view...');
    const createPrerequisitesView = `
      CREATE OR REPLACE VIEW prerequisites AS
      SELECT 
        'Pole Permissions' as prerequisite,
        COUNT(DISTINCT pole_number) as completed,
        5000 as target,
        ROUND((COUNT(DISTINCT pole_number)::numeric / 5000 * 100)::numeric, 2) as percentage,
        CASE WHEN COUNT(DISTINCT pole_number) >= 5000 THEN true ELSE false END as met
      FROM status_changes
      WHERE status = 'Pole Permission: Approved'
      
      UNION ALL
      
      SELECT 
        'Home Sign Ups' as prerequisite,
        COUNT(DISTINCT address) as completed,
        10000 as target,
        ROUND((COUNT(DISTINCT address)::numeric / 10000 * 100)::numeric, 2) as percentage,
        CASE WHEN COUNT(DISTINCT address) >= 10000 THEN true ELSE false END as met
      FROM status_changes
      WHERE status LIKE 'Home Sign Ups:%'
      
      UNION ALL
      
      SELECT 
        'Contractor Assignments' as prerequisite,
        COUNT(DISTINCT agent_name) as completed,
        10 as target,
        ROUND((COUNT(DISTINCT agent_name)::numeric / 10 * 100)::numeric, 2) as percentage,
        CASE WHEN COUNT(DISTINCT agent_name) >= 10 THEN true ELSE false END as met
      FROM status_changes
      WHERE agent_name IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Zone Coverage' as prerequisite,
        COUNT(DISTINCT zone) as completed,
        20 as target,
        ROUND((COUNT(DISTINCT zone)::numeric / 20 * 100)::numeric, 2) as percentage,
        CASE WHEN COUNT(DISTINCT zone) >= 20 THEN true ELSE false END as met
      FROM status_changes
      WHERE zone IS NOT NULL;
    `;
    await client.query(createPrerequisitesView);
    console.log('✓ prerequisites view created');
    
    // Test the views
    console.log('\n\nTesting the views...\n');
    
    console.log('zone_progress sample:');
    const zoneTest = await client.query('SELECT * FROM zone_progress LIMIT 3');
    console.table(zoneTest.rows);
    
    console.log('\ndaily_progress sample:');
    const dailyTest = await client.query('SELECT * FROM daily_progress LIMIT 3');
    console.table(dailyTest.rows);
    
    console.log('\nkey_milestones:');
    const milestonesTest = await client.query('SELECT * FROM key_milestones');
    console.table(milestonesTest.rows);
    
    console.log('\nprerequisites:');
    const prereqTest = await client.query('SELECT * FROM prerequisites');
    console.table(prereqTest.rows);
    
    console.log('\n✅ All views created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

createAnalyticsViews().catch(console.error);