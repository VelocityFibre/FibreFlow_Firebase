#!/usr/bin/env node

/**
 * Simple Status Change Queries (No indexes required)
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function runSimpleQueries() {
  console.log('📊 Status Changes Simple Queries\n');
  
  // 1. Get total count
  const allChanges = await db.collection('vf-onemap-status-changes').get();
  console.log(`✅ Total status changes in database: ${allChanges.size}\n`);
  
  // 2. Get changes for June 23
  console.log('📅 Status changes on June 23, 2025:');
  const june23 = await db.collection('vf-onemap-status-changes')
    .where('changeDate', '==', '2025-06-23')
    .get();
  console.log(`   Found ${june23.size} changes\n`);
  
  // 3. Show sample status transitions
  console.log('📊 Sample Status Transitions:');
  const transitions = {};
  let sampleCount = 0;
  
  allChanges.forEach(doc => {
    if (sampleCount < 100) { // Just sample first 100
      const data = doc.data();
      const key = `${data.fromStatus} → ${data.toStatus}`;
      transitions[key] = (transitions[key] || 0) + 1;
      sampleCount++;
    }
  });
  
  Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([transition, count]) => {
      console.log(`   ${transition}: ${count} times`);
    });
  
  // 4. Show properties with longest time in status
  console.log('\n⏱️ Properties with longest time in previous status:');
  const longWaits = [];
  
  allChanges.forEach(doc => {
    const data = doc.data();
    if (data.daysInPreviousStatus && data.daysInPreviousStatus > 0) {
      longWaits.push({
        propertyId: data.propertyId,
        days: data.daysInPreviousStatus,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        date: data.changeDate
      });
    }
  });
  
  longWaits
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)
    .forEach(item => {
      console.log(`   Property ${item.propertyId}: ${item.days} days in "${item.fromStatus}"`);
    });
  
  // 5. Show recent changes
  console.log('\n🕐 Sample Recent Status Changes:');
  const recentChanges = [];
  
  allChanges.forEach(doc => {
    const data = doc.data();
    if (data.changeDate >= '2025-06-20') {
      recentChanges.push({
        propertyId: data.propertyId,
        change: `${data.fromStatus} → ${data.toStatus}`,
        date: data.changeDate,
        agent: data.agent
      });
    }
  });
  
  recentChanges
    .slice(0, 10)
    .forEach(change => {
      console.log(`   [${change.date}] Property ${change.propertyId}: ${change.change} (Agent: ${change.agent})`);
    });
  
  // 6. Status distribution
  console.log('\n📊 Current Status Distribution (based on latest changes):');
  const latestStatuses = {};
  
  allChanges.forEach(doc => {
    const data = doc.data();
    if (data.isLatestStatus) {
      const status = data.toStatus || 'No Status';
      latestStatuses[status] = (latestStatuses[status] || 0) + 1;
    }
  });
  
  Object.entries(latestStatuses)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  
  console.log('\n✅ Queries complete!');
  console.log('\n💡 Note: For more complex queries (by agent, date ranges, etc.),');
  console.log('   create indexes in Firebase Console as prompted.');
}

// Run
runSimpleQueries()
  .then(() => process.exit())
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });