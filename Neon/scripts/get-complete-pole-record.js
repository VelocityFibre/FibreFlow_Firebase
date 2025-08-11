#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function getCompletePoleRecord() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Find a pole with "Home Installation: Installed" status for more complete data
    console.log('📍 SEARCHING FOR POLES WITH COMPLETE DATA...\n');
    
    const completeQuery = `
      SELECT pole_number, status, agent_name, 
             CASE 
               WHEN pole_planted_date IS NOT NULL THEN 'YES'
               ELSE 'NO'
             END as has_planted_date
      FROM status_changes 
      WHERE status = 'Home Installation: Installed'
        AND pole_number LIKE 'LAW.P.%'
        AND agent_name IS NOT NULL
      LIMIT 5
    `;
    
    const completeResult = await client.query(completeQuery);
    
    console.log('POLES WITH "HOME INSTALLATION: INSTALLED" STATUS:');
    console.log('═══════════════════════════════════════════════════════════');
    completeResult.rows.forEach(row => {
      console.log(`Pole: ${row.pole_number}, Agent: ${row.agent_name}, Has Planted Date: ${row.has_planted_date}`);
    });
    
    // Now let's check what the pole_planted_date field contains
    console.log('\n\n📊 POLE PLANTED DATE ANALYSIS:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const plantedDateQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(pole_planted_date) as has_planted_date,
        COUNT(DISTINCT pole_number) as unique_poles_with_planted_date
      FROM status_changes
      WHERE pole_number LIKE 'LAW.P.%'
    `;
    
    const plantedDateResult = await client.query(plantedDateQuery);
    const stats = plantedDateResult.rows[0];
    
    console.log(`Total Lawley records: ${stats.total_records}`);
    console.log(`Records with pole_planted_date: ${stats.has_planted_date}`);
    console.log(`Unique poles with planted date: ${stats.unique_poles_with_planted_date}`);
    
    // Get a sample of records with pole_planted_date
    console.log('\n\n📅 SAMPLE RECORDS WITH POLE PLANTED DATES:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const sampleWithDatesQuery = `
      SELECT pole_number, status, pole_planted_date, permission_date, created_at
      FROM status_changes
      WHERE pole_planted_date IS NOT NULL
        AND pole_number LIKE 'LAW.P.%'
      ORDER BY pole_planted_date DESC
      LIMIT 5
    `;
    
    const sampleWithDates = await client.query(sampleWithDatesQuery);
    
    if (sampleWithDates.rows.length === 0) {
      console.log('No records found with pole_planted_date populated.');
    } else {
      sampleWithDates.rows.forEach((row, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  Pole: ${row.pole_number}`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Pole Planted Date: ${row.pole_planted_date}`);
        console.log(`  Permission Date: ${row.permission_date}`);
        console.log(`  Created At: ${row.created_at}`);
      });
    }
    
    // Let's understand what each date field represents
    console.log('\n\n📊 DATE FIELDS POPULATION ANALYSIS:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const dateFieldsQuery = `
      SELECT 
        'permission_date' as field_name,
        COUNT(permission_date) as populated_count,
        COUNT(DISTINCT pole_number) as unique_poles
      FROM status_changes WHERE pole_number LIKE 'LAW.P.%'
      UNION ALL
      SELECT 
        'pole_planted_date' as field_name,
        COUNT(pole_planted_date) as populated_count,
        COUNT(DISTINCT pole_number) as unique_poles
      FROM status_changes WHERE pole_number LIKE 'LAW.P.%'
      UNION ALL
      SELECT 
        'stringing_date' as field_name,
        COUNT(stringing_date) as populated_count,
        COUNT(DISTINCT pole_number) as unique_poles
      FROM status_changes WHERE pole_number LIKE 'LAW.P.%'
      UNION ALL
      SELECT 
        'signup_date' as field_name,
        COUNT(signup_date) as populated_count,
        COUNT(DISTINCT pole_number) as unique_poles
      FROM status_changes WHERE pole_number LIKE 'LAW.P.%'
      UNION ALL
      SELECT 
        'drop_date' as field_name,
        COUNT(drop_date) as populated_count,
        COUNT(DISTINCT pole_number) as unique_poles
      FROM status_changes WHERE pole_number LIKE 'LAW.P.%'
      UNION ALL
      SELECT 
        'connected_date' as field_name,
        COUNT(connected_date) as populated_count,
        COUNT(DISTINCT pole_number) as unique_poles
      FROM status_changes WHERE pole_number LIKE 'LAW.P.%'
      ORDER BY populated_count DESC
    `;
    
    const dateFieldsResult = await client.query(dateFieldsQuery);
    
    console.log('Field Name          | Records with Data | Unique Poles');
    console.log('────────────────────┼──────────────────┼──────────────');
    dateFieldsResult.rows.forEach(row => {
      console.log(`${row.field_name.padEnd(19)} | ${row.populated_count.toString().padEnd(16)} | ${row.unique_poles}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

getCompletePoleRecord().catch(console.error);