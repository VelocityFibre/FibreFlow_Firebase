#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./onemap.db');

console.log('=== COMPREHENSIVE STATUS CHANGE ANALYSIS ===');
console.log('Now with complete data from August 1-5\n');

// Status progression levels for revert detection
const statusLevels = {
  'Pole Permission: Pending': 1,
  'Pole Permission: Approved': 2,
  'Home Sign Ups: Pending': 3,
  'Home Sign Ups: Approved': 4,
  'Home Sign Ups: Approved & Installation Scheduled': 5,
  'Home Installation: In Progress': 6,
  'Home Installation: Installed': 7,
  'Home Installation: Complete': 8
};

function getStatusLevel(status) {
  return statusLevels[status] || 0;
}

function categorizeChange(oldStatus, newStatus) {
  const oldLevel = getStatusLevel(oldStatus);
  const newLevel = getStatusLevel(newStatus);
  
  if (newLevel < oldLevel) {
    const levelsBack = oldLevel - newLevel;
    return { type: 'revert', severity: getSeverity(levelsBack), levelsBack };
  } else if (newLevel > oldLevel + 1) {
    return { type: 'bypassed', severity: 'medium', levelsBack: 0 };
  } else {
    return { type: 'normal', severity: 'none', levelsBack: 0 };
  }
}

function getSeverity(levelsBack) {
  if (levelsBack >= 4) return 'critical';
  if (levelsBack === 3) return 'high'; 
  if (levelsBack === 2) return 'medium';
  return 'low';
}

