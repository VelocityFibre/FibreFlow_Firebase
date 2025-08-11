#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function analyzeLawleyPlantedPoles() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('          LAWLEY POLE PLANTING ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Query 1: Total unique poles in Lawley
    const totalQuery = `
      SELECT COUNT(DISTINCT pole_number) as total_poles
      FROM status_changes 
      WHERE pole_number LIKE 'LAW.P.%'
    `;
    
    const totalResult = await client.query(totalQuery);
    const totalPoles = totalResult.rows[0].total_poles;
    console.log(`📍 TOTAL UNIQUE POLES IN LAWLEY: ${totalPoles}\n`);
    
    // Query 2: Poles with "Pole Permission: Approved" status
    const approvedQuery = `
      SELECT COUNT(DISTINCT pole_number) as approved_poles
      FROM status_changes 
      WHERE 
        pole_number LIKE 'LAW.P.%'
        AND status = 'Pole Permission: Approved'
    `;
    
    const approvedResult = await client.query(approvedQuery);
    const approvedPoles = approvedResult.rows[0].approved_poles;
    
    console.log('🌱 PLANTED POLES (Based on Status):');
    console.log(`   ✅ Pole Permission: Approved: ${approvedPoles} poles`);
    console.log(`   📊 Percentage of Total: ${(approvedPoles/totalPoles*100).toFixed(1)}%\n`);
    
    // Query 3: Get latest status for each pole
    const latestStatusQuery = `
      WITH latest_status AS (
        SELECT DISTINCT ON (pole_number) 
          pole_number,
          status,
          created_at
        FROM status_changes 
        WHERE pole_number LIKE 'LAW.P.%'
        ORDER BY pole_number, created_at DESC NULLS LAST, id DESC
      )
      SELECT 
        status,
        COUNT(*) as pole_count
      FROM latest_status
      GROUP BY status
      ORDER BY pole_count DESC
    `;
    
    const latestStatusResult = await client.query(latestStatusQuery);
    console.log('📊 CURRENT STATUS DISTRIBUTION (Latest Status per Pole):');
    latestStatusResult.rows.forEach(row => {
      const percentage = (row.pole_count/totalPoles*100).toFixed(1);
      console.log(`   ${row.status}: ${row.pole_count} poles (${percentage}%)`);
    });
    
    // Query 4: Installation progress
    const installationQuery = `
      SELECT 
        CASE 
          WHEN status = 'Pole Permission: Approved' THEN '1. Permission Approved (Planted)'
          WHEN status LIKE 'Home Installation:%' THEN '2. Home Installation Phase'
          WHEN status LIKE 'Home Sign Ups:%' THEN '3. Home Sign-up Phase'
          ELSE '4. Other Status'
        END as phase,
        COUNT(DISTINCT pole_number) as pole_count
      FROM status_changes 
      WHERE pole_number LIKE 'LAW.P.%'
      GROUP BY phase
      ORDER BY phase
    `;
    
    const installationResult = await client.query(installationQuery);
    console.log('\n🏗️ INSTALLATION PROGRESS SUMMARY:');
    installationResult.rows.forEach(row => {
      console.log(`   ${row.phase}: ${row.pole_count} poles`);
    });
    
    // Query 5: Date analysis for planted poles
    const dateQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(DISTINCT pole_number) as poles_approved
      FROM status_changes 
      WHERE 
        pole_number LIKE 'LAW.P.%'
        AND status = 'Pole Permission: Approved'
        AND created_at IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `;
    
    const dateResult = await client.query(dateQuery);
    console.log('\n📅 RECENT POLE PLANTING ACTIVITY:');
    dateResult.rows.forEach(row => {
      const monthStr = row.month ? new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Unknown';
      console.log(`   ${monthStr}: ${row.poles_approved} poles approved`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                          SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🎯 POLES PLANTED IN LAWLEY: ${approvedPoles} out of ${totalPoles} total poles`);
    console.log(`📊 PLANTING RATE: ${(approvedPoles/totalPoles*100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

analyzeLawleyPlantedPoles().catch(console.error);