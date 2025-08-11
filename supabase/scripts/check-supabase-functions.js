#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseStructure() {
  console.log('🔍 Checking Supabase database structure...\n');

  try {
    // Check if we can query the views directly
    console.log('📊 Checking Views:');
    
    // Try to query build_milestones_summary view
    const { data: milestones, error: milestonesError } = await supabase
      .from('build_milestones_summary')
      .select('*')
      .limit(1);
    
    if (!milestonesError) {
      console.log('✅ build_milestones_summary view is accessible');
      console.log('   Sample data:', milestones);
    } else {
      console.log('❌ build_milestones_summary:', milestonesError.message);
    }

    // Try to query zone_progress_detail view
    const { data: zones, error: zonesError } = await supabase
      .from('zone_progress_detail')
      .select('*')
      .limit(1);
    
    if (!zonesError) {
      console.log('✅ zone_progress_detail view is accessible');
      console.log('   Sample data:', zones);
    } else {
      console.log('❌ zone_progress_detail:', zonesError.message);
    }

    // Check different possible RPC function names
    console.log('\n📋 Checking RPC Functions:');
    
    const functionNames = [
      'get_project_progress_summary',
      'getProjectProgressSummary',
      'project_progress_summary',
      'get_progress_summary',
      'progress_summary'
    ];

    for (const funcName of functionNames) {
      const { data, error } = await supabase.rpc(funcName, { project_name: 'Lawley' });
      
      if (!error) {
        console.log(`✅ Found working function: ${funcName}`);
        console.log('   Response structure:', Object.keys(data || {}));
        break;
      } else {
        console.log(`❌ ${funcName}: ${error.code}`);
      }
    }

    // Check what columns exist in status_changes
    console.log('\n📝 status_changes table structure:');
    const { data: sample, error: sampleError } = await supabase
      .from('status_changes')
      .select('*')
      .limit(1);
    
    if (!sampleError && sample && sample.length > 0) {
      console.log('Columns:', Object.keys(sample[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(sample[0], null, 2));
    }

    // Try a manual aggregation query to get build milestones
    console.log('\n🔧 Testing manual aggregation:');
    const { data: permissions, error: permError } = await supabase
      .from('status_changes')
      .select('pole_number, status')
      .eq('project_name', 'Lawley')
      .like('status', '%Permission%Approved%')
      .limit(5);
    
    if (!permError) {
      console.log(`Found ${permissions.length} permission records`);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSupabaseStructure();