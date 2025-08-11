#!/usr/bin/env node

/**
 * Analyze status_changes table in detail
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeStatusChanges() {
  console.log('🔍 ANALYZING STATUS_CHANGES TABLE');
  console.log('=' .repeat(60));

  // 1. Get total count
  const { count } = await supabase
    .from('status_changes')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total Records: ${count}`);

  // 2. Get unique statuses
  console.log('\n📋 Unique Statuses:');
  const { data: statuses } = await supabase
    .from('status_changes')
    .select('status')
    .order('status');
  
  const uniqueStatuses = [...new Set(statuses.map(s => s.status))];
  uniqueStatuses.forEach((status, index) => {
    console.log(`${index + 1}. ${status}`);
  });

  // 3. Count by status
  console.log('\n📈 Records by Status:');
  for (const status of uniqueStatuses) {
    const { count: statusCount } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    
    console.log(`   ${status}: ${statusCount}`);
  }

  // 4. Check date fields
  console.log('\n📅 Date Fields Analysis:');
  const dateFields = [
    'status_date',
    'created_at',
    'connected_date',
    'permission_date',
    'pole_planted_date',
    'stringing_date',
    'signup_date',
    'drop_date',
    'date_stamp'
  ];

  for (const field of dateFields) {
    const { count: nonNullCount } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true })
      .not(field, 'is', null);
    
    console.log(`   ${field}: ${nonNullCount} non-null values`);
  }

  // 5. Get sample records for each status
  console.log('\n📝 Sample Records by Status:');
  for (const status of uniqueStatuses.slice(0, 5)) { // First 5 statuses
    const { data: sample } = await supabase
      .from('status_changes')
      .select('*')
      .eq('status', status)
      .limit(1);
    
    if (sample && sample.length > 0) {
      console.log(`\n${status}:`);
      console.log(JSON.stringify(sample[0], null, 2));
    }
  }

  // 6. Check for poles with multiple statuses
  console.log('\n🔄 Poles with Multiple Status Changes:');
  const { data: poles } = await supabase
    .from('status_changes')
    .select('pole_number')
    .not('pole_number', 'is', null);
  
  const poleCounts = {};
  poles.forEach(p => {
    poleCounts[p.pole_number] = (poleCounts[p.pole_number] || 0) + 1;
  });
  
  const multiStatusPoles = Object.entries(poleCounts)
    .filter(([pole, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  multiStatusPoles.forEach(([pole, count]) => {
    console.log(`   ${pole}: ${count} status changes`);
  });

  // 7. Check project names
  console.log('\n🏗️ Projects:');
  const { data: projects } = await supabase
    .from('status_changes')
    .select('project_name')
    .not('project_name', 'is', null);
  
  const uniqueProjects = [...new Set(projects.map(p => p.project_name))];
  uniqueProjects.forEach(project => {
    console.log(`   - ${project}`);
  });
}

// Run the analysis
analyzeStatusChanges().catch(console.error);