#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
};

async function executeViewCreation() {
  const client = new Client(NEON_CONFIG);
  
  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // List of SQL files to execute
    const sqlFiles = [
      'create-zone-progress-view.sql',
      'create-daily-progress-view.sql',
      'create-key-milestones-view.sql',
      'create-prerequisites-view.sql'
    ];
    
    // Execute each SQL file
    for (const file of sqlFiles) {
      console.log(`\n📝 Executing ${file}...`);
      try {
        const sqlPath = path.join(__dirname, file);
        const sql = await fs.readFile(sqlPath, 'utf8');
        await client.query(sql);
        console.log(`✅ ${file} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing ${file}:`, error.message);
      }
    }
    
    // Test the views
    console.log('\n\n🧪 Testing the views...\n');
    
    // Test zone_progress
    try {
      console.log('1. Testing zone_progress view:');
      const zoneResult = await client.query('SELECT * FROM zone_progress LIMIT 3');
      console.log(`✅ zone_progress view works! Found ${zoneResult.rowCount} rows`);
      if (zoneResult.rows.length > 0) {
        console.log('Sample data:');
        console.table(zoneResult.rows);
      }
    } catch (error) {
      console.error('❌ Error testing zone_progress:', error.message);
    }
    
    // Test daily_progress
    try {
      console.log('\n2. Testing daily_progress view:');
      const dailyResult = await client.query('SELECT * FROM daily_progress LIMIT 3');
      console.log(`✅ daily_progress view works! Found ${dailyResult.rowCount} rows`);
      if (dailyResult.rows.length > 0) {
        console.log('Sample data:');
        console.table(dailyResult.rows);
      }
    } catch (error) {
      console.error('❌ Error testing daily_progress:', error.message);
    }
    
    // Test key_milestones
    try {
      console.log('\n3. Testing key_milestones view:');
      const milestonesResult = await client.query('SELECT * FROM key_milestones');
      console.log(`✅ key_milestones view works! Found ${milestonesResult.rowCount} rows`);
      if (milestonesResult.rows.length > 0) {
        console.log('All milestones:');
        console.table(milestonesResult.rows);
      }
    } catch (error) {
      console.error('❌ Error testing key_milestones:', error.message);
    }
    
    // Test prerequisites
    try {
      console.log('\n4. Testing prerequisites view:');
      const prereqResult = await client.query('SELECT * FROM prerequisites');
      console.log(`✅ prerequisites view works! Found ${prereqResult.rowCount} rows`);
      if (prereqResult.rows.length > 0) {
        console.log('All prerequisites:');
        console.table(prereqResult.rows);
      }
    } catch (error) {
      console.error('❌ Error testing prerequisites:', error.message);
    }
    
    console.log('\n\n✅ View creation completed!');
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

executeViewCreation().catch(console.error);