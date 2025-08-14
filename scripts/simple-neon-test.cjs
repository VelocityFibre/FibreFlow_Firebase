#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function simpleTest() {
  console.log('🧪 Simple Neon test with real data...\n');
  
  try {
    const sql = neon(connectionString);
    
    // 1. Test connection
    const timeResult = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connected:', timeResult[0].current_time);
    
    // 2. Count status_changes records
    const statusCount = await sql`SELECT COUNT(*) as count FROM status_changes`;
    console.log(`📊 Status changes: ${statusCount[0].count.toLocaleString()} records`);
    
    // 3. Status distribution
    const statusDist = await sql`
      SELECT status, COUNT(*) as count
      FROM status_changes
      WHERE status IS NOT NULL AND status != ''
      GROUP BY status
      ORDER BY count DESC
      LIMIT 5
    `;
    
    console.log('\n🎯 Top statuses:');
    statusDist.forEach(s => {
      console.log(`   ${s.status}: ${s.count.toLocaleString()}`);
    });
    
    // 4. Build milestone simulation
    const milestones = await sql`
      SELECT 
        COUNT(DISTINCT property_id) as total_properties,
        COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN property_id END) as permissions_approved,
        COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups%Approved%' THEN property_id END) as signups_approved,
        COUNT(DISTINCT CASE WHEN status LIKE '%Installed%' THEN property_id END) as completed_installs
      FROM status_changes
      WHERE status IS NOT NULL
    `;
    
    const stats = milestones[0];
    const permissionsPct = Math.round(stats.permissions_approved * 100 / stats.total_properties * 10) / 10;
    const signupsPct = Math.round(stats.signups_approved * 100 / stats.total_properties * 10) / 10;
    
    console.log('\n💡 Build milestones:');
    console.log(`   Permissions: ${stats.permissions_approved.toLocaleString()}/${stats.total_properties.toLocaleString()} (${permissionsPct}%)`);
    console.log(`   Sign Ups: ${stats.signups_approved.toLocaleString()}/${stats.total_properties.toLocaleString()} (${signupsPct}%)`);
    console.log(`   Installations: ${stats.completed_installs.toLocaleString()}`);
    
    console.log('\n✅ Neon data is ready for Argon!');
    
    return {
      totalProperties: parseInt(stats.total_properties),
      permissionsApproved: parseInt(stats.permissions_approved),
      signupsApproved: parseInt(stats.signups_approved),
      completedInstalls: parseInt(stats.completed_installs),
      permissionsPct,
      signupsPct
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  simpleTest().catch(console.error);
}

module.exports = { simpleTest };