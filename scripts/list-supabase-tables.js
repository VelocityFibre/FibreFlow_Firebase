#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
  console.log('🔍 Fetching Supabase tables...\n');
  console.log(`URL: ${supabaseUrl}\n`);

  try {
    // Query the information_schema to get all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // If information_schema is not accessible, try a different approach
      console.log('⚠️  Could not access information_schema. Trying alternative method...\n');
      
      // Try to list tables using REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse OpenAPI spec to get available tables
      const spec = await response.json();
      if (spec.paths) {
        const tableNames = Object.keys(spec.paths)
          .filter(path => path.startsWith('/') && !path.includes('{'))
          .map(path => path.substring(1))
          .filter(name => name && !name.includes('/'));

        console.log(`📊 Found ${tableNames.length} tables:\n`);
        
        // Try to get row counts for each table
        for (const tableName of tableNames) {
          try {
            const { count, error: countError } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });

            if (!countError) {
              console.log(`  • ${tableName.padEnd(30)} (${count} rows)`);
            } else {
              console.log(`  • ${tableName.padEnd(30)} (count unavailable)`);
            }
          } catch (e) {
            console.log(`  • ${tableName.padEnd(30)} (access denied)`);
          }
        }
      } else {
        console.log('❌ Could not parse API response');
      }
      return;
    }

    // If we successfully accessed information_schema
    console.log(`📊 Found ${tables.length} tables in public schema:\n`);

    // Get row counts for each table
    for (const table of tables) {
      try {
        const { count, error: countError } = await supabase
          .from(table.table_name)
          .select('*', { count: 'exact', head: true });

        if (!countError) {
          console.log(`  • ${table.table_name.padEnd(30)} [${table.table_type}] (${count} rows)`);
        } else {
          console.log(`  • ${table.table_name.padEnd(30)} [${table.table_type}] (count unavailable)`);
        }
      } catch (e) {
        console.log(`  • ${table.table_name.padEnd(30)} [${table.table_type}] (access denied)`);
      }
    }

    // Also check for RLS policies
    console.log('\n🔒 Checking Row Level Security (RLS) status...\n');
    
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status', {});
    
    if (!rlsError && rlsStatus) {
      console.log('RLS Status:', rlsStatus);
    } else {
      console.log('Could not determine RLS status');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try a simple query to see if we can connect at all
    console.log('\n🔍 Attempting simple connection test...\n');
    
    try {
      // Try to query a common table name
      const testTables = ['users', 'profiles', 'projects', 'tasks', 'items'];
      let foundAny = false;
      
      for (const tableName of testTables) {
        try {
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (count !== null) {
            console.log(`  ✓ Found table: ${tableName} (${count} rows)`);
            foundAny = true;
          }
        } catch (e) {
          // Table doesn't exist or no access
        }
      }
      
      if (!foundAny) {
        console.log('  ❌ Could not find any common table names');
        console.log('\n💡 Tip: Make sure you have the correct permissions to access the database.');
      }
    } catch (testError) {
      console.log('  ❌ Connection test failed:', testError.message);
    }
  }
}

// Run the script
listTables().catch(console.error);