const fs = require('fs');
const csv = require('csv-parse/sync');

// File paths
const june3File = '/home/ldp/VF/Apps/FibreFlow/OneMap/downloads/Lawley Raw Stats/Lawley June Week 1 03062025.csv';
const june5File = '/home/ldp/VF/Apps/FibreFlow/OneMap/downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv';

// Read and parse CSV files with semicolon delimiter
console.log('Reading June 3rd file...');
const june3Data = csv.parse(fs.readFileSync(june3File), { 
  columns: true, 
  skip_empty_lines: true,
  bom: true,
  delimiter: ';',
  relax_quotes: true,
  relax_column_count: true
});

console.log('Reading June 5th file...');
const june5Data = csv.parse(fs.readFileSync(june5File), { 
  columns: true, 
  skip_empty_lines: true,
  bom: true,
  delimiter: ';',
  relax_quotes: true,
  relax_column_count: true
});

console.log(`June 3rd records: ${june3Data.length}`);
console.log(`June 5th records: ${june5Data.length}`);

// Function to create a unique key for each record
function createKey(record) {
  const poleNumber = record['Pole Number']?.trim();
  const gps = record['Latitude & Longitude']?.trim();
  const address = record['Location Address']?.trim();
  const propertyId = record['Property ID']?.trim();
  
  // Priority: Pole Number > GPS > Address > Property ID
  if (poleNumber && poleNumber !== '') {
    return `pole:${poleNumber}`;
  } else if (gps && gps !== '') {
    return `gps:${gps}`;
  } else if (address && address !== '') {
    return `addr:${address}`;
  } else if (propertyId && propertyId !== '') {
    return `prop:${propertyId}`;
  }
  return null;
}

// Create maps for both datasets
const june3Map = new Map();
const june5Map = new Map();
const june3PropMap = new Map();
const june5PropMap = new Map();

// Index June 3rd data
june3Data.forEach(record => {
  const key = createKey(record);
  if (key) {
    june3Map.set(key, record);
  }
  // Also index by Property ID for cross-reference
  const propId = record['Property ID']?.trim();
  if (propId) {
    june3PropMap.set(propId, record);
  }
});

// Index June 5th data
june5Data.forEach(record => {
  const key = createKey(record);
  if (key) {
    june5Map.set(key, record);
  }
  // Also index by Property ID for cross-reference
  const propId = record['Property ID']?.trim();
  if (propId) {
    june5PropMap.set(propId, record);
  }
});

// Track changes
const newRecords = [];
const statusChanges = [];
const agentChanges = [];
const poleAssignments = [];
const dropChanges = [];
const gpsUpdates = [];

// Analyze changes
june5Data.forEach(june5Record => {
  const propertyId = june5Record['Property ID']?.trim();
  const key = createKey(june5Record);
  
  // Check if record exists in June 3rd data
  let june3Record = null;
  if (june3Map.has(key)) {
    june3Record = june3Map.get(key);
  } else if (propertyId && june3PropMap.has(propertyId)) {
    june3Record = june3PropMap.get(propertyId);
  }
  
  if (!june3Record) {
    // New record
    newRecords.push(june5Record);
  } else {
    // Compare fields for changes
    const oldStatus = june3Record['Status']?.trim() || '';
    const newStatus = june5Record['Status']?.trim() || '';
    
    if (oldStatus !== newStatus) {
      statusChanges.push({
        propertyId,
        address: june5Record['Location Address'],
        poleNumber: june5Record['Pole Number'],
        oldStatus,
        newStatus,
        agent: june5Record['Field Agent Name (pole permission)']
      });
    }
    
    // Check for agent changes
    const oldAgent = june3Record['Field Agent Name (pole permission)']?.trim() || '';
    const newAgent = june5Record['Field Agent Name (pole permission)']?.trim() || '';
    
    if (oldAgent !== newAgent && newAgent !== '') {
      agentChanges.push({
        propertyId,
        address: june5Record['Location Address'],
        poleNumber: june5Record['Pole Number'],
        oldAgent: oldAgent || 'None',
        newAgent: newAgent
      });
    }
    
    // Check for new pole assignments
    const oldPole = june3Record['Pole Number']?.trim() || '';
    const newPole = june5Record['Pole Number']?.trim() || '';
    
    if (!oldPole && newPole) {
      poleAssignments.push({
        propertyId,
        address: june5Record['Location Address'],
        newPole,
        status: newStatus,
        agent: june5Record['Field Agent Name (pole permission)']
      });
    }
    
    // Check for drop changes
    const oldDrop = june3Record['Drop Number']?.trim() || '';
    const newDrop = june5Record['Drop Number']?.trim() || '';
    
    if (oldDrop !== newDrop && newDrop) {
      dropChanges.push({
        propertyId,
        address: june5Record['Location Address'],
        poleNumber: june5Record['Pole Number'],
        oldDrop: oldDrop || 'None',
        newDrop
      });
    }
    
    // Check for GPS updates
    const oldGPS = june3Record['Latitude & Longitude']?.trim() || '';
    const newGPS = june5Record['Latitude & Longitude']?.trim() || '';
    
    if (oldGPS !== newGPS && newGPS) {
      gpsUpdates.push({
        propertyId,
        address: june5Record['Location Address'],
        poleNumber: june5Record['Pole Number'],
        oldGPS: oldGPS || 'None',
        newGPS
      });
    }
  }
});

// Generate report
console.log('\n=== CHANGE REPORT: JUNE 3rd to JUNE 5th ===\n');

console.log(`SUMMARY:`);
console.log(`- Total records June 3rd: ${june3Data.length}`);
console.log(`- Total records June 5th: ${june5Data.length}`);
console.log(`- Net increase: ${june5Data.length - june3Data.length} records\n`);

console.log(`CHANGES FOUND:`);
console.log(`- New records: ${newRecords.length}`);
console.log(`- Status changes: ${statusChanges.length}`);
console.log(`- Agent changes: ${agentChanges.length}`);
console.log(`- New pole assignments: ${poleAssignments.length}`);
console.log(`- Drop changes: ${dropChanges.length}`);
console.log(`- GPS updates: ${gpsUpdates.length}\n`);

// Show examples of each change type
console.log('=== STATUS CHANGES (First 10 examples) ===');
statusChanges.slice(0, 10).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: "${change.oldStatus}" → "${change.newStatus}" (Agent: ${change.agent})`);
});

console.log('\n=== NEW POLE ASSIGNMENTS (First 10 examples) ===');
poleAssignments.slice(0, 10).forEach(change => {
  console.log(`- ${change.address}: Assigned pole "${change.newPole}" (Status: ${change.status}, Agent: ${change.agent})`);
});

console.log('\n=== AGENT CHANGES (First 10 examples) ===');
agentChanges.slice(0, 10).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: Agent changed from "${change.oldAgent}" to "${change.newAgent}"`);
});

console.log('\n=== NEW RECORDS (First 10 examples) ===');
newRecords.slice(0, 10).forEach(record => {
  const pole = record['Pole Number'] || 'No pole';
  const status = record['Status'] || 'No status';
  const agent = record['Field Agent Name (pole permission)'] || 'No agent';
  const address = record['Location Address'] || 'No address';
  console.log(`- Property ${record['Property ID']}: ${address} (Pole: ${pole}, Status: ${status}, Agent: ${agent})`);
});

console.log('\n=== DROP CHANGES (First 10 examples) ===');
dropChanges.slice(0, 10).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: Drop changed from "${change.oldDrop}" to "${change.newDrop}"`);
});

console.log('\n=== GPS UPDATES (First 10 examples) ===');
gpsUpdates.slice(0, 10).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: GPS updated from "${change.oldGPS}" to "${change.newGPS}"`);
});

// Show key status transitions
console.log('\n=== KEY STATUS TRANSITIONS ===');
const approvedChanges = statusChanges.filter(c => c.newStatus === 'Pole Permission: Approved');
const inProgressChanges = statusChanges.filter(c => c.newStatus.includes('In Progress'));
const completedChanges = statusChanges.filter(c => c.newStatus.includes('Completed') || c.newStatus.includes('Complete'));

console.log(`\nPole Permissions Approved: ${approvedChanges.length}`);
approvedChanges.slice(0, 5).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: Now approved (was: ${change.oldStatus})`);
});

console.log(`\nMoved to In Progress: ${inProgressChanges.length}`);
inProgressChanges.slice(0, 5).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: Now in progress (was: ${change.oldStatus})`);
});

