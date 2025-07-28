#!/usr/bin/env node

/**
 * Working Complex Query Examples
 * Using indexes that are already created
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function runWorkingQueries() {
  console.log('🔥 Complex Status Change Queries (Working Examples)\n');
  console.log('=' .repeat(60) + '\n');
  
  // Query 1: Agent Performance Over Time
  console.log('📊 1. AGENT PERFORMANCE TIMELINE');
  console.log('Tracking specific agent activity over time...\n');
  
  const nathanActivity = await db.collection('vf-onemap-status-changes')
    .where('agent', '==', 'nathan')
    .orderBy('changeDate', 'desc')
    .limit(10)
    .get();
  
  console.log(`Nathan's Recent Activity (${nathanActivity.size} changes shown):`);
  nathanActivity.forEach(doc => {
    const data = doc.data();
    console.log(`- [${data.changeDate}] Property ${data.propertyId}: ${data.fromStatus} → ${data.toStatus}`);
  });
  
  // Query 2: Status Transition Analysis
  console.log('\n\n🔄 2. SPECIFIC STATUS TRANSITIONS');
  console.log('Finding properties that went from Approved to In Progress...\n');
  
  const transitions = await db.collection('vf-onemap-status-changes')
    .where('fromStatus', '==', 'Home Sign Ups: Approved & Installation Scheduled')
    .where('toStatus', '==', 'Home Installation: In Progress')
    .limit(10)
    .get();
  
  console.log(`Found ${transitions.size} properties with this transition:`);
  transitions.forEach(doc => {
    const data = doc.data();
    console.log(`- Property ${data.propertyId} on ${data.changeDate} (${data.daysInPreviousStatus || 0} days wait)`);
  });
  
  // Query 3: Pole History Timeline
  console.log('\n\n🏗️ 3. COMPLETE POLE TIMELINE');
  console.log('Full history for a specific pole...\n');
  
  const poleHistory = await db.collection('vf-onemap-status-changes')
    .where('poleNumber', '==', 'LAW.P.C518')
    .orderBy('changeDate', 'asc')
    .get();
  
  if (poleHistory.empty) {
    // Try another pole
    const anyPole = await db.collection('vf-onemap-status-changes')
      .where('poleNumber', '!=', '')
      .limit(1)
      .get();
    
    if (!anyPole.empty) {
      const poleNum = anyPole.docs[0].data().poleNumber;
      const altHistory = await db.collection('vf-onemap-status-changes')
        .where('poleNumber', '==', poleNum)
        .orderBy('changeDate', 'asc')
        .get();
      
      console.log(`History for pole ${poleNum}:`);
      altHistory.forEach(doc => {
        const data = doc.data();
        console.log(`- [${data.changeDate}] Property ${data.propertyId}: ${data.toStatus}`);
      });
    }
  } else {
    console.log(`History for pole LAW.P.C518:`);
    poleHistory.forEach(doc => {
      const data = doc.data();
      console.log(`- [${data.changeDate}] Property ${data.propertyId}: ${data.toStatus}`);
    });
  }
  
  // Query 4: Bottleneck Analysis
  console.log('\n\n⏱️ 4. WORKFLOW BOTTLENECKS');
  console.log('Finding longest delays by status...\n');
  
  const longDelays = await db.collection('vf-onemap-status-changes')
    .where('fromStatus', '==', 'Pole Permission: Approved')
    .orderBy('daysInPreviousStatus', 'desc')
    .limit(5)
    .get();
  
  console.log('Properties stuck longest in "Pole Permission: Approved":');
  longDelays.forEach(doc => {
    const data = doc.data();
    console.log(`- Property ${data.propertyId}: ${data.daysInPreviousStatus} days before moving to "${data.toStatus}"`);
  });
  
  // Query 5: Daily Activity Pattern
  console.log('\n\n📅 5. DAILY ACTIVITY ANALYSIS');
  console.log('Changes on specific dates...\n');
  
  const june23 = await db.collection('vf-onemap-status-changes')
    .where('changeDate', '==', '2025-06-23')
    .limit(20)
    .get();
  
  const statusCounts = {};
  const agentCounts = {};
  
  june23.forEach(doc => {
    const data = doc.data();
    statusCounts[data.toStatus] = (statusCounts[data.toStatus] || 0) + 1;
    agentCounts[data.agent || 'No Agent'] = (agentCounts[data.agent || 'No Agent'] || 0) + 1;
  });
  
  console.log(`June 23, 2025 Activity (sample of ${june23.size}):`);
  console.log('\nStatus Changes:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
  
  console.log('\nAgent Activity:');
  Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([agent, count]) => {
      console.log(`  - ${agent}: ${count} changes`);
    });
  
  // Query 6: Recent Activity
  console.log('\n\n🕐 6. MOST RECENT CHANGES');
  console.log('Latest status updates in the system...\n');
  
  const recent = await db.collection('vf-onemap-status-changes')
    .orderBy('importTimestamp', 'desc')
    .limit(10)
    .get();
  
  console.log('Last 10 Status Changes:');
  recent.forEach(doc => {
    const data = doc.data();
    const timestamp = new Date(data.importTimestamp).toLocaleString();
    console.log(`- [${data.changeDate}] Property ${data.propertyId}: ${data.toStatus} (imported ${timestamp})`);
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Complex query examples complete!');
  console.log('\n💡 These queries would be impossible or very slow without the status changes collection!');
}

// Run the demo
runWorkingQueries()
  .then(() => process.exit())
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });