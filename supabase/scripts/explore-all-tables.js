#!/usr/bin/env node

/**
 * Explore all discovered tables in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
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

async function exploreTable(tableName) {
  console.log(`\n📊 TABLE: ${tableName}`);
  console.log('=' .repeat(60));

  try {
    // Get count
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }

    console.log(`✅ Records: ${count}`);

    // Get sample record if table has data
    if (count > 0) {
      const { data: sample } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sample && sample.length > 0) {
        console.log('\n📝 Sample Record:');
        console.log(JSON.stringify(sample[0], null, 2));
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 EXPLORING ALL TABLES IN SUPABASE');
  console.log('=' .repeat(60));

  for (const table of tables) {
    await exploreTable(table);
  }

  // Also check for any views or materialized views
  console.log('\n\n🔍 CHECKING FOR VIEWS');
  console.log('=' .repeat(60));

  // Try common view names
  const viewNames = [
    'status_summary',
    'pole_summary',
    'agent_performance',
    'daily_stats',
    'weekly_stats',
    'project_summary'
  ];

  for (const viewName of viewNames) {
    try {
      const { count, error } = await supabase
        .from(viewName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${viewName} - Exists (${count} records)`);
      }
    } catch (e) {
      // View doesn't exist
    }
  }
}

main().catch(console.error);