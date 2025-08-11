#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function queryLawleyPoles() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Query 1: Get unique poles for Lawley
    const poleQuery = `
      SELECT 
        COUNT(DISTINCT pole_number) as unique_poles,
        COUNT(*) as total_records
      FROM status_changes 
      WHERE 
        pole_number LIKE 'LAW%' OR 
        pole_number LIKE 'Law%' OR 
        pole_number LIKE 'law%'
    `;
    
    const poleResult = await client.query(poleQuery);
    console.log('📊 Lawley Pole Statistics:');
    console.log(`   Unique Poles: ${poleResult.rows[0].unique_poles}`);
    console.log(`   Total Records: ${poleResult.rows[0].total_records}\n`);
    
    // Query 2: Get status breakdown for Lawley poles
    const statusQuery = `
      SELECT 
        status,
        COUNT(DISTINCT pole_number) as unique_poles,
        COUNT(*) as record_count
      FROM status_changes 
      WHERE 
        pole_number LIKE 'LAW%' OR 
        pole_number LIKE 'Law%' OR 
        pole_number LIKE 'law%'
      GROUP BY status
      ORDER BY record_count DESC
      LIMIT 10
    `;
    
    const statusResult = await client.query(statusQuery);
    console.log('📈 Status Breakdown for Lawley Poles:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.unique_poles} poles (${row.record_count} records)`);
    });
    
    // Query 3: Sample of Lawley pole numbers
    const sampleQuery = `
      SELECT DISTINCT pole_number
      FROM status_changes 
      WHERE 
        pole_number LIKE 'LAW%' OR 
        pole_number LIKE 'Law%' OR 
        pole_number LIKE 'law%'
      ORDER BY pole_number
      LIMIT 10
    `;
    
    const sampleResult = await client.query(sampleQuery);
    console.log('\n📋 Sample Lawley Pole Numbers:');
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.pole_number}`);
    });
    
    // Query 4: Check for poles that might indicate "planted" status
    const plantedQuery = `
      SELECT 
        COUNT(DISTINCT pole_number) as planted_poles
      FROM status_changes 
      WHERE 
        (pole_number LIKE 'LAW%' OR pole_number LIKE 'Law%' OR pole_number LIKE 'law%')
        AND (
          status LIKE '%Approved%' OR 
          status LIKE '%Installed%' OR 
          status LIKE '%Complete%' OR
          status LIKE '%Permission: Approved%'
        )
    `;
    
    const plantedResult = await client.query(plantedQuery);
    console.log('\n🌱 Poles with "Planted" Status Indicators:');
    console.log(`   Poles with Approved/Installed status: ${plantedResult.rows[0].planted_poles}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

queryLawleyPoles().catch(console.error);