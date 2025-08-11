#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeStatusValues() {
  console.log('🔍 Analyzing status values in Supabase...\n');

  try {
    // Get all unique status values
    const { data: allData, error } = await supabase
      .from('status_changes')
      .select('status')
      .eq('project_name', 'Lawley');
    
    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    console.log(`Total records for Lawley: ${allData.length}\n`);

    // Count status values
    const statusCounts = {};
    allData.forEach(record => {
      const status = record.status || 'Empty';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📊 Status value counts:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

    // Analyze specific milestone categories
    console.log('\n🎯 Milestone Analysis:');
    
    // Permissions
    const permissionStatuses = Object.entries(statusCounts)
      .filter(([status]) => status.toLowerCase().includes('permission'))
      .reduce((sum, [_, count]) => sum + count, 0);
    console.log(`\nPermission-related statuses: ${permissionStatuses}`);

    // Sign ups
    const signupStatuses = Object.entries(statusCounts)
      .filter(([status]) => status.toLowerCase().includes('sign') && status.toLowerCase().includes('up'))
      .reduce((sum, [_, count]) => sum + count, 0);
    console.log(`Sign-up related statuses: ${signupStatuses}`);

    // Installations
    const installStatuses = Object.entries(statusCounts)
      .filter(([status]) => status.toLowerCase().includes('install'))
      .reduce((sum, [_, count]) => sum + count, 0);
    console.log(`Installation-related statuses: ${installStatuses}`);

    // Connected
    const connectedStatuses = Object.entries(statusCounts)
      .filter(([status]) => status.toLowerCase().includes('connected'))
      .reduce((sum, [_, count]) => sum + count, 0);
    console.log(`Connected statuses: ${connectedStatuses}`);

    // Get unique pole numbers
    const { data: poleData, error: poleError } = await supabase
      .from('status_changes')
      .select('pole_number')
      .eq('project_name', 'Lawley')
      .not('pole_number', 'is', null);

    if (!poleError) {
      const uniquePoles = new Set(poleData.map(p => p.pole_number));
      console.log(`\n📍 Unique poles: ${uniquePoles.size}`);
    }

    // Get unique property IDs
    const { data: propData, error: propError } = await supabase
      .from('status_changes')
      .select('property_id')
      .eq('project_name', 'Lawley')
      .not('property_id', 'is', null);

    if (!propError) {
      const uniqueProperties = new Set(propData.map(p => p.property_id));
      console.log(`🏠 Unique properties: ${uniqueProperties.size}`);
    }

    // Check specific statuses the app is looking for
    console.log('\n🔎 Checking specific status patterns:');
    
    // Check for exact matches
    const checkPatterns = [
      { pattern: 'Permission', contains: 'Approved' },
      { pattern: 'Pole', contains: 'Planted' },
      { pattern: 'Stringing', contains: 'Complete' },
      { pattern: 'Sign', contains: 'Up' },
      { pattern: 'Drop', contains: 'Complete' },
      { pattern: 'Connected', contains: null }
    ];

    for (const check of checkPatterns) {
      const matches = Object.entries(statusCounts).filter(([status]) => {
        const hasPattern = status.includes(check.pattern);
        const hasContains = !check.contains || status.includes(check.contains);
        return hasPattern && hasContains;
      });
      
      console.log(`\n  Pattern "${check.pattern}"${check.contains ? ` + "${check.contains}"` : ''}:`);
      matches.forEach(([status, count]) => {
        console.log(`    - "${status}": ${count}`);
      });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

analyzeStatusValues();