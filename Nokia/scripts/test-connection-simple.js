#!/usr/bin/env node

// Very simple connection test
const { Client } = require('pg');

async function testConnection() {
  // Try with minimal connection config
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
    connectionTimeoutMillis: 5000, // 5 seconds only
    query_timeout: 3000, // 3 seconds only
  });

  try {
    console.log('🔌 Testing Neon database connection...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Try simple query
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Query test passed:', result.rows[0]);
    
    // Check if nokia_data table exists
    const tableCheck = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nokia_data')");
    console.log('📋 nokia_data table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Quick count
      const countResult = await client.query('SELECT COUNT(*) as count FROM nokia_data');
      console.log('📊 Current record count:', countResult.rows[0].count);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Database appears to be unreachable or very slow');
      console.log('🔧 This could indicate:');
      console.log('   - Network connectivity issues');
      console.log('   - Neon database is sleeping/scaling down');
      console.log('   - Connection string is incorrect');
      console.log('   - Database server is overloaded');
    }
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

testConnection();