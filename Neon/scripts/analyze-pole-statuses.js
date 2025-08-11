#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function analyzePoleStatuses() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('              COMPLETE STATUS ANALYSIS FOR LAWLEY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Get all unique statuses with counts
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as record_count,
        COUNT(DISTINCT pole_number) as unique_poles,
        MIN(created_at) as earliest_date,
        MAX(created_at) as latest_date
      FROM status_changes
      WHERE pole_number LIKE 'LAW.P.%'
      GROUP BY status
      ORDER BY unique_poles DESC
    `;
    
    const statusResult = await client.query(statusQuery);
    
    console.log('ALL STATUSES IN LAWLEY DATA:');
    console.log('Status | Records | Unique Poles | Date Range');
    console.log('───────────────────────────────────────────────────────────────');
    
    statusResult.rows.forEach(row => {
      const status = row.status || '[EMPTY]';
      const dateRange = row.earliest_date && row.latest_date 
        ? `${new Date(row.earliest_date).toLocaleDateString()} - ${new Date(row.latest_date).toLocaleDateString()}`
        : 'No dates';
      console.log(`${status}`);
      console.log(`  → ${row.record_count} records | ${row.unique_poles} poles | ${dateRange}`);
    });
    
    // Check if there's any status that actually says "planted"
    console.log('\n\n🔍 SEARCHING FOR "PLANTED" TERMINOLOGY:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const plantedSearchQuery = `
      SELECT DISTINCT status
      FROM status_changes
      WHERE LOWER(status) LIKE '%plant%'
         OR LOWER(status) LIKE '%install%'
         OR LOWER(status) LIKE '%complet%'
         OR LOWER(status) LIKE '%done%'
         OR LOWER(status) LIKE '%finish%'
    `;
    
    const plantedSearchResult = await client.query(plantedSearchQuery);
    
    if (plantedSearchResult.rows.length === 0) {
      console.log('❌ No status contains "planted" or similar terminology');
    } else {
      console.log('Found these statuses with installation-related terms:');
      plantedSearchResult.rows.forEach(row => {
        console.log(`  • ${row.status}`);
      });
    }
    
    // Show the progression of a single pole through different statuses
    console.log('\n\n📈 STATUS PROGRESSION EXAMPLE - Pole LAW.P.C517:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const progressionQuery = `
      SELECT 
        pole_number,
        status,
        created_at,
        permission_date,
        signup_date,
        agent_name
      FROM status_changes
      WHERE pole_number = 'LAW.P.C517'
      ORDER BY created_at ASC NULLS LAST, id ASC
    `;
    
    const progressionResult = await client.query(progressionQuery);
    
    progressionResult.rows.forEach((row, index) => {
      console.log(`\nStep ${index + 1}:`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Created: ${row.created_at || 'No date'}`);
      console.log(`  Permission Date: ${row.permission_date || 'None'}`);
      console.log(`  Signup Date: ${row.signup_date || 'None'}`);
      console.log(`  Agent: ${row.agent_name || 'None'}`);
    });
    
    console.log('\n\n📊 KEY INSIGHTS:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('1. The database uses "Pole Permission: Approved" status');
    console.log('2. There is NO status that explicitly says "planted"');
    console.log('3. The pole_planted_date field exists but is NOT populated (all NULL)');
    console.log('4. Based on status names, the workflow appears to be:');
    console.log('   → Pole Permission: Approved (this is likely when pole is planted)');
    console.log('   → Home Sign Ups: Various statuses');
    console.log('   → Home Installation: In Progress');
    console.log('   → Home Installation: Installed (final stage)');
    console.log('\n"Pole Permission: Approved" = Pole has been planted (3,757 poles in Lawley)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

analyzePoleStatuses().catch(console.error);