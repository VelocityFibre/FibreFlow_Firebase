#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyCalculations() {
  console.log('🔍 Verifying calculations against Supabase...\n');

  try {
    // Fetch all records with pagination (same as the app does)
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
        return;
      }

      allRecords = allRecords.concat(data || []);
      hasMore = (data?.length || 0) === limit;
      from += limit;
    }

    console.log(`✅ Fetched ${allRecords.length} total records`);

    // Replicate the app's calculations exactly
    const uniquePoles = new Set(allRecords.filter(d => d.pole_number).map(d => d.pole_number));
    const uniqueProperties = new Set(allRecords.filter(d => d.property_id).map(d => d.property_id));
    
    console.log(`📊 Base counts:`);
    console.log(`   Unique poles: ${uniquePoles.size}`);
    console.log(`   Unique properties: ${uniqueProperties.size}`);

    // Calculate permissions - count unique poles with "Pole Permission: Approved"
    const permissionPoles = new Set(
      allRecords.filter(d => d.status === 'Pole Permission: Approved' && d.pole_number)
        .map(d => d.pole_number)
    );

    // Calculate sign ups - any status with "Sign Ups"
    const signupProperties = new Set(
      allRecords.filter(d => d.status?.includes('Home Sign Ups') && d.property_id)
        .map(d => d.property_id)
    );

    // Calculate connected - "Home Installation: Installed"
    const connectedProperties = new Set(
      allRecords.filter(d => d.status === 'Home Installation: Installed' && d.property_id)
        .map(d => d.property_id)
    );

    // Calculate in progress installations
    const installationInProgressProperties = new Set(
      allRecords.filter(d => d.status === 'Home Installation: In Progress' && d.property_id)
        .map(d => d.property_id)
    );

    console.log(`\n🎯 Milestone calculations:`);
    console.log(`   Permissions: ${permissionPoles.size}/${uniquePoles.size} = ${Math.round((permissionPoles.size / uniquePoles.size) * 100)}%`);
    console.log(`   Sign Ups: ${signupProperties.size}/${uniqueProperties.size} = ${Math.round((signupProperties.size / uniqueProperties.size) * 100)}%`);
    console.log(`   Connected: ${connectedProperties.size}/${uniqueProperties.size} = ${Math.round((connectedProperties.size / uniqueProperties.size) * 100)}%`);
    console.log(`   Drops (in progress + connected): ${installationInProgressProperties.size + connectedProperties.size}/${uniqueProperties.size} = ${Math.round(((installationInProgressProperties.size + connectedProperties.size) / uniqueProperties.size) * 100)}%`);

    // Verify against raw counts
    console.log(`\n🔍 Raw status counts for verification:`);
    const statusCounts = {};
    allRecords.forEach(record => {
      const status = record.status || 'Empty';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log(`   "Pole Permission: Approved": ${statusCounts['Pole Permission: Approved'] || 0} records`);
    console.log(`   "Home Installation: Installed": ${statusCounts['Home Installation: Installed'] || 0} records`);
    console.log(`   "Home Installation: In Progress": ${statusCounts['Home Installation: In Progress'] || 0} records`);
    
    // Count all Home Sign Ups variants
    const signupCount = Object.entries(statusCounts)
      .filter(([status]) => status.includes('Home Sign Ups'))
      .reduce((sum, [_, count]) => sum + count, 0);
    console.log(`   All "Home Sign Ups" variants: ${signupCount} records`);

    // Show expected vs actual on page
    console.log(`\n📱 What should appear on page:`);
    console.log(`   Permissions: ${Math.round((permissionPoles.size / uniquePoles.size) * 100)}% (Scope: ${uniquePoles.size}, Completed: ${permissionPoles.size})`);
    console.log(`   Sign Ups: ${Math.round((signupProperties.size / uniqueProperties.size) * 100)}% (Scope: ${uniqueProperties.size}, Completed: ${signupProperties.size})`);
    console.log(`   Connected: ${Math.round((connectedProperties.size / uniqueProperties.size) * 100)}% (Scope: ${uniqueProperties.size}, Completed: ${connectedProperties.size})`);
    console.log(`   Drops: ${Math.round(((installationInProgressProperties.size + connectedProperties.size) / uniqueProperties.size) * 100)}% (Scope: ${uniqueProperties.size}, Completed: ${installationInProgressProperties.size + connectedProperties.size})`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verifyCalculations();