console.log(`\nCompleted: ${completedChanges.length}`);
completedChanges.slice(0, 5).forEach(change => {
  console.log(`- ${change.poleNumber || change.address}: Completed (was: ${change.oldStatus})`);
});

// Save detailed report
const detailedReport = {
  summary: {
    june3Records: june3Data.length,
    june5Records: june5Data.length,
    netIncrease: june5Data.length - june3Data.length,
    changesSummary: {
      newRecords: newRecords.length,
      statusChanges: statusChanges.length,
      agentChanges: agentChanges.length,
      newPoleAssignments: poleAssignments.length,
      dropChanges: dropChanges.length,
      gpsUpdates: gpsUpdates.length
    }
  },
  statusChanges: statusChanges.slice(0, 50),
  newPoleAssignments: poleAssignments.slice(0, 50),
  agentChanges: agentChanges.slice(0, 50),
  newRecords: newRecords.slice(0, 50).map(r => ({
    propertyId: r['Property ID'],
    address: r['Location Address'],
    pole: r['Pole Number'],
    status: r['Status'],
    agent: r['Field Agent Name (pole permission)']
  })),
  keyTransitions: {
    approvedCount: approvedChanges.length,
    inProgressCount: inProgressChanges.length,
    completedCount: completedChanges.length,
    approved: approvedChanges.slice(0, 20),
    inProgress: inProgressChanges.slice(0, 20),
    completed: completedChanges.slice(0, 20)
  }
};

fs.writeFileSync(
  '/home/ldp/VF/Apps/FibreFlow/OneMap/reports/june3-to-june5-changes.json',
  JSON.stringify(detailedReport, null, 2)
);

console.log('\n✓ Detailed report saved to: reports/june3-to-june5-changes.json');

// Generate a markdown report
let markdownReport = `# Daily Change Report: June 3rd to June 5th, 2025

## Summary
- **June 3rd Records**: ${june3Data.length}
- **June 5th Records**: ${june5Data.length}  
- **Net Increase**: ${june5Data.length - june3Data.length} records

## Change Statistics
- **New Records**: ${newRecords.length}
- **Status Changes**: ${statusChanges.length}
- **Agent Changes**: ${agentChanges.length}
- **New Pole Assignments**: ${poleAssignments.length}
- **Drop Changes**: ${dropChanges.length}
- **GPS Updates**: ${gpsUpdates.length}

## Key Status Transitions
- **Pole Permissions Approved**: ${approvedChanges.length}
- **Moved to In Progress**: ${inProgressChanges.length}
- **Completed**: ${completedChanges.length}

## Detailed Examples

### Status Changes (Top 10)
`;

statusChanges.slice(0, 10).forEach(change => {
  markdownReport += `- **${change.poleNumber || change.address}**: "${change.oldStatus}" → "${change.newStatus}" (Agent: ${change.agent})\n`;
});

markdownReport += `\n### New Pole Assignments (Top 10)\n`;
poleAssignments.slice(0, 10).forEach(change => {
  markdownReport += `- **${change.address}**: Assigned pole "${change.newPole}" (Status: ${change.status}, Agent: ${change.agent})\n`;
});

markdownReport += `\n### Pole Permissions Approved (Top 10)\n`;
approvedChanges.slice(0, 10).forEach(change => {
  markdownReport += `- **${change.poleNumber || change.address}**: Now approved (was: ${change.oldStatus})\n`;
});

markdownReport += `\n### New Records Added (Top 10)\n`;
newRecords.slice(0, 10).forEach(record => {
  const pole = record['Pole Number'] || 'No pole';
  const status = record['Status'] || 'No status';
  const agent = record['Field Agent Name (pole permission)'] || 'No agent';
  const address = record['Location Address'] || 'No address';
  markdownReport += `- **Property ${record['Property ID']}**: ${address} (Pole: ${pole}, Status: ${status}, Agent: ${agent})\n`;
});

fs.writeFileSync(
  '/home/ldp/VF/Apps/FibreFlow/OneMap/reports/june3-to-june5-changes.md',
  markdownReport
);

console.log('✓ Markdown report saved to: reports/june3-to-june5-changes.md');