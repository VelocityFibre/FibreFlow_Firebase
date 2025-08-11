#!/usr/bin/env node

/**
 * Supabase Database Structure Explorer
 * 
 * This script connects to Supabase and explores:
 * 1. All tables in the public schema
 * 2. All views
 * 3. All functions
 * 4. RPC functions
 * 5. Status_changes table structure (if exists)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all tables in the public schema
 */
async function listTables() {
  console.log('\n📊 TABLES IN PUBLIC SCHEMA:');
  console.log('=' .repeat(60));
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')
    .order('table_name');

  if (error) {
    // Try alternative approach
    console.log('⚠️  Cannot access information_schema, trying alternative approach...');
    
    // Try to list tables using pg_catalog
    const { data: tables, error: tableError } = await supabase.rpc('get_tables', {});
    
    if (tableError) {
      console.error('❌ Error listing tables:', tableError.message);
      return [];
    }
    
    return tables || [];
  }

  if (data && data.length > 0) {
    data.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    return data.map(t => t.table_name);
  } else {
    console.log('No tables found or insufficient permissions');
    return [];
  }
}

/**
 * Get all views in the public schema
 */
async function listViews() {
  console.log('\n👁️  VIEWS IN PUBLIC SCHEMA:');
  console.log('=' .repeat(60));
  
  const { data, error } = await supabase
    .from('information_schema.views')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.error('❌ Error listing views:', error.message);
    return [];
  }

  if (data && data.length > 0) {
    data.forEach((view, index) => {
      console.log(`${index + 1}. ${view.table_name}`);
    });
    return data.map(v => v.table_name);
  } else {
    console.log('No views found or insufficient permissions');
    return [];
  }
}

/**
 * Get all functions in the public schema
 */
async function listFunctions() {
  console.log('\n🔧 FUNCTIONS IN PUBLIC SCHEMA:');
  console.log('=' .repeat(60));
  
  const { data, error } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_type')
    .eq('routine_schema', 'public')
    .order('routine_name');

  if (error) {
    console.error('❌ Error listing functions:', error.message);
    return [];
  }

  if (data && data.length > 0) {
    data.forEach((func, index) => {
      console.log(`${index + 1}. ${func.routine_name} (${func.routine_type})`);
    });
    return data.map(f => f.routine_name);
  } else {
    console.log('No functions found or insufficient permissions');
    return [];
  }
}

/**
 * Try to access status_changes table
 */
async function checkStatusChangesTable() {
  console.log('\n🔍 CHECKING STATUS_CHANGES TABLE:');
  console.log('=' .repeat(60));
  
  // First, try to get table structure
  const { data: columns, error: columnError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'status_changes')
    .order('ordinal_position');

  if (columnError) {
    console.log('❌ Cannot access column information for status_changes');
  } else if (columns && columns.length > 0) {
    console.log('✅ Table structure:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`);
    });
  }

  // Try to query the table
  const { data, error, count } = await supabase
    .from('status_changes')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('❌ Cannot access status_changes table:', error.message);
    return false;
  }

  console.log(`✅ Table exists with ${count || 0} records`);

  // Get a sample record
  const { data: sample, error: sampleError } = await supabase
    .from('status_changes')
    .select('*')
    .limit(1);

  if (!sampleError && sample && sample.length > 0) {
    console.log('\n📝 Sample record structure:');
    console.log(JSON.stringify(sample[0], null, 2));
  }

  return true;
}

/**
 * List available RPC functions
 */
async function listRpcFunctions() {
  console.log('\n🚀 AVAILABLE RPC FUNCTIONS:');
  console.log('=' .repeat(60));
  
  // Common RPC function names to test
  const commonRpcNames = [
    'get_status_changes',
    'get_status_change_counts',
    'get_unique_values',
    'get_agent_stats',
    'get_pole_stats',
    'get_tables',
    'get_schema_info'
  ];

  for (const funcName of commonRpcNames) {
    try {
      // Try to call with minimal/no parameters
      const { data, error } = await supabase.rpc(funcName, {});
      
      if (!error) {
        console.log(`✅ ${funcName} - Available`);
      } else if (error.message.includes('required')) {
        console.log(`⚠️  ${funcName} - Available (requires parameters)`);
      } else if (!error.message.includes('does not exist')) {
        console.log(`⚠️  ${funcName} - Error: ${error.message}`);
      }
    } catch (e) {
      // Function doesn't exist
    }
  }
}

/**
 * Try to list all tables using different methods
 */
async function listTablesAlternative() {
  console.log('\n📋 ATTEMPTING ALTERNATIVE TABLE DISCOVERY:');
  console.log('=' .repeat(60));
  
  // Try common table names
  const commonTableNames = [
    'status_changes',
    'status_change',
    'onemap_status_changes',
    'pole_status_changes',
    'drop_status_changes',
    'poles',
    'drops',
    'properties',
    'addresses',
    'agents',
    'users',
    'profiles'
  ];

  for (const tableName of commonTableNames) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${tableName} - Exists (${count || 0} records)`);
      }
    } catch (e) {
      // Table doesn't exist
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔌 Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}`);
  console.log('');

  try {
    // 1. List tables
    const tables = await listTables();
    
    // 2. List views
    const views = await listViews();
    
    // 3. List functions
    const functions = await listFunctions();
    
    // 4. Check status_changes specifically
    await checkStatusChangesTable();
    
    // 5. List RPC functions
    await listRpcFunctions();
    
    // 6. Try alternative discovery
    if (tables.length === 0) {
      await listTablesAlternative();
    }
    
    console.log('\n✅ Exploration complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);