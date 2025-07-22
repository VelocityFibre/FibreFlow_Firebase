#!/usr/bin/env node

/**
 * Compare split CSV files using proper tracking:
 * - Permission records: Track by Address + GPS
 * - Pole records: Track by Pole Number
 * - Cross-reference when permissions get pole assignments
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

// Helper to create location key from address and GPS
function createLocationKey(record) {
  const address = record['Location Address'] || '';
  const lat = record['Latitude'] || record['Actual Device Location (Latitude)'] || '';
  const lon = record['Longitude'] || record['Actual Device Location (Longitude)'] || '';
  
  // Clean up address - remove extra spaces, standardize
  const cleanAddress = address.trim().replace(/\s+/g, ' ').toUpperCase();
  
  // Round GPS to 6 decimal places (about 0.1m precision)
  const roundedLat = lat ? parseFloat(lat).toFixed(6) : '';
  const roundedLon = lon ? parseFloat(lon).toFixed(6) : '';
  
  return {
    address: cleanAddress,
    gps: roundedLat && roundedLon ? `${roundedLat},${roundedLon}` : '',
    combined: `${cleanAddress}|${roundedLat},${roundedLon}`
  };
}

async function parseCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return csv.parse(content.replace(/^\uFEFF/, ''), {
      columns: true,
      delimiter: ';'
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

async function comparePermissionFiles(prevPath, currPath) {
  console.log('\n📋 Comparing Permission Records (no poles yet)...');
  
  const prevRecords = await parseCSV(prevPath);
  const currRecords = await parseCSV(currPath);
  
  // Create maps by location (address + GPS)
  const prevMap = new Map();
  const currMap = new Map();
  
  prevRecords.forEach(record => {
    const loc = createLocationKey(record);
    prevMap.set(loc.combined, record);
  });
  
  currRecords.forEach(record => {
    const loc = createLocationKey(record);
    currMap.set(loc.combined, record);
  });
  
  // Find changes
  const changes = {
    new: [],
    statusChanged: [],
    disappeared: [],
    unchanged: 0
  };
  
  // Check current records
  currMap.forEach((record, locKey) => {
    if (!prevMap.has(locKey)) {
      changes.new.push({
        location: locKey.split('|')[0],
        gps: locKey.split('|')[1],
        status: record['Status'],
        propertyId: record['Property ID']
      });
    } else {
      const prevRecord = prevMap.get(locKey);
      if (prevRecord['Status'] !== record['Status']) {
        changes.statusChanged.push({
          location: locKey.split('|')[0],
          oldStatus: prevRecord['Status'],
          newStatus: record['Status']
        });
      } else {
        changes.unchanged++;
      }
    }
  });
  
  // Check for disappeared records
  prevMap.forEach((record, locKey) => {
    if (!currMap.has(locKey)) {
      changes.disappeared.push({
        location: locKey.split('|')[0],
        gps: locKey.split('|')[1],
        status: record['Status'],
        note: 'Likely got pole assignment'
      });
    }
  });
  
  return {
    prevCount: prevMap.size,
    currCount: currMap.size,
    changes
  };
}

async function comparePoleFiles(prevPath, currPath) {
  console.log('\n🏗️ Comparing Pole Records...');
  
  const prevRecords = await parseCSV(prevPath);
  const currRecords = await parseCSV(currPath);
  
  // Create maps by pole number
  const prevMap = new Map();
  const currMap = new Map();
  
  prevRecords.forEach(record => {
    const poleNum = record['Pole Number'];
    if (poleNum && poleNum.trim()) {
      prevMap.set(poleNum, record);
    }
  });
  
  currRecords.forEach(record => {
    const poleNum = record['Pole Number'];
    if (poleNum && poleNum.trim()) {
      currMap.set(poleNum, record);
    }
  });
  
  // Find changes
  const changes = {
    newPoles: [],
    statusChanged: [],
    dropsChanged: [],
    unchanged: 0
  };
  
  // Check current poles
  currMap.forEach((record, poleNum) => {
    if (!prevMap.has(poleNum)) {
      const loc = createLocationKey(record);
      changes.newPoles.push({
        poleNumber: poleNum,
        location: loc.address,
        status: record['Status'],
        dropNumber: record['Drop Number'] || 'Not assigned'
      });
    } else {
      const prevRecord = prevMap.get(poleNum);
      if (prevRecord['Status'] !== record['Status']) {
        changes.statusChanged.push({
          poleNumber: poleNum,
          oldStatus: prevRecord['Status'],
          newStatus: record['Status']
        });
      } else if (prevRecord['Drop Number'] !== record['Drop Number']) {
        changes.dropsChanged.push({
          poleNumber: poleNum,
          oldDrop: prevRecord['Drop Number'] || 'None',
          newDrop: record['Drop Number'] || 'None'
        });
      } else {
        changes.unchanged++;
      }
    }
  });
  
  return {
    prevCount: prevMap.size,
    currCount: currMap.size,
    changes
  };
}

async function findNewPoleAssignments(prevPermPath, currPoleRecords) {
  console.log('\n🔄 Finding New Pole Assignments...');
  
  const prevPermissions = await parseCSV(prevPermPath);
  
  // Create location map from previous permissions
  const permissionLocs = new Map();
  prevPermissions.forEach(record => {
    const loc = createLocationKey(record);
    permissionLocs.set(loc.address, {
      gps: loc.gps,
      status: record['Status'],
      propertyId: record['Property ID']
    });
  });
  
  // Check which poles are at these locations
  const newAssignments = [];
  currPoleRecords.forEach(record => {
    const loc = createLocationKey(record);
    if (permissionLocs.has(loc.address)) {
      const permData = permissionLocs.get(loc.address);
      newAssignments.push({
        poleNumber: record['Pole Number'],
        location: loc.address,
        previousStatus: permData.status,
        currentStatus: record['Status'],
        note: 'Was in permissions, now has pole'
      });
    }
  });
  
  return newAssignments;
}

async function processDateComparison(prevDate, currDate, baseDir) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📅 Comparing ${prevDate} → ${currDate}`);
  console.log(`${'='.repeat(60)}`);
  
  const prevDir = path.join(baseDir, prevDate);
  const currDir = path.join(baseDir, currDate);
  
  // Find the CSV files
  const files = await fs.readdir(prevDir);
  const prevPermFile = files.find(f => f.includes('permission_records.csv'));
  const prevPoleFile = files.find(f => f.includes('pole_records.csv'));
  
  const currFiles = await fs.readdir(currDir);
  const currPermFile = currFiles.find(f => f.includes('permission_records.csv'));
  const currPoleFile = currFiles.find(f => f.includes('pole_records.csv'));
  
  const results = {
    date: currDate,
    comparedWith: prevDate,
    permissions: null,
    poles: null,
    conversions: []
  };
  
  // Compare permission files if both exist
  if (prevPermFile && currPermFile) {
    results.permissions = await comparePermissionFiles(
      path.join(prevDir, prevPermFile),
      path.join(currDir, currPermFile)
    );
  }
  
  // Compare pole files if both exist
  if (prevPoleFile && currPoleFile) {
    results.poles = await comparePoleFiles(
      path.join(prevDir, prevPoleFile),
      path.join(currDir, currPoleFile)
    );
    
    // Check for conversions from permissions to poles
    if (prevPermFile) {
      const currPoleRecords = await parseCSV(path.join(currDir, currPoleFile));
      results.conversions = await findNewPoleAssignments(
        path.join(prevDir, prevPermFile),
        currPoleRecords
      );
    }
  }
  
  // Generate summary report
  console.log('\n📊 Summary:');
  
  if (results.permissions) {
    console.log('\nPermission Records:');
    console.log(`- Previous: ${results.permissions.prevCount}`);
    console.log(`- Current: ${results.permissions.currCount}`);
    console.log(`- New permissions: ${results.permissions.changes.new.length}`);
    console.log(`- Status changed: ${results.permissions.changes.statusChanged.length}`);
    console.log(`- Disappeared (likely got poles): ${results.permissions.changes.disappeared.length}`);
  }
  
  if (results.poles) {
    console.log('\nPole Records:');
    console.log(`- Previous: ${results.poles.prevCount}`);
    console.log(`- Current: ${results.poles.currCount}`);
    console.log(`- New poles: ${results.poles.changes.newPoles.length}`);
    console.log(`- Status changed: ${results.poles.changes.statusChanged.length}`);
  }
  
  if (results.conversions.length > 0) {
    console.log(`\n✅ ${results.conversions.length} locations converted from permissions to poles!`);
    results.conversions.slice(0, 5).forEach(c => {
      console.log(`  - ${c.location} → Pole ${c.poleNumber}`);
    });
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node compare-split-csvs.js <prev-date> <curr-date> [base-dir]');
    console.log('Example: node compare-split-csvs.js 2025-05-22 2025-05-23 split_data');
    return;
  }
  
  const prevDate = args[0];
  const currDate = args[1];
  const baseDir = args[2] || 'split_data';
  
  const results = await processDateComparison(prevDate, currDate, baseDir);
  
  // Save detailed report
  const reportDir = path.join('reports', 'split_comparisons');
  await fs.mkdir(reportDir, { recursive: true });
  
  const reportPath = path.join(reportDir, `${prevDate}_to_${currDate}.json`);
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processDateComparison };