#!/usr/bin/env node

/**
 * Setup Progress Views in Supabase
 * 
 * This script creates the necessary tables, views, and RPC functions
 * for the OneMap Progress Summary dashboard in Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration from environment
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

// Note: For DDL operations, we need service role key. Since we don't have it,
// we'll need to run the SQL manually in Supabase SQL editor.

console.log('🚀 Supabase Progress Views Setup\n');
console.log('Since we need admin privileges to create tables and views,');
console.log('please follow these steps:\n');

console.log('1. Go to your Supabase project dashboard:');
console.log('   https://supabase.com/dashboard/project/vkmpbprvooxgrkwrkbcf\n');

console.log('2. Navigate to SQL Editor (left sidebar)\n');

console.log('3. Create a new query and paste the following SQL:\n');

// Read the SQL file
const sqlPath = path.join(__dirname, '../sql/create_progress_views.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

console.log('--- START SQL ---');
console.log(sqlContent);
console.log('--- END SQL ---\n');

console.log('4. Click "Run" to execute the SQL\n');

console.log('5. After successful execution, you can test with this query:');
console.log(`   SELECT * FROM get_project_progress_summary('Lawley');\n`);

console.log('Alternative: Use Supabase CLI if you have it installed:');
console.log(`   supabase db push --db-url "${supabaseUrl}"\n`);

// Test connection with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('📡 Testing Supabase connection...');
  
  try {
    // Try to query a simple table to test connection
    const { data, error } = await supabase
      .from('status_changes')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code === '42P01') {
      console.log('✅ Connected to Supabase, but tables don\'t exist yet.');
      console.log('   Please run the SQL script above to create them.');
    } else if (error) {
      console.log('❌ Connection error:', error.message);
    } else {
      console.log('✅ Connected to Supabase successfully!');
      console.log('   Tables might already exist. Testing RPC function...');
      
      // Test the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_project_progress_summary', { project_name: 'Lawley' });
      
      if (rpcError && rpcError.code === '42883') {
        console.log('⚠️  Function doesn\'t exist. Please run the SQL script.');
      } else if (rpcError) {
        console.log('❌ RPC error:', rpcError.message);
      } else {
        console.log('✅ RPC function exists and is working!');
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testConnection();