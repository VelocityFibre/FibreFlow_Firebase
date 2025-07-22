#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkFinalStatus() {
  console.log('📊 FINAL PRODUCTION DATABASE STATUS\n');
  console.log('=====================================\n');
  
  // Check planned-poles
  const plannedSnapshot = await db.collection('planned-poles')
    .where('projectId', '==', 'Law-001')
    .get();
    
  // Check pole-trackers  
  const trackersSnapshot = await db.collection('pole-trackers')
    .where('projectId', '==', 'Law-001')
    .get();
    
  const totalInProduction = plannedSnapshot.size + trackersSnapshot.size;
  
  // Count by pole status
  let withPoles = 0;
  let pendingAssignment = 0;
  let statusBreakdown = {};
  
  // Process planned-poles
  plannedSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.poleNumber === 'PENDING_ASSIGNMENT') {
      pendingAssignment++;
    } else if (data.poleNumber) {
      withPoles++;
    }
    
    const status = data.status || 'No Status';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  // Process pole-trackers
  trackersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.poleNumber) {
      withPoles++;
    }
    
    const status = data.status || 'Installed';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  console.log(`Total records in production: ${totalInProduction}`);
  console.log(`├─ planned-poles: ${plannedSnapshot.size}`);
  console.log(`└─ pole-trackers: ${trackersSnapshot.size}`);
  
  console.log(`\nPole Assignment Status:`);
  console.log(`├─ With pole numbers: ${withPoles}`);
  console.log(`└─ Pending assignment: ${pendingAssignment}`);
  
  console.log(`\nStatus Distribution:`);
  Object.entries(statusBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  // Compare with staging
  const stagingSnapshot = await db.collection('onemap-processing-staging').get();
  console.log(`\nStaging vs Production:`);
  console.log(`├─ Records in staging: ${stagingSnapshot.size}`);
  console.log(`└─ Records in production: ${totalInProduction}`);
  
  if (stagingSnapshot.size === totalInProduction) {
    console.log(`\n✅ SUCCESS: All ${stagingSnapshot.size} records have been synced to production!`);
  } else {
    console.log(`\n⚠️  Gap: ${stagingSnapshot.size - totalInProduction} records not yet in production`);
  }
  
  process.exit(0);
}

checkFinalStatus().catch(console.error);