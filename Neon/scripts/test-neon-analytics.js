#!/usr/bin/env node

/**
 * Test analytics queries on actual Neon database structure
 */

const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function testAnalytics() {
  console.log('🧪 Testing Neon analytics with real data...\n');
  
  try {
    const sql = neon(connectionString);
    
    // 1. Basic table info
    console.log('📊 Table summary:');
    const tables = await sql`
      SELECT 
        schemaname,
        tablename,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    for (const table of tables) {
      const count = await sql`SELECT COUNT(*) as count FROM ${table.tablename}`;
      console.log(`   • ${table.tablename}: ${count[0].count.toLocaleString()} rows`);
    }
    
    console.log('\n🎯 Status Analytics:');
    const statusStats = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM status_changes 
      WHERE status IS NOT NULL AND status != ''
      GROUP BY status 
      ORDER BY count DESC
      LIMIT 10
    `;
    
    statusStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count.toLocaleString()} (${stat.percentage}%)`);
    });
    
    console.log('\n📈 Project Progress Analytics:');
    
    // Calculate basic project stats
    const projectStats = await sql`
      SELECT 
        COUNT(DISTINCT property_id) as total_properties,
        COUNT(*) as total_status_changes,
        COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN property_id END) as permissions_approved,
        COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups%Approved%' THEN property_id END) as signups_approved,
        COUNT(DISTINCT CASE WHEN status LIKE '%Installation%' AND status LIKE '%Progress%' THEN property_id END) as in_progress_installs,
        COUNT(DISTINCT CASE WHEN status LIKE '%Installed%' THEN property_id END) as completed_installs
      FROM status_changes
      WHERE status IS NOT NULL
    `;
    
    const stats = projectStats[0];
    console.log(`   Total properties: ${stats.total_properties.toLocaleString()}`);
    console.log(`   Permission approvals: ${stats.permissions_approved.toLocaleString()} (${Math.round(stats.permissions_approved * 100 / stats.total_properties)}%)`);
    console.log(`   Sign-up approvals: ${stats.signups_approved.toLocaleString()} (${Math.round(stats.signups_approved * 100 / stats.total_properties)}%)`);
    console.log(`   In-progress installs: ${stats.in_progress_installs.toLocaleString()}`);
    console.log(`   Completed installs: ${stats.completed_installs.toLocaleString()}`);
    
    console.log('\n📅 Time-based Analytics:');
    
    // Recent activity
    const recentActivity = await sql`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as status_changes,
        COUNT(DISTINCT property_id) as unique_properties
      FROM status_changes 
      WHERE created_at >= NOW() - INTERVAL '8 weeks'
        AND created_at IS NOT NULL
      GROUP BY week 
      ORDER BY week DESC
      LIMIT 8
    `;
    
    recentActivity.forEach(week => {
      const weekStr = new Date(week.week).toLocaleDateString();
      console.log(`   Week of ${weekStr}: ${week.status_changes} changes (${week.unique_properties} properties)`);
    });
    
    console.log('\n💡 Build Milestones (simulated from status data):');
    
    // Simulate build milestones from status data
    const milestones = [
      {
        name: 'Permissions',
        completed: stats.permissions_approved,
        scope: stats.total_properties,
        percentage: Math.round(stats.permissions_approved * 100 / stats.total_properties * 10) / 10
      },
      {
        name: 'Sign Ups',
        completed: stats.signups_approved,
        scope: stats.total_properties,
        percentage: Math.round(stats.signups_approved * 100 / stats.total_properties * 10) / 10
      },
      {
        name: 'Installations',
        completed: stats.completed_installs,
        scope: stats.signups_approved, // Only signed up properties can be installed
        percentage: Math.round(stats.completed_installs * 100 / Math.max(stats.signups_approved, 1) * 10) / 10
      }
    ];
    
    milestones.forEach(m => {
      console.log(`   ${m.name}: ${m.completed.toLocaleString()}/${m.scope.toLocaleString()} (${m.percentage}%)`);
    });
    
    console.log('\n✅ Analytics test complete! Ready for Argon integration.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testAnalytics();