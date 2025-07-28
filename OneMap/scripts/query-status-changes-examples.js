#!/usr/bin/env node

/**
 * Example Queries for Status Changes Collection
 * Shows how to analyze status changes directly from database
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function runExampleQueries() {
  console.log('📊 Status Changes Query Examples\n');
  
  // 1. Get all status changes for a specific date
  console.log('1️⃣ Status changes on June 23, 2025:');
  const june23Changes = await db.collection('vf-onemap-status-changes')
    .where('changeDate', '==', '2025-06-23')
    .get();
  console.log(`   Found ${june23Changes.size} changes\n`);
  
  // 2. Get all changes by a specific agent
  console.log('2️⃣ Status changes by agent "nathan":');
  const nathanChanges = await db.collection('vf-onemap-status-changes')
    .where('agent', '==', 'nathan')
    .orderBy('changeDate', 'desc')
    .limit(10)
    .get();
  console.log(`   Found ${nathanChanges.size} recent changes\n`);
  
  // 3. Find specific status transitions
  console.log('3️⃣ Properties moving from "Pole Permission: Approved" to "Home Installation: In Progress":');
  const transitions = await db.collection('vf-onemap-status-changes')
    .where('fromStatus', '==', 'Pole Permission: Approved')
    .where('toStatus', '==', 'Home Installation: In Progress')
    .get();
  console.log(`   Found ${transitions.size} such transitions\n`);
  
  // 4. Calculate average time in status
  console.log('4️⃣ Average days in "Pole Permission: Approved" status:');
  const approvedTimes = await db.collection('vf-onemap-status-changes')
    .where('fromStatus', '==', 'Pole Permission: Approved')
    .where('daysInPreviousStatus', '>', 0)
    .get();
  
  let totalDays = 0;
  let count = 0;
  approvedTimes.forEach(doc => {
    const data = doc.data();
    if (data.daysInPreviousStatus) {
      totalDays += data.daysInPreviousStatus;
      count++;
    }
  });
  console.log(`   Average: ${count > 0 ? (totalDays/count).toFixed(1) : 0} days\n`);
  
  // 5. Status changes by pole
  console.log('5️⃣ Status history for pole LAW.P.C328:');
  const poleHistory = await db.collection('vf-onemap-status-changes')
    .where('poleNumber', '==', 'LAW.P.C328')
    .orderBy('changeDate', 'asc')
    .get();
  
  console.log(`   History (${poleHistory.size} changes):`);
  poleHistory.forEach(doc => {
    const data = doc.data();
    console.log(`   ${data.changeDate}: ${data.fromStatus} → ${data.toStatus}`);
  });
  
  // 6. Agent performance ranking
  console.log('\n6️⃣ Agent Performance (Status Changes):');
  const allChanges = await db.collection('vf-onemap-status-changes')
    .where('agent', '!=', 'No Agent')
    .get();
  
  const agentStats = {};
  allChanges.forEach(doc => {
    const data = doc.data();
    if (!agentStats[data.agent]) {
      agentStats[data.agent] = { total: 0, approvals: 0 };
    }
    agentStats[data.agent].total++;
    if (data.toStatus && data.toStatus.includes('Approved')) {
      agentStats[data.agent].approvals++;
    }
  });
  
  Object.entries(agentStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .forEach(([agent, stats]) => {
      const approvalRate = ((stats.approvals / stats.total) * 100).toFixed(1);
      console.log(`   ${agent}: ${stats.total} changes (${approvalRate}% approvals)`);
    });
  
  // 7. Recent status changes
  console.log('\n7️⃣ Most Recent Status Changes:');
  const recentChanges = await db.collection('vf-onemap-status-changes')
    .orderBy('importTimestamp', 'desc')
    .limit(5)
    .get();
  
  recentChanges.forEach(doc => {
    const data = doc.data();
    console.log(`   Property ${data.propertyId}: ${data.fromStatus} → ${data.toStatus} (${data.changeDate})`);
  });
  
  console.log('\n✅ Query examples complete!');
}

// Additional analysis functions

async function getWorkflowBottlenecks() {
  console.log('\n🚧 Workflow Bottlenecks Analysis:');
  
  const statusDurations = await db.collection('vf-onemap-status-changes')
    .where('daysInPreviousStatus', '>', 0)
    .get();
  
  const durationsByStatus = {};
  statusDurations.forEach(doc => {
    const data = doc.data();
    if (!durationsByStatus[data.fromStatus]) {
      durationsByStatus[data.fromStatus] = [];
    }
    durationsByStatus[data.fromStatus].push(data.daysInPreviousStatus);
  });
  
  Object.entries(durationsByStatus).forEach(([status, durations]) => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    console.log(`   ${status}: Avg ${avg.toFixed(1)} days (Max: ${max} days)`);
  });
}

async function getDailyStatusReport(date) {
  console.log(`\n📅 Daily Status Report for ${date}:`);
  
  const dayChanges = await db.collection('vf-onemap-status-changes')
    .where('changeDate', '==', date)
    .get();
  
  const summary = {
    total: dayChanges.size,
    byStatus: {},
    byAgent: {}
  };
  
  dayChanges.forEach(doc => {
    const data = doc.data();
    
    // Count by status
    if (!summary.byStatus[data.toStatus]) {
      summary.byStatus[data.toStatus] = 0;
    }
    summary.byStatus[data.toStatus]++;
    
    // Count by agent
    if (!summary.byAgent[data.agent]) {
      summary.byAgent[data.agent] = 0;
    }
    summary.byAgent[data.agent]++;
  });
  
  console.log(`   Total Changes: ${summary.total}`);
  console.log('   By Status:');
  Object.entries(summary.byStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });
}

// Run examples
async function main() {
  try {
    await runExampleQueries();
    await getWorkflowBottlenecks();
    await getDailyStatusReport('2025-06-23');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

main();