import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';');
  
  return lines.slice(1).map(line => {
    const values = line.split(';');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

async function analyzePoleProgress() {
  const june3Data = fs.readFileSync(path.join(__dirname, '../downloads/june3.csv'), 'utf8');
  const june5Data = fs.readFileSync(path.join(__dirname, '../downloads/june5.csv'), 'utf8');
  
  const june3Records = parseCSV(june3Data);
  const june5Records = parseCSV(june5Data);
  
  console.log('📊 Pole-Level Progress Analysis: June 3rd to June 5th\n');
  console.log('='.repeat(70));
  
  // Track data by poles
  const poleData = new Map();
  
  // Process June 3 data
  june3Records.forEach(record => {
    const pole = record['Pole Number'];
    if (!pole) return;
    
    if (!poleData.has(pole)) {
      poleData.set(pole, {
        june3: { total: 0, withDrops: 0, statuses: new Map(), drops: new Set() },
        june5: { total: 0, withDrops: 0, statuses: new Map(), drops: new Set() }
      });
    }
    
    const poleInfo = poleData.get(pole);
    poleInfo.june3.total++;
    
    if (record['Drop Number']) {
      poleInfo.june3.withDrops++;
      poleInfo.june3.drops.add(record['Drop Number']);
    }
    
    const status = record['Status'] || 'No Status';
    poleInfo.june3.statuses.set(status, (poleInfo.june3.statuses.get(status) || 0) + 1);
  });
  
  // Process June 5 data
  june5Records.forEach(record => {
    const pole = record['Pole Number'];
    if (!pole) return;
    
    if (!poleData.has(pole)) {
      poleData.set(pole, {
        june3: { total: 0, withDrops: 0, statuses: new Map(), drops: new Set() },
        june5: { total: 0, withDrops: 0, statuses: new Map(), drops: new Set() }
      });
    }
    
    const poleInfo = poleData.get(pole);
    poleInfo.june5.total++;
    
    if (record['Drop Number']) {
      poleInfo.june5.withDrops++;
      poleInfo.june5.drops.add(record['Drop Number']);
    }
    
    const status = record['Status'] || 'No Status';
    poleInfo.june5.statuses.set(status, (poleInfo.june5.statuses.get(status) || 0) + 1);
  });
  
  // Analyze progress
  const progressStats = {
    newPoles: 0,
    polesWithMoreRecords: 0,
    polesWithNewDrops: 0,
    polesWithStatusProgress: 0,
    significantPoles: []
  };
  
  poleData.forEach((data, pole) => {
    const recordsAdded = data.june5.total - data.june3.total;
    const dropsAdded = data.june5.drops.size - data.june3.drops.size;
    
    // New poles (only in June 5)
    if (data.june3.total === 0 && data.june5.total > 0) {
      progressStats.newPoles++;
    }
    
    // Poles with more records
    if (recordsAdded > 0) {
      progressStats.polesWithMoreRecords++;
    }
    
    // Poles with new drops
    if (dropsAdded > 0) {
      progressStats.polesWithNewDrops++;
    }
    
    // Check for status progress
    let hasStatusProgress = false;
    data.june5.statuses.forEach((count, status) => {
      if (!data.june3.statuses.has(status) && status.includes('Approved')) {
        hasStatusProgress = true;
      }
    });
    
    if (hasStatusProgress) {
      progressStats.polesWithStatusProgress++;
    }
    
    // Track significant poles (with most activity)
    if (recordsAdded > 5 || dropsAdded > 3) {
      progressStats.significantPoles.push({
        pole,
        recordsAdded,
        dropsAdded,
        june3Total: data.june3.total,
        june5Total: data.june5.total,
        june3Drops: data.june3.drops.size,
        june5Drops: data.june5.drops.size
      });
    }
  });
  
  // Sort significant poles by activity
  progressStats.significantPoles.sort((a, b) => 
    (b.recordsAdded + b.dropsAdded) - (a.recordsAdded + a.dropsAdded)
  );
  
  // Display results
  console.log('\n📈 OVERALL POLE PROGRESS\n');
  console.log(`Total poles tracked: ${poleData.size}`);
  console.log(`New poles added in June 5: ${progressStats.newPoles}`);
  console.log(`Poles with more records: ${progressStats.polesWithMoreRecords}`);
  console.log(`Poles with new drops: ${progressStats.polesWithNewDrops}`);
  console.log(`Poles with status progress: ${progressStats.polesWithStatusProgress}`);
  
  console.log('\n🔥 TOP 10 MOST ACTIVE POLES (Most Progress)\n');
  progressStats.significantPoles.slice(0, 10).forEach((pole, idx) => {
    console.log(`${idx + 1}. Pole ${pole.pole}:`);
    console.log(`   Records: ${pole.june3Total} → ${pole.june5Total} (+${pole.recordsAdded})`);
    console.log(`   Drops: ${pole.june3Drops} → ${pole.june5Drops} (+${pole.dropsAdded})`);
    console.log(`   Total activity: +${pole.recordsAdded + pole.dropsAdded} items\n`);
  });
  
  // Analyze by address progress
  console.log('📍 ADDRESS-LEVEL PROGRESS\n');
  console.log('='.repeat(70));
  
  // Track addresses that got pole assignments
  const addressProgress = new Map();
  
  // Build June 3 address map
  june3Records.forEach(record => {
    const address = record['Location Address'];
    if (!address) return;
    
    if (!addressProgress.has(address)) {
      addressProgress.set(address, { june3: null, june5: null });
    }
    addressProgress.get(address).june3 = {
      pole: record['Pole Number'],
      drop: record['Drop Number'],
      status: record['Status']
    };
  });
  
  // Build June 5 address map
  june5Records.forEach(record => {
    const address = record['Location Address'];
    if (!address) return;
    
    if (!addressProgress.has(address)) {
      addressProgress.set(address, { june3: null, june5: null });
    }
    addressProgress.get(address).june5 = {
      pole: record['Pole Number'],
      drop: record['Drop Number'],
      status: record['Status']
    };
  });
  
  // Count address progress
  let newPoleAssignments = 0;
  let newDropAssignments = 0;
  let statusUpgrades = 0;
  const examples = [];
  
  addressProgress.forEach((data, address) => {
    if (!data.june3 || !data.june5) return;
    
    // New pole assignment
    if (!data.june3.pole && data.june5.pole) {
      newPoleAssignments++;
      if (examples.length < 5) {
        examples.push({
          type: 'New Pole',
          address,
          change: `Assigned to pole ${data.june5.pole}`
        });
      }
    }
    
    // New drop assignment
    if (!data.june3.drop && data.june5.drop) {
      newDropAssignments++;
      if (examples.length < 10) {
        examples.push({
          type: 'New Drop',
          address,
          change: `Assigned drop ${data.june5.drop} on pole ${data.june5.pole}`
        });
      }
    }
    
    // Status upgrade
    if (data.june3.status !== data.june5.status && data.june5.status) {
      statusUpgrades++;
      if (examples.length < 15) {
        examples.push({
          type: 'Status Change',
          address,
          change: `${data.june3.status || 'No status'} → ${data.june5.status}`
        });
      }
    }
  });
  
  console.log(`\nAddresses with new pole assignments: ${newPoleAssignments}`);
  console.log(`Addresses with new drop assignments: ${newDropAssignments}`);
  console.log(`Addresses with status upgrades: ${statusUpgrades}`);
  
  console.log('\n📝 EXAMPLE PROGRESS RECORDS:\n');
  examples.forEach((example, idx) => {
    console.log(`${idx + 1}. [${example.type}] ${example.address}`);
    console.log(`   → ${example.change}\n`);
  });
  
  // Generate summary report
  const summaryReport = {
    date: new Date().toISOString(),
    period: 'June 3rd to June 5th, 2025',
    summary: {
      totalPolesTracked: poleData.size,
      newPolesAdded: progressStats.newPoles,
      polesWithProgress: progressStats.polesWithMoreRecords,
      polesWithNewDrops: progressStats.polesWithNewDrops,
      addressesWithNewPoles: newPoleAssignments,
      addressesWithNewDrops: newDropAssignments,
      addressesWithStatusChange: statusUpgrades
    },
    topActivePoles: progressStats.significantPoles.slice(0, 20),
    progressExamples: examples
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../reports/june-pole-progress-summary.json'),
    JSON.stringify(summaryReport, null, 2)
  );
  
  console.log('✅ Full progress report saved to: reports/june-pole-progress-summary.json');
}

analyzePoleProgress().catch(console.error);