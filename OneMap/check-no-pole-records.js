#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function findRecordsWithoutPoles() {
  console.log('🔍 Checking for records without pole numbers...\n');
  
  const snapshot = await db.collection('onemap-processing-staging').get();
  
  let noPoleRecords = [];
  let alreadySynced = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if pole number is missing or empty
    if (!data.poleNumber || data.poleNumber === '' || data.poleNumber === 'N/A') {
      // Check if already in production
      const plannedPoleDoc = await db.collection('planned-poles').doc(`PROP_${data.propertyId}`).get();
      const poleTrackerDoc = await db.collection('pole-trackers').doc(`PROP_${data.propertyId}`).get();
      
      if (plannedPoleDoc.exists || poleTrackerDoc.exists) {
        alreadySynced.push(data.propertyId);
      } else {
        noPoleRecords.push({
          propertyId: data.propertyId,
          status: data.status || 'No status',
          address: data.address,
          poleNumber: data.poleNumber || 'NONE'
        });
      }
    }
  }
  
  console.log(`Total staging records: ${snapshot.size}`);
  console.log(`Records without pole numbers: ${noPoleRecords.length + alreadySynced.length}`);
  console.log(`- Already synced to production: ${alreadySynced.length}`);
  console.log(`- Need to be synced: ${noPoleRecords.length}`);
  
  if (noPoleRecords.length > 0) {
    console.log('\nFirst 10 records that need syncing:');
    noPoleRecords.slice(0, 10).forEach(record => {
      console.log(`  Property ${record.propertyId}: ${record.status}`);
    });
  }
  
  process.exit(0);
}

findRecordsWithoutPoles().catch(console.error);