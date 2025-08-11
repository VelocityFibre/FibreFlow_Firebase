#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkZones() {
  console.log('🔍 Checking zones in Supabase...\n');

  try {
    // Get a sample of records to check fields
    const { data, error } = await supabase
      .from('status_changes')
      .select('zone, feeder, distribution')
      .eq('project_name', 'Lawley')
      .limit(100);
    
    if (error) {
      console.error('Error:', error);
      return;
    }

    // Check if any zones exist
    const hasZones = data.some(d => d.zone !== null);
    const hasFeeders = data.some(d => d.feeder !== null);
    const hasDistribution = data.some(d => d.distribution !== null);

    console.log(`Has zones: ${hasZones}`);
    console.log(`Has feeders: ${hasFeeders}`);
    console.log(`Has distribution: ${hasDistribution}`);

    // Count non-null values
    const zoneCount = data.filter(d => d.zone !== null).length;
    const feederCount = data.filter(d => d.feeder !== null).length;
    const distributionCount = data.filter(d => d.distribution !== null).length;

    console.log(`\nOut of 100 records:`);
    console.log(`Records with zone: ${zoneCount}`);
    console.log(`Records with feeder: ${feederCount}`);
    console.log(`Records with distribution: ${distributionCount}`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkZones();