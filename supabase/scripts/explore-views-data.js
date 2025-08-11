#!/usr/bin/env node

/**
 * Explore the views that exist in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const views = [
  'status_summary',
  'pole_summary',
  'agent_performance',
  'daily_stats',
  'weekly_stats',
  'project_summary'
];

async function exploreView(viewName) {
  console.log(`\n🔍 VIEW: ${viewName}`);
  console.log('=' .repeat(60));

  try {
    // Get data from view
    const { data, error, count } = await supabase
      .from(viewName)
      .select('*')
      .limit(10);

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }

    console.log(`✅ Sample Records (up to 10):`);

    if (data && data.length > 0) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('No data in view');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 EXPLORING VIEWS IN SUPABASE');
  console.log('=' .repeat(60));

  for (const view of views) {
    await exploreView(view);
  }
}

main().catch(console.error);