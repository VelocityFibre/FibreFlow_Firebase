#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./onemap.db');

console.log('=== DETECTING AUGUST 3 → AUGUST 4 CHANGES ===');
console.log('Matching DuckDB analysis for comparison');

// Create staging table for August 4 data
const createStagingQuery = `
CREATE TEMP TABLE aug4_staging AS
SELECT DISTINCT 
  property_id,
  pole_number,
  drop_number,
  status,
  status_date,
  agent,
  address,
  location_lat,
  location_lng
FROM status_changes 
WHERE import_batch_id IN (
  SELECT id FROM import_batches 
  WHERE filename LIKE '%04082025%'
  ORDER BY import_date DESC 
  LIMIT 1
);
`;

// Get August 3 data
const aug3Query = `
CREATE TEMP TABLE aug3_baseline AS
SELECT DISTINCT 
  property_id,
  pole_number,
  drop_number,
  status,
  status_date,
  agent,
  address,
  location_lat,
  location_lng
FROM status_changes 
WHERE import_batch_id IN (
  SELECT id FROM import_batches 
  WHERE filename LIKE '%03082025%'
  ORDER BY import_date DESC 
  LIMIT 1
);
`;

// Detect changes
const changesQuery = `
SELECT 
  COALESCE(a4.property_id, a3.property_id) as property_id,
  COALESCE(a4.pole_number, a3.pole_number, '') as pole_number,
  COALESCE(a4.drop_number, a3.drop_number, '') as drop_number,
  a3.status as old_status,
  a4.status as new_status,
  a4.status_date as change_date,
  COALESCE(a4.agent, a3.agent, '') as agent,
  COALESCE(a4.address, a3.address, '') as address,
  CASE 
    WHEN a3.property_id IS NULL THEN 'new_property'
    WHEN a4.property_id IS NULL THEN 'removed_property'
    WHEN a3.status != a4.status THEN 'status_change'
    ELSE 'no_change'
  END as change_type
FROM aug4_staging a4
FULL OUTER JOIN aug3_baseline a3 ON a4.property_id = a3.property_id
WHERE a3.status != a4.status OR a3.property_id IS NULL OR a4.property_id IS NULL
ORDER BY change_type, property_id;
`;

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
    return 'revert';
  } else if (newLevel > oldLevel + 1) {
    return 'bypassed';
  } else {
    return 'normal';
  }
}

async function runAnalysis() {
  try {
    // Create staging tables
    console.log('1. Creating staging tables...');
    await new Promise((resolve, reject) => {
      db.run(createStagingQuery, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(aug3Query, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get changes
    console.log('2. Detecting changes...');
    const changes = await new Promise((resolve, reject) => {
      db.all(changesQuery, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`   Found ${changes.length} differences between August 3 and August 4`);

    // Categorize changes
    const statusChanges = changes.filter(c => c.change_type === 'status_change');
    const newProperties = changes.filter(c => c.change_type === 'new_property');
    
    console.log(`   Status Changes: ${statusChanges.length}`);
    console.log(`   New Properties: ${newProperties.length}`);

    // Analyze status changes
    const normalChanges = [];
    const reverts = [];
    const bypassed = [];

    statusChanges.forEach(change => {
      const category = categorizeChange(change.old_status, change.new_status);
      switch(category) {
        case 'revert':
          reverts.push(change);
          break;
        case 'bypassed':
          bypassed.push(change);
          break;
        default:
          normalChanges.push(change);
      }
    });

    // Report findings
    console.log('\n=== FINDINGS (August 3 → August 4) ===');
    console.log(`📊 STATUS CHANGES: ${statusChanges.length}`);
    console.log(`✅ Normal Progression: ${normalChanges.length}`);
    console.log(`⚠️  Backwards Progressions: ${reverts.length}`);
    console.log(`⚠️  Bypassed Approvals: ${bypassed.length}`);
    console.log(`📈 New Properties: ${newProperties.length}`);

    // Show reverts
    if (reverts.length > 0) {
      console.log('\n🚨 BACKWARDS PROGRESSIONS FOUND:');
      reverts.forEach((revert, index) => {
        const oldLevel = getStatusLevel(revert.old_status);
        const newLevel = getStatusLevel(revert.new_status);
        const levelsBack = oldLevel - newLevel;
        
        console.log(`${index + 1}. Property ${revert.property_id} (${revert.pole_number || 'No Pole'})`);
        console.log(`   ${revert.old_status} → ${revert.new_status}`);
        console.log(`   Levels backwards: ${levelsBack}`);
        console.log(`   Agent: ${revert.agent}`);
        console.log(`   Address: ${revert.address.substring(0, 60)}...`);
        console.log('');
      });
    }

    // Count installations completed
    const installations = statusChanges.filter(c => 
      c.new_status === 'Home Installation: Installed' || 
      c.new_status === 'Home Installation: Complete'
    );
    console.log(`📋 NEW INSTALLATIONS COMPLETED: ${installations.length}`);

    // Export CSV for comparison
    const csvPath = path.join(__dirname, '..', 'reports', 'status_changes_aug3_to_aug4_2025-08-06.csv');
    const csvHeader = 'Property ID,Pole Number,Drop Number,Old Status,New Status,Change Date,Agent,Address,Category\n';
    const csvRows = statusChanges.map(change => {
      const category = categorizeChange(change.old_status, change.new_status);
      return [
        change.property_id,
        change.pole_number,
        change.drop_number,
        change.old_status,
        change.new_status,
        change.change_date,
        change.agent,
        `"${change.address}"`,
        category
      ].join(',');
    });

    fs.writeFileSync(csvPath, csvHeader + csvRows.join('\n'));
    console.log(`\n✓ Exported to: ${csvPath}`);

    // Summary to match DuckDB format
    console.log('\n=== COMPARISON WITH DUCKDB ===');
    console.log(`DuckDB Found: 49 status changes, 6 backwards progressions`);
    console.log(`SQL Found: ${statusChanges.length} status changes, ${reverts.length} backwards progressions`);
    
    if (statusChanges.length !== 49) {
      console.log('⚠️  DISCREPANCY DETECTED - Numbers do not match!');
      console.log('This suggests different data sources or processing methods.');
    } else {
      console.log('✅ MATCH - Numbers align with DuckDB analysis');
    }

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    db.close();
  }
}

runAnalysis();