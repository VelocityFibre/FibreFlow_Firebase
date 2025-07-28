#!/usr/bin/env node

/**
 * Complex Status Change Query Examples
 * Demonstrates the power of the indexed collection
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function runComplexQueries() {
  console.log('🔥 Complex Status Change Queries Demo\n');
  console.log('=' * 50 + '\n');
  
  // Query 1: Agent Performance Analysis
  console.log('📊 1. AGENT PERFORMANCE ANALYSIS');
  console.log('Finding top agents by approval count in June 2025...\n');
  
  const agentApprovals = await db.collection('vf-onemap-status-changes')
    .where('toStatus', '==', 'Pole Permission: Approved')
    .where('changeDate', '>=', '2025-06-01')
    .where('changeDate', '<=', '2025-06-30')
    .get();
  
  const agentStats = {};
  agentApprovals.forEach(doc => {
    const data = doc.data();
    const agent = data.agent || 'No Agent';
    if (!agentStats[agent]) {
      agentStats[agent] = { approvals: 0, properties: new Set() };
    }
    agentStats[agent].approvals++;
    agentStats[agent].properties.add(data.propertyId);
  });
  
  console.log('Top 5 Agents by Approvals in June:');
  Object.entries(agentStats)
    .sort((a, b) => b[1].approvals - a[1].approvals)
    .slice(0, 5)
    .forEach(([agent, stats], index) => {
      console.log(`${index + 1}. ${agent}: ${stats.approvals} approvals (${stats.properties.size} unique properties)`);
    });
  
  // Query 2: Workflow Bottleneck Analysis
  console.log('\n\n📈 2. WORKFLOW BOTTLENECK ANALYSIS');
  console.log('Finding statuses where properties get stuck longest...\n');
  
  const longWaits = await db.collection('vf-onemap-status-changes')
    .where('daysInPreviousStatus', '>', 10)
    .orderBy('daysInPreviousStatus', 'desc')
    .limit(20)
    .get();
  
  const bottlenecks = {};
  longWaits.forEach(doc => {
    const data = doc.data();
    const status = data.fromStatus;
    if (!bottlenecks[status]) {
      bottlenecks[status] = { count: 0, totalDays: 0, maxDays: 0 };
    }
    bottlenecks[status].count++;
    bottlenecks[status].totalDays += data.daysInPreviousStatus;
    bottlenecks[status].maxDays = Math.max(bottlenecks[status].maxDays, data.daysInPreviousStatus);
  });
  
  console.log('Bottleneck Statuses (>10 days wait):');
  Object.entries(bottlenecks)
    .sort((a, b) => b[1].totalDays/b[1].count - a[1].totalDays/a[1].count)
    .forEach(([status, stats]) => {
      const avgDays = (stats.totalDays / stats.count).toFixed(1);
      console.log(`- ${status}: Avg ${avgDays} days (Max: ${stats.maxDays} days)`);
    });
  
  // Query 3: Daily Progress Tracking
  console.log('\n\n📅 3. DAILY PROGRESS TRACKING');
  console.log('Status changes by day for last week of June...\n');
  
  const dates = ['2025-06-23', '2025-06-24', '2025-06-25', '2025-06-26', '2025-06-27'];
  
  for (const date of dates) {
    const dayChanges = await db.collection('vf-onemap-status-changes')
      .where('changeDate', '==', date)
      .get();
    
    const statusCounts = {};
    dayChanges.forEach(doc => {
      const status = doc.data().toStatus;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log(`${date}: ${dayChanges.size} total changes`);
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
  }
  
  // Query 4: Specific Pole History
  console.log('\n\n🏗️ 4. POLE HISTORY TRACKING');
  console.log('Complete history for pole LAW.P.C328...\n');
  
  const poleHistory = await db.collection('vf-onemap-status-changes')
    .where('poleNumber', '==', 'LAW.P.C328')
    .orderBy('changeDate', 'asc')
    .get();
  
  if (!poleHistory.empty) {
    console.log(`Found ${poleHistory.size} status changes for pole LAW.P.C328:`);
    poleHistory.forEach(doc => {
      const data = doc.data();
      console.log(`- [${data.changeDate}] Property ${data.propertyId}: ${data.fromStatus} → ${data.toStatus}`);
    });
  }
  
  // Query 5: Status Transition Patterns
  console.log('\n\n🔄 5. STATUS TRANSITION PATTERNS');
  console.log('Most common status progressions...\n');
  
  const recentTransitions = await db.collection('vf-onemap-status-changes')
    .where('changeDate', '>=', '2025-06-01')
    .limit(500)
    .get();
  
  const transitions = {};
  recentTransitions.forEach(doc => {
    const data = doc.data();
    const key = `${data.fromStatus} → ${data.toStatus}`;
    transitions[key] = (transitions[key] || 0) + 1;
  });
  
  console.log('Top 10 Status Transitions:');
  Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([transition, count], index) => {
      console.log(`${index + 1}. ${transition}: ${count} times`);
    });
  
  // Query 6: Properties with Multiple Status Changes
  console.log('\n\n🔍 6. ACTIVE PROPERTIES ANALYSIS');
  console.log('Properties with most status changes...\n');
  
  const allChanges = await db.collection('vf-onemap-status-changes').get();
  const propertyChangeCounts = {};
  
  allChanges.forEach(doc => {
    const propertyId = doc.data().propertyId;
    propertyChangeCounts[propertyId] = (propertyChangeCounts[propertyId] || 0) + 1;
  });
  
  const activeProperties = Object.entries(propertyChangeCounts)
    .filter(([_, count]) => count > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  console.log('Most Active Properties:');
  for (const [propertyId, changeCount] of activeProperties) {
    // Get details for this property
    const propChanges = await db.collection('vf-onemap-status-changes')
      .where('propertyId', '==', propertyId)
      .orderBy('changeDate', 'asc')
      .get();
    
    const statuses = [];
    propChanges.forEach(doc => {
      statuses.push(doc.data().toStatus);
    });
    
    console.log(`Property ${propertyId}: ${changeCount} changes`);
    console.log(`  Journey: ${statuses.join(' → ')}`);
  }
  
  console.log('\n' + '=' * 50);
  console.log('✨ Complex queries demonstration complete!');
}

// Run the demo
runComplexQueries()
  .then(() => process.exit())
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });