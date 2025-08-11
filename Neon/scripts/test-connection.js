#!/usr/bin/env node

/**
 * Test Neon Database Connection
 * 
 * This script verifies that we can connect to the Neon database
 * and perform basic operations.
 */

const { neon } = require('@neondatabase/serverless');

// Connection string (in production, use environment variable)
const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function testConnection() {
  console.log('🔌 Testing Neon connection...\n');
  
  try {
    // Create connection
    const sql = neon(connectionString);
    
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const timeResult = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connected successfully!');
    console.log(`   Current time: ${timeResult[0].current_time}`);
    console.log(`   PostgreSQL: ${timeResult[0].pg_version.split(',')[0]}\n`);
    
    // Test 2: Create a test table
    console.log('2️⃣ Creating test table...');
    await sql`
      CREATE TABLE IF NOT EXISTS connection_tests (
        id SERIAL PRIMARY KEY,
        test_name VARCHAR(100),
        tested_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Table created/verified\n');
    
    // Test 3: Insert test data
    console.log('3️⃣ Inserting test data...');
    const insertResult = await sql`
      INSERT INTO connection_tests (test_name) 
      VALUES ('FibreFlow Connection Test')
      RETURNING id, test_name, tested_at
    `;
    console.log('✅ Data inserted:', insertResult[0]);
    console.log(`   ID: ${insertResult[0].id}`);
    console.log(`   Name: ${insertResult[0].test_name}`);
    console.log(`   Time: ${insertResult[0].tested_at}\n`);
    
    // Test 4: Query data
    console.log('4️⃣ Querying test data...');
    const queryResult = await sql`
      SELECT COUNT(*) as total_tests 
      FROM connection_tests 
      WHERE tested_at > NOW() - INTERVAL '1 hour'
    `;
    console.log(`✅ Found ${queryResult[0].total_tests} recent test(s)\n`);
    
    // Test 5: Database info
    console.log('5️⃣ Database information...');
    const dbInfo = await sql`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        pg_database_size(current_database()) as db_size
    `;
    console.log('✅ Database details:');
    console.log(`   Database: ${dbInfo[0].database}`);
    console.log(`   User: ${dbInfo[0].user}`);
    console.log(`   Size: ${formatBytes(dbInfo[0].db_size)}\n`);
    
    // Test 6: Check available schemas
    console.log('6️⃣ Available schemas...');
    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `;
    console.log('✅ Schemas:', schemas.map(s => s.schema_name).join(', '));
    
    console.log('\n✅ All tests passed! Neon is ready for use.\n');
    
    // Cleanup option
    console.log('💡 To clean up test data, run:');
    console.log('   DROP TABLE connection_tests;\n');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the test
testConnection();