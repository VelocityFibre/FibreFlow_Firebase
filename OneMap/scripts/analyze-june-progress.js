import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

async function analyzeProgress() {
  // Read both files
  const june3Data = fs.readFileSync(path.join(__dirname, '../downloads/june3.csv'), 'utf8');
  const june5Data = fs.readFileSync(path.join(__dirname, '../downloads/june5.csv'), 'utf8');
  
  const june3Records = parseCSV(june3Data);
  const june5Records = parseCSV(june5Data);
  
  console.log('📊 June 3rd to June 5th Progress Analysis\n');
  console.log(`June 3rd: ${june3Records.length} records`);
  console.log(`June 5th: ${june5Records.length} records`);
  
  // Create lookup maps
  const june3ByPropertyId = new Map();
  const june3ByPoleNumber = new Map();
  const june3ByAddress = new Map();
  
  june3Records.forEach(record => {
    june3ByPropertyId.set(record['Property ID'], record);
    
    if (record['Pole Number']) {
      if (!june3ByPoleNumber.has(record['Pole Number'])) {
        june3ByPoleNumber.set(record['Pole Number'], []);
      }
      june3ByPoleNumber.get(record['Pole Number']).push(record);
    }
    
    const address = `${record['Street Number']} ${record['Street Name']}`.trim();
    if (address) {
      if (!june3ByAddress.has(address)) {
        june3ByAddress.set(address, []);
      }
      june3ByAddress.get(address).push(record);
    }
  });
  
  // Track changes
  const changes = {
    statusChanges: [],
    newPoleAssignments: [],
    dropsAdded: [],
    agentChanges: [],
    otherChanges: []
  };
  
  // Track progress by pole
  const poleProgress = new Map();
  
  // Analyze each June 5th record
  june5Records.forEach(june5Record => {
    const propertyId = june5Record['Property ID'];
    const june3Record = june3ByPropertyId.get(propertyId);
    
    if (june3Record) {
      // Compare all fields
      const fieldChanges = [];
      
      // Check status change
      if (june3Record['Status'] !== june5Record['Status']) {
        fieldChanges.push({
          field: 'Status',
          from: june3Record['Status'],
          to: june5Record['Status']
        });
        changes.statusChanges.push({
          propertyId,
          pole: june5Record['Pole Number'],
          address: `${june5Record['Street Number']} ${june5Record['Street Name']}`,
          from: june3Record['Status'],
          to: june5Record['Status']
        });
      }
      
      // Check pole assignment
      if (!june3Record['Pole Number'] && june5Record['Pole Number']) {
        fieldChanges.push({
          field: 'Pole Number',
          from: 'No Pole',
          to: june5Record['Pole Number']
        });
        changes.newPoleAssignments.push({
          propertyId,
          address: `${june5Record['Street Number']} ${june5Record['Street Name']}`,
          newPole: june5Record['Pole Number'],
          status: june5Record['Status']
        });
      }
      
      // Check drop changes
      if (june3Record['Drop'] !== june5Record['Drop']) {
        fieldChanges.push({
          field: 'Drop',
          from: june3Record['Drop'] || 'None',
          to: june5Record['Drop'] || 'None'
        });
        if (!june3Record['Drop'] && june5Record['Drop']) {
          changes.dropsAdded.push({
            propertyId,
            pole: june5Record['Pole Number'],
            address: `${june5Record['Street Number']} ${june5Record['Street Name']}`,
            newDrop: june5Record['Drop']
          });
        }
      }
      
      // Check agent changes
      if (june3Record['Agent'] !== june5Record['Agent']) {
        fieldChanges.push({
          field: 'Agent',
          from: june3Record['Agent'] || 'None',
          to: june5Record['Agent'] || 'None'
        });
        changes.agentChanges.push({
          propertyId,
          pole: june5Record['Pole Number'],
          address: `${june5Record['Street Number']} ${june5Record['Street Name']}`,
          from: june3Record['Agent'],
          to: june5Record['Agent']
        });
      }
      
      // Check other important fields
      const otherFields = ['PON', 'Zone', 'Lot Registration Number', 'Distribution Box - Status'];
      otherFields.forEach(field => {
        if (june3Record[field] !== june5Record[field]) {
          fieldChanges.push({
            field,
            from: june3Record[field] || 'Empty',
            to: june5Record[field] || 'Empty'
          });
        }
      });
      
      if (fieldChanges.length > 0) {
        changes.otherChanges.push({
          propertyId,
          pole: june5Record['Pole Number'],
          address: `${june5Record['Street Number']} ${june5Record['Street Name']}`,
          changes: fieldChanges
        });
      }
    }
  });
  
  // Analyze progress by pole number
  june5Records.forEach(record => {
    if (record['Pole Number']) {
      const poleNum = record['Pole Number'];
      if (!poleProgress.has(poleNum)) {
        poleProgress.set(poleNum, {
          june3Count: 0,
          june5Count: 0,
          statusChanges: new Set(),
          dropsAdded: 0
        });
      }
      poleProgress.get(poleNum).june5Count++;
    }
  });
  
  // Count June 3 poles
  june3Records.forEach(record => {
    if (record['Pole Number'] && poleProgress.has(record['Pole Number'])) {
      poleProgress.get(record['Pole Number']).june3Count++;
    }
  });
  
  // Generate report
  console.log('\n📈 PROGRESS SUMMARY\n');
  console.log('='.repeat(60));
  
  console.log(`\n1. STATUS CHANGES: ${changes.statusChanges.length} records`);
  if (changes.statusChanges.length > 0) {
    // Group by status transition
    const statusTransitions = {};
    changes.statusChanges.forEach(change => {
      const key = `${change.from} → ${change.to}`;
      if (!statusTransitions[key]) {
        statusTransitions[key] = [];
      }
      statusTransitions[key].push(change);
    });
    
    Object.entries(statusTransitions).forEach(([transition, records]) => {
      console.log(`\n   ${transition}: ${records.length} records`);
      records.slice(0, 3).forEach(r => {
        console.log(`   - ${r.address} (Pole: ${r.pole || 'No pole'})`);
      });
      if (records.length > 3) {
        console.log(`   ... and ${records.length - 3} more`);
      }
    });
  }
  
  console.log(`\n2. NEW POLE ASSIGNMENTS: ${changes.newPoleAssignments.length} addresses`);
  if (changes.newPoleAssignments.length > 0) {
    changes.newPoleAssignments.slice(0, 5).forEach(assignment => {
      console.log(`   - ${assignment.address} → Pole ${assignment.newPole} (Status: ${assignment.status})`);
    });
    if (changes.newPoleAssignments.length > 5) {
      console.log(`   ... and ${changes.newPoleAssignments.length - 5} more`);
    }
  }
  
  console.log(`\n3. DROPS ADDED: ${changes.dropsAdded.length} new drops`);
  if (changes.dropsAdded.length > 0) {
    changes.dropsAdded.slice(0, 5).forEach(drop => {
      console.log(`   - ${drop.address} → Drop ${drop.newDrop} on Pole ${drop.pole}`);
    });
    if (changes.dropsAdded.length > 5) {
      console.log(`   ... and ${changes.dropsAdded.length - 5} more`);
    }
  }
  
  console.log(`\n4. AGENT CHANGES: ${changes.agentChanges.length} reassignments`);
  if (changes.agentChanges.length > 0) {
    // Group by agent transition
    const agentTransitions = {};
    changes.agentChanges.forEach(change => {
      const key = `${change.from || 'None'} → ${change.to || 'None'}`;
      if (!agentTransitions[key]) {
        agentTransitions[key] = 0;
      }
      agentTransitions[key]++;
    });
    
    Object.entries(agentTransitions).forEach(([transition, count]) => {
      console.log(`   ${transition}: ${count} records`);
    });
  }
  
  console.log(`\n5. POLE-LEVEL PROGRESS`);
  let polesWithMoreDrops = 0;
  let polesWithNewRecords = 0;
  
  poleProgress.forEach((data, poleNum) => {
    if (data.june5Count > data.june3Count) {
      polesWithNewRecords++;
    }
  });
  
  console.log(`   - Poles with new records: ${polesWithNewRecords}`);
  console.log(`   - Total unique poles tracked: ${poleProgress.size}`);
  
  // Save detailed report
  const report = {
    summary: {
      june3Records: june3Records.length,
      june5Records: june5Records.length,
      statusChanges: changes.statusChanges.length,
      newPoleAssignments: changes.newPoleAssignments.length,
      dropsAdded: changes.dropsAdded.length,
      agentChanges: changes.agentChanges.length
    },
    changes,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../reports/june-progress-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Detailed report saved to: reports/june-progress-report.json');
}

analyzeProgress().catch(console.error);