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

// Filter for records with pole permissions status
const june3PolePerm = june3Data.filter(r => r['Status']?.includes('Pole Permission'));
const june5PolePerm = june5Data.filter(r => r['Status']?.includes('Pole Permission'));

console.log(`\nPole Permission Records:`);
console.log(`June 3rd: ${june3PolePerm.length} of ${june3Data.length} total`);
console.log(`June 5th: ${june5PolePerm.length} of ${june5Data.length} total`);

// Count status types
const statusCounts = {
  june3: {},
  june5: {}
};

june3Data.forEach(r => {
  const status = r['Status']?.trim() || 'No Status';
  statusCounts.june3[status] = (statusCounts.june3[status] || 0) + 1;
});

june5Data.forEach(r => {
  const status = r['Status']?.trim() || 'No Status';
  statusCounts.june5[status] = (statusCounts.june5[status] || 0) + 1;
});

console.log('\n=== STATUS DISTRIBUTION ===');
console.log('\nJune 3rd Status Counts:');
Object.entries(statusCounts.june3)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

console.log('\nJune 5th Status Counts:');
Object.entries(statusCounts.june5)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

// Look for specific changes in pole permission approvals
const june3Approved = june3Data.filter(r => r['Status'] === 'Pole Permission: Approved');
const june5Approved = june5Data.filter(r => r['Status'] === 'Pole Permission: Approved');

console.log(`\n=== POLE PERMISSION APPROVALS ===`);
console.log(`June 3rd: ${june3Approved.length} approved`);
console.log(`June 5th: ${june5Approved.length} approved`);
console.log(`Net increase: ${june5Approved.length - june3Approved.length} new approvals`);

// Find newly approved poles
const june3ApprovedPoles = new Set(june3Approved.map(r => r['Pole Number']).filter(p => p));
const newlyApproved = june5Approved.filter(r => {
  const pole = r['Pole Number'];
  return pole && !june3ApprovedPoles.has(pole);
});

console.log(`\n=== NEWLY APPROVED POLES (First 15) ===`);
newlyApproved.slice(0, 15).forEach(r => {
  const pole = r['Pole Number'];
  const address = r['Location Address'];
  const agent = r['Field Agent Name (pole permission)'] || 'No agent';
  const date = r['date_status_changed'] || r['Date of Signature'] || 'No date';
  console.log(`- ${pole}: ${address}`);
  console.log(`  Agent: ${agent}, Date: ${date}`);
});

// Find records that changed TO approved status
const june3PropMap = new Map();
june3Data.forEach(r => {
  const propId = r['Property ID'];
  if (propId) june3PropMap.set(propId, r);
});

const changedToApproved = june5Approved.filter(r => {
  const propId = r['Property ID'];
  const june3Record = june3PropMap.get(propId);
  return june3Record && june3Record['Status'] !== 'Pole Permission: Approved';
});

console.log(`\n=== CHANGED TO APPROVED STATUS (First 15) ===`);
changedToApproved.slice(0, 15).forEach(r => {
  const propId = r['Property ID'];
  const june3Record = june3PropMap.get(propId);
  const pole = r['Pole Number'];
  const address = r['Location Address'];
  const oldStatus = june3Record['Status'] || 'No status';
  const agent = r['Field Agent Name (pole permission)'] || 'No agent';
  console.log(`- ${pole || address}: "${oldStatus}" → "Pole Permission: Approved"`);
  console.log(`  Agent: ${agent}, Property: ${propId}`);
});

// Look for pole number assignments
console.log(`\n=== NEW POLE NUMBER ASSIGNMENTS ===`);
let newPoleAssignments = 0;
const poleAssignmentExamples = [];

june5Data.forEach(r => {
  const propId = r['Property ID'];
  const june3Record = june3PropMap.get(propId);
  if (june3Record) {
    const oldPole = june3Record['Pole Number']?.trim() || '';
    const newPole = r['Pole Number']?.trim() || '';
    if (!oldPole && newPole) {
      newPoleAssignments++;
      if (poleAssignmentExamples.length < 10) {
        poleAssignmentExamples.push({
          address: r['Location Address'],
          newPole,
          status: r['Status'],
          agent: r['Field Agent Name (pole permission)'] || 'No agent'
        });
      }
    }
  }
});

console.log(`Total new pole assignments: ${newPoleAssignments}`);
console.log(`\nExamples:`);
poleAssignmentExamples.forEach(ex => {
  console.log(`- ${ex.address}: Assigned pole "${ex.newPole}"`);
  console.log(`  Status: ${ex.status}, Agent: ${ex.agent}`);
});

// Agent activity summary
const agentActivity = {};
june5Data.forEach(r => {
  const agent = r['Field Agent Name (pole permission)']?.trim();
  if (agent && agent !== '') {
    if (!agentActivity[agent]) {
      agentActivity[agent] = {
        total: 0,
        approved: 0,
        declined: 0,
        inProgress: 0
      };
    }
    agentActivity[agent].total++;
    const status = r['Status'] || '';
    if (status.includes('Approved')) agentActivity[agent].approved++;
    else if (status.includes('Declined')) agentActivity[agent].declined++;
    else if (status.includes('In Progress')) agentActivity[agent].inProgress++;
  }
});

console.log(`\n=== TOP AGENTS BY ACTIVITY (June 5th) ===`);
Object.entries(agentActivity)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .forEach(([agent, stats]) => {
    console.log(`- ${agent}: ${stats.total} total (${stats.approved} approved, ${stats.declined} declined)`);
  });

// Summary for management
const summary = {
  overview: {
    june3Total: june3Data.length,
    june5Total: june5Data.length,
    netIncrease: june5Data.length - june3Data.length,
    percentIncrease: ((june5Data.length - june3Data.length) / june3Data.length * 100).toFixed(1) + '%'
  },
  polePermissions: {
    june3Approved: june3Approved.length,
    june5Approved: june5Approved.length,
    newApprovals: june5Approved.length - june3Approved.length,
    changedToApproved: changedToApproved.length
  },
  newRecords: {
    total: june5Data.length - june3Data.length,
    withPoleNumbers: 0,
    withoutPoleNumbers: 0
  }
};

// Count new records with/without poles
june5Data.forEach(r => {
  const propId = r['Property ID'];
  if (!june3PropMap.has(propId)) {
    if (r['Pole Number']?.trim()) {
      summary.newRecords.withPoleNumbers++;
    } else {
      summary.newRecords.withoutPoleNumbers++;
    }
  }
});

console.log('\n=== EXECUTIVE SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));

// Generate final report
const finalReport = `# Daily Progress Report: June 3rd to June 5th, 2025

## Executive Summary
- Total records grew from **${summary.overview.june3Total}** to **${summary.overview.june5Total}** (${summary.overview.percentIncrease} increase)
- Pole permissions approved increased from **${summary.polePermissions.june3Approved}** to **${summary.polePermissions.june5Approved}**
- **${summary.polePermissions.newApprovals}** new pole permission approvals
- **${summary.polePermissions.changedToApproved}** properties changed status to approved
- **${summary.newRecords.total}** completely new records added

## Key Achievements
1. **${summary.polePermissions.newApprovals} new pole permissions approved** in 2 days
2. **${newPoleAssignments} properties assigned pole numbers** 
3. **${changedToApproved.length} properties progressed to approved status**
4. **${newlyApproved.length} newly approved poles** ready for installation

## Status Distribution Changes
June 3rd Top Status:
${Object.entries(statusCounts.june3)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join('\n')}

June 5th Top Status:
${Object.entries(statusCounts.june5)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join('\n')}

## Top Performing Agents
${Object.entries(agentActivity)
  .sort((a, b) => b[1].approved - a[1].approved)
  .slice(0, 5)
  .map(([agent, stats]) => `- ${agent}: ${stats.approved} approvals`)
  .join('\n')}

## Recommendations
1. Focus on converting the ${summary.newRecords.withoutPoleNumbers} new records without pole assignments
2. Continue the momentum - ${summary.polePermissions.newApprovals} approvals in 2 days shows good progress
3. Address any bottlenecks preventing pole number assignments
`;

fs.writeFileSync(
  '/home/ldp/VF/Apps/FibreFlow/OneMap/reports/june3-to-june5-executive-report.md',
  finalReport
);

console.log('\n✓ Executive report saved to: reports/june3-to-june5-executive-report.md');