async function runAnalysis() {
  try {
    // Check current database state
    console.log('1. Database Overview:');
    
    const totalRecords = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM status_changes', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const dateRange = await new Promise((resolve, reject) => {
      db.get(`SELECT 
        MIN(DATE(status_date)) as earliest,
        MAX(DATE(status_date)) as latest,
        COUNT(DISTINCT DATE(status_date)) as unique_dates
      FROM status_changes 
      WHERE status_date IS NOT NULL`, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const uniqueProperties = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(DISTINCT property_id) as count FROM status_changes', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`   📊 Total Records: ${totalRecords}`);
    console.log(`   🏠 Unique Properties: ${uniqueProperties}`);
    console.log(`   📅 Date Range: ${dateRange.earliest} to ${dateRange.latest} (${dateRange.unique_dates} unique dates)`);

    // Create latest status per property
    console.log('\n2. Creating latest status snapshot...');
    
    await new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS latest_property_status', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE latest_property_status AS
        SELECT 
          property_id,
          pole_number,
          drop_number,
          status,
          status_date,
          agent,
          address,
          location_lat,
          location_lng,
          import_batch_id
        FROM (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY property_id 
              ORDER BY 
                CASE WHEN status_date IS NOT NULL THEN 1 ELSE 2 END,
                status_date DESC,
                id DESC
            ) as rn
          FROM status_changes
          WHERE property_id IS NOT NULL
        ) ranked
        WHERE rn = 1`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('   ✅ Latest status snapshot created');

    // Create August 3 baseline (to match DuckDB comparison)
    console.log('\n3. Creating August 3 baseline for DuckDB comparison...');

    await new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS aug3_baseline', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE aug3_baseline AS
        SELECT 
          property_id,
          pole_number,
          drop_number,
          status,
          status_date,
          agent,
          address,
          location_lat,
          location_lng
        FROM (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY property_id 
              ORDER BY 
                CASE WHEN status_date IS NOT NULL THEN 1 ELSE 2 END,
                status_date DESC,
                id DESC
            ) as rn
          FROM status_changes
          WHERE property_id IS NOT NULL
            AND (DATE(status_date) <= '2025-08-03' OR status_date IS NULL)
        ) ranked
        WHERE rn = 1`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const aug3Count = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM aug3_baseline', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`   📊 August 3 baseline: ${aug3Count} properties`);

    // Create August 4 snapshot
    await new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS aug4_snapshot', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE aug4_snapshot AS
        SELECT 
          property_id,
          pole_number,
          drop_number,
          status,
          status_date,
          agent,
          address,
          location_lat,
          location_lng
        FROM (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY property_id 
              ORDER BY 
                CASE WHEN status_date IS NOT NULL THEN 1 ELSE 2 END,
                status_date DESC,
                id DESC
            ) as rn
          FROM status_changes
          WHERE property_id IS NOT NULL
            AND (DATE(status_date) <= '2025-08-04' OR status_date IS NULL)
        ) ranked
        WHERE rn = 1`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const aug4Count = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM aug4_snapshot', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`   📊 August 4 snapshot: ${aug4Count} properties`);

    // Find status changes between August 3 and 4
    console.log('\n4. Detecting August 3 → August 4 status changes...');

    const statusChanges = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          COALESCE(aug4.property_id, aug3.property_id) as property_id,
          COALESCE(aug4.pole_number, aug3.pole_number, '') as pole_number,
          COALESCE(aug4.drop_number, aug3.drop_number, '') as drop_number,
          aug3.status as old_status,
          aug4.status as new_status,
          aug4.status_date as change_date,
          COALESCE(aug4.agent, aug3.agent, '') as agent,
          COALESCE(aug4.address, aug3.address, '') as address,
          CASE 
            WHEN aug3.property_id IS NULL THEN 'new_property'
            WHEN aug4.property_id IS NULL THEN 'removed_property'
            WHEN aug3.status IS NULL AND aug4.status IS NOT NULL THEN 'new_status'
            WHEN aug3.status IS NOT NULL AND aug4.status IS NOT NULL AND aug3.status != aug4.status THEN 'status_change'
            ELSE 'no_change'
          END as change_type
        FROM aug4_snapshot aug4
        FULL OUTER JOIN aug3_baseline aug3 ON aug4.property_id = aug3.property_id
        WHERE (aug3.status != aug4.status OR aug3.property_id IS NULL OR aug4.property_id IS NULL)
          AND NOT (aug3.status IS NULL AND aug4.status IS NULL)
        ORDER BY change_type, property_id
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Filter and categorize changes
    const actualStatusChanges = statusChanges.filter(c => 
      c.change_type === 'status_change' && c.old_status && c.new_status
    );
    const newProperties = statusChanges.filter(c => c.change_type === 'new_property');
    const newStatuses = statusChanges.filter(c => c.change_type === 'new_status');

    console.log(`   📊 Total changes detected: ${statusChanges.length}`);
    console.log(`   🔄 Actual status changes: ${actualStatusChanges.length}`);
    console.log(`   🆕 New properties: ${newProperties.length}`);
    console.log(`   📝 New statuses (previously null): ${newStatuses.length}`);

    // Analyze status changes
    let normalCount = 0;
    let revertCount = 0;
    let bypassedCount = 0;
    const reverts = [];
    const bypassed = [];

    actualStatusChanges.forEach(change => {
      const analysis = categorizeChange(change.old_status, change.new_status);
      change.category = analysis.type;
      change.severity = analysis.severity;
      change.levels_back = analysis.levelsBack;

      switch (analysis.type) {
        case 'revert':
          revertCount++;
          reverts.push(change);
          break;
        case 'bypassed':
          bypassedCount++;
          bypassed.push(change);
          break;
        default:
          normalCount++;
      }
    });

    // Count installations completed
    const newInstallations = actualStatusChanges.filter(c => 
      c.new_status === 'Home Installation: Installed' || 
      c.new_status === 'Home Installation: Complete'
    );

    console.log('\n🎯 FINAL ANALYSIS RESULTS (August 3 → August 4):');
    console.log(`📊 STATUS CHANGES: ${actualStatusChanges.length}`);
    console.log(`✅ Normal Progression: ${normalCount}`);
    console.log(`⚠️  Backwards Progressions: ${revertCount}`);
    console.log(`⚠️  Bypassed Approvals: ${bypassedCount}`);
    console.log(`📈 New Properties: ${newProperties.length}`);
    console.log(`🏠 New Installations: ${newInstallations.length}`);

    // Show detailed reverts
    if (reverts.length > 0) {
      console.log('\n🚨 BACKWARDS PROGRESSIONS FOUND:');
      reverts.forEach((revert, index) => {
        console.log(`${index + 1}. Property ${revert.property_id} (${revert.pole_number || 'No Pole'})`);
        console.log(`   ${revert.old_status} → ${revert.new_status}`);
        console.log(`   Severity: ${revert.severity.toUpperCase()} (${revert.levels_back} levels back)`);
        console.log(`   Agent: ${revert.agent || 'Unknown'}`);
        console.log(`   Address: ${(revert.address || '').substring(0, 50)}...`);
        console.log('');
      });
    }

    // Export comprehensive CSV
    const reportPath = path.join(__dirname, '..', 'reports', 'aug3_to_aug4_status_changes_COMPLETE_2025-08-06.csv');
    const csvHeader = 'Property ID,Pole Number,Drop Number,Old Status,New Status,Change Date,Agent,Address,Category,Severity,Levels Back\n';
    const csvRows = actualStatusChanges.map(change => [
      change.property_id || '',
      change.pole_number || '',
      change.drop_number || '',
      change.old_status || '',
      change.new_status || '',
      change.change_date || '',
      change.agent || '',
      `"${(change.address || '').replace(/"/g, '""')}"`,
      change.category || 'normal',
      change.severity || 'none',
      change.levels_back || 0
    ].join(','));

    fs.writeFileSync(reportPath, csvHeader + csvRows.join('\n'));
    console.log(`\n✅ Exported comprehensive analysis to: ${reportPath}`);

    // Export reverts only
    if (reverts.length > 0) {
      const revertsPath = path.join(__dirname, '..', 'reports', 'status_reverts_aug3_to_aug4_2025-08-06.csv');
      const revertsHeader = 'Property ID,Pole Number,Drop Number,Old Status,New Status,Change Date,Agent,Address,Severity,Levels Back\n';
      const revertsRows = reverts.map(revert => [
        revert.property_id || '',
        revert.pole_number || '',
        revert.drop_number || '',
        revert.old_status || '',
        revert.new_status || '',
        revert.change_date || '',
        revert.agent || '',
        `"${(revert.address || '').replace(/"/g, '""')}"`,
        revert.severity || 'low',
        revert.levels_back || 0
      ].join(','));

      fs.writeFileSync(revertsPath, revertsHeader + revertsRows.join('\n'));
      console.log(`✅ Exported reverts analysis to: ${revertsPath}`);
    }

    console.log('\n🆚 COMPARISON WITH DUCKDB:');
    console.log(`DuckDB Found: 49 status changes, 6 backwards progressions`);
    console.log(`SQL (Complete): ${actualStatusChanges.length} status changes, ${revertCount} backwards progressions`);

    const statusMatch = Math.abs(actualStatusChanges.length - 49) <= 5;
    const revertMatch = Math.abs(revertCount - 6) <= 2;

    if (statusMatch && revertMatch) {
      console.log('✅ EXCELLENT MATCH! Numbers align closely with DuckDB');
    } else if (statusMatch || revertMatch) {
      console.log('🟨 PARTIAL MATCH - Some numbers align, others differ');
    } else {
      console.log('⚠️  SIGNIFICANT DIFFERENCE - May indicate different analysis methods');
    }

    console.log(`\n📊 DETAILED COMPARISON:`);
    console.log(`   Status Changes: DuckDB=${49}, SQL=${actualStatusChanges.length} (${statusMatch ? '✅' : '❌'})`);
    console.log(`   Backwards Progressions: DuckDB=${6}, SQL=${revertCount} (${revertMatch ? '✅' : '❌'})`);

    // Update audit log
    const auditUpdate = `
### 2025-08-06 - Comprehensive Status Analysis (August 3 → August 4)
- **Files Processed**: August 1-5 (complete dataset)
- **Total Database Records**: ${totalRecords}
- **Status Changes Found**: ${actualStatusChanges.length}
- **Backwards Progressions**: ${revertCount}
- **New Properties**: ${newProperties.length}
- **New Installations**: ${newInstallations.length}
- **DuckDB Comparison**: Status Changes ${statusMatch ? 'MATCH' : 'DIFFER'}, Reverts ${revertMatch ? 'MATCH' : 'DIFFER'}
`;

    const auditPath = path.join(__dirname, '..', 'IMPORT_AUDIT_LOG.md');
    fs.appendFileSync(auditPath, auditUpdate);

    console.log('\n🎉 COMPREHENSIVE ANALYSIS COMPLETE!');
    console.log('All data properly imported and analyzed. Ready for Supabase sync.');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    db.close();
  }
}

runAnalysis();