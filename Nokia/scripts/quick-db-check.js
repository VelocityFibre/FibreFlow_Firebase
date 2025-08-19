#!/usr/bin/env node

// Quick database connection and count check
const { Client } = require('pg');

const connectionString = process.env.NEON_CONNECTION_STRING || 
  'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function quickCheck() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    statement_timeout: 10000,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('🔍 Checking nokia_data table...');
    
    // Quick count
    const result = await client.query('SELECT COUNT(*) as count FROM nokia_data');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Total records in nokia_data table: ${count}`);
    
    if (count === 0) {
      console.log('❌ Table is empty - import may have failed or not completed');
      console.log('💡 Try re-running the import script');
    } else {
      console.log('✅ Data exists - checking sample...');
      
      // Sample data
      const sampleResult = await client.query('SELECT drop_number, serial_number, team, status FROM nokia_data LIMIT 3');
      console.log('\n📋 Sample records:');
      console.table(sampleResult.rows);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('💡 The nokia_data table may not exist');
      console.log('🔧 Run: node create-table-direct.js');
    } else if (error.message.includes('timeout')) {
      console.log('⏱️  Connection timeout - database may be slow');
    } else if (error.message.includes('connect')) {
      console.log('🔌 Connection failed - check network/credentials');
    }
  } finally {
    try {
      await client.end();
      console.log('🔌 Connection closed');
    } catch (e) {
      // Ignore close errors
    }
  }
}

quickCheck();