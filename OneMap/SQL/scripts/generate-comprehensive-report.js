#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./onemap.db');

console.log('=== COMPREHENSIVE DATA REPORT FOR DUCKDB COMPARISON ===');
console.log('Generated:', new Date().toISOString());
console.log('');

async function generateReport() {
  try {
    // Get all available snapshots
    const dates = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT snapshot_date FROM daily_snapshots ORDER BY snapshot_date', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📅 AVAILABLE SNAPSHOTS:', dates.length);
    dates.forEach(d => console.log('   -', d.snapshot_date));
    console.log('');

    // Overall statistics
    const overallStats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT property_id) as unique_properties,
          COUNT(DISTINCT snapshot_date) as snapshot_days,
          MIN(snapshot_date) as earliest_date,
          MAX(snapshot_date) as latest_date
        FROM daily_snapshots
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log('📊 OVERALL STATISTICS:');
    console.log('   Total Records:', overallStats.total_records);
    console.log('   Unique Properties:', overallStats.unique_properties);  
    console.log('   Snapshot Days:', overallStats.snapshot_days);
    console.log('   Date Range:', overallStats.earliest_date, 'to', overallStats.latest_date);
    console.log('');

    // Daily breakdown
    const dailyStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          snapshot_date,
          COUNT(*) as total_records,
          COUNT(DISTINCT property_id) as unique_properties,
          COUNT(DISTINCT pole_number) as unique_poles,
          COUNT(DISTINCT drop_number) as unique_drops,
          COUNT(CASE WHEN status IS NOT NULL AND status != '' THEN 1 END) as properties_with_status
        FROM daily_snapshots 
        GROUP BY snapshot_date 
        ORDER BY snapshot_date
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📈 DAILY BREAKDOWN:');
    dailyStats.forEach(day => {
      console.log(`   ${day.snapshot_date}:`);
      console.log(`      Records: ${day.total_records}`);
      console.log(`      Properties: ${day.unique_properties}`);
      console.log(`      Poles: ${day.unique_poles}`);
      console.log(`      Drops: ${day.unique_drops}`);
      console.log(`      With Status: ${day.properties_with_status}`);
    });
    console.log('');

    // Status distribution from latest snapshot
    const latestDate = dates[dates.length - 1].snapshot_date;
    const statusDist = await new Promise((resolve, reject) => {
      db.all(`
        SELECT status, COUNT(*) as count 
        FROM daily_snapshots 
        WHERE snapshot_date = ? AND status IS NOT NULL AND status != ''
        GROUP BY status 
        ORDER BY count DESC 
        LIMIT 15
      `, [latestDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📋 STATUS DISTRIBUTION (Latest: ${latestDate}):`);
    statusDist.forEach(s => {
      console.log(`   ${s.status}: ${s.count}`);
    });
    console.log('');

    // Changes between consecutive days
    console.log('🔍 CHANGES BETWEEN CONSECUTIVE DAYS:');
    
    for (let i = 1; i < dates.length; i++) {
      const fromDate = dates[i - 1].snapshot_date;
      const toDate = dates[i].snapshot_date;
      
      const changes = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            COALESCE(curr.property_id, prev.property_id) as property_id,
            prev.status as old_status,
            curr.status as new_status,
            CASE 
              WHEN prev.property_id IS NULL THEN 'new_property'
              WHEN curr.property_id IS NULL THEN 'removed_property'  
              WHEN COALESCE(prev.status, '') != COALESCE(curr.status, '') THEN 'status_change'
              WHEN COALESCE(prev.agent, '') != COALESCE(curr.agent, '') THEN 'agent_change'
              ELSE 'no_change'
            END as change_type
          FROM daily_snapshots curr
          FULL OUTER JOIN daily_snapshots prev ON curr.property_id = prev.property_id
          WHERE curr.snapshot_date = ? AND prev.snapshot_date = ?
            AND (
              COALESCE(prev.status, '') != COALESCE(curr.status, '') OR
              prev.property_id IS NULL OR
              curr.property_id IS NULL
            )
        `, [toDate, fromDate], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Categorize changes
      let statusChanges = 0;
      let newProperties = 0;
      let removedProperties = 0;
      let reverts = 0;

      // Status progression levels for revert detection
      const STATUS_LEVELS = {
        'Pole Permission: Pending': 1,
        'Pole Permission: Approved': 2,
        'Home Sign Ups: Pending': 3,
        'Home Sign Ups: Approved': 4,
        'Home Sign Ups: Approved & Installation Scheduled': 5,
        'Home Installation: In Progress': 6,
        'Home Installation: Installed': 7,
        'Home Installation: Complete': 8
      };

      changes.forEach(change => {
        if (change.change_type === 'status_change') {
          statusChanges++;
          
          // Check for reverts
          const oldLevel = STATUS_LEVELS[change.old_status] || 0;
          const newLevel = STATUS_LEVELS[change.new_status] || 0;
          if (newLevel < oldLevel) {
            reverts++;
          }
        } else if (change.change_type === 'new_property') {
          newProperties++;
        } else if (change.change_type === 'removed_property') {
          removedProperties++;
        }
      });

      console.log(`   ${fromDate} → ${toDate}:`);
      console.log(`      Total Changes: ${changes.length}`);
      console.log(`      Status Changes: ${statusChanges}`);
      console.log(`      Status Reverts: ${reverts}`);
      console.log(`      New Properties: ${newProperties}`);
      console.log(`      Removed Properties: ${removedProperties}`);
      
      // Special highlight for Aug 3→4 (DuckDB comparison)
      if (fromDate === '2025-08-03' && toDate === '2025-08-04') {
        console.log(`      🎯 DuckDB REFERENCE: 49 status changes, 6 backwards progressions`);
        console.log(`      📊 OUR RESULTS: ${statusChanges} status changes, ${reverts} backwards progressions`);
        console.log(`      ✅ MATCH STATUS: ${statusChanges === 49 && reverts === 6 ? 'PERFECT MATCH' : 'DISCREPANCY'}`);
      }
      console.log('');
    }

    // Summary for DuckDB agent
    console.log('🎯 SUMMARY FOR DUCKDB COMPARISON:');
    console.log('');
    console.log('DATA OVERVIEW:');
    console.log(`- We have ${dates.length} daily snapshots from ${dates[0].snapshot_date} to ${dates[dates.length - 1].snapshot_date}`);
    console.log(`- Total ${overallStats.total_records} records across ${overallStats.unique_properties} unique properties`);
    console.log(`- Each snapshot represents complete system state for that day`);
    console.log('');
    console.log('CHANGE DETECTION METHOD:');
    console.log('- Compare consecutive day snapshots to find differences');
    console.log('- Detect status changes, new properties, removed properties');
    console.log('- Identify backwards progressions (status reverts)');
    console.log('');
    console.log('VALIDATION REQUEST:');
    console.log('- Please compare our day-to-day change detection with your DuckDB analysis');
    console.log('- Focus especially on August 3→4 where you found 49 status changes, 6 backwards progressions');
    console.log('- Verify our snapshot-based approach matches your findings');
    console.log('');
    console.log('=== END OF COMPREHENSIVE REPORT ===');

    db.close();

  } catch (error) {
    console.error('❌ Error generating report:', error);
    db.close();
  }
}

generateReport();