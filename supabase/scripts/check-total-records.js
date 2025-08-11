#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTotalRecords() {
  console.log('🔍 Checking total records in Supabase...\n');

  try {
    // Get count of all records
    const { count: totalCount, error: totalError } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total records in status_changes: ${totalCount}`);

    // Get count for Lawley
    const { count: lawleyCount, error: lawleyError } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true })
      .eq('project_name', 'Lawley');
    
    console.log(`📊 Total records for Lawley: ${lawleyCount}`);

    // Try to get all records with pagination
    console.log('\n📋 Fetching all records with pagination...');
    
    let allRecords = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('status_changes')
        .select('*')
        .eq('project_name', 'Lawley')
        .range(from, from + limit - 1);

      if (error) {
        console.error('Error:', error);
        break;
      }

      allRecords = allRecords.concat(data);
      console.log(`  Fetched ${data.length} records (total so far: ${allRecords.length})`);
      
      hasMore = data.length === limit;
      from += limit;
    }

    console.log(`\n✅ Total records fetched: ${allRecords.length}`);

    // Analyze the complete dataset
    const statusCounts = {};
    const uniquePoles = new Set();
    const uniqueProperties = new Set();

    allRecords.forEach(record => {
      const status = record.status || 'Empty';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (record.pole_number) uniquePoles.add(record.pole_number);
      if (record.property_id) uniqueProperties.add(record.property_id);
    });

    console.log(`\n📍 Unique poles: ${uniquePoles.size}`);
    console.log(`🏠 Unique properties: ${uniqueProperties.size}`);

    console.log('\n📊 Status counts:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTotalRecords();