#!/usr/bin/env node

/**
 * Check what tables actually exist in Neon database
 * This will help us update the Argon service to use the correct tables
 */

const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function checkTables() {
  console.log('🔍 Checking Neon database tables...\n');
  
  try {
    const sql = neon(connectionString);
    
    // 1. Get all tables
    console.log('📋 Available tables:');
    const tables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    for (const table of tables) {
      console.log(`   • ${table.table_name} (${table.table_type})`);
    }
    console.log(`\n   Total: ${tables.length} tables\n`);
    
    // 2. Check each table's row count and columns
    for (const table of tables) {
      if (table.table_type === 'BASE TABLE') {
        try {
          console.log(`📊 Table: ${table.table_name}`);
          
          // Get row count
          const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(table.table_name)}`;
          console.log(`   Rows: ${countResult[0].count}`);
          
          // Get columns
          const columns = await sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = ${table.table_name}
            ORDER BY ordinal_position
          `;
          
          console.log(`   Columns (${columns.length}):`);
          columns.slice(0, 10).forEach(col => {
            console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
          });
          
          if (columns.length > 10) {
            console.log(`     ... and ${columns.length - 10} more columns`);
          }
          
          // Get sample data for first few rows
          const sampleData = await sql`SELECT * FROM ${sql(table.table_name)} LIMIT 2`;
          if (sampleData.length > 0) {
            console.log(`   Sample data:`);
            console.log(`     `, JSON.stringify(sampleData[0], null, 2).slice(0, 200) + '...');
          }
          
          console.log('');
        } catch (error) {
          console.log(`   ❌ Error querying ${table.table_name}: ${error.message}\n`);
        }
      }
    }
    
    // 3. Look for specific analytics-friendly tables
    console.log('🎯 Analytics opportunities:');
    
    if (tables.find(t => t.table_name === 'status_changes')) {
      console.log('   ✅ status_changes table found - good for status analytics');
      
      // Check status distribution
      const statusDist = await sql`
        SELECT status, COUNT(*) as count
        FROM status_changes
        GROUP BY status
        ORDER BY count DESC
        LIMIT 10
      `;
      
      console.log('   Status distribution:');
      statusDist.forEach(s => {
        console.log(`     - ${s.status}: ${s.count} records`);
      });
    }
    
    if (tables.find(t => t.table_name === 'import_batches')) {
      console.log('   ✅ import_batches table found - good for batch analytics');
    }
    
    console.log('\n✅ Table inspection complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the check
checkTables();