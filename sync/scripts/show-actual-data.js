#!/usr/bin/env node

/**
 * Show Actual Data from Production
 * Confirms database location and shows real examples with status history
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for production
const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const productionDb = productionApp.firestore();

async function showActualData() {
  console.log('🔍 CONFIRMING DATABASE AND SHOWING ACTUAL DATA\n');
  console.log('═'.repeat(70));
  console.log('DATABASE: fibreflow-73daf (PRODUCTION)');
  console.log('PROJECT URL: https://console.firebase.google.com/project/fibreflow-73daf');
  console.log('═'.repeat(70));
  
  try {
    // Show example 1: Pole with multiple statuses
    console.log('\n📍 EXAMPLE 1: Pole with Multiple Status Changes');
    console.log('─'.repeat(70));
    
    const pole1 = await productionDb
      .collection('planned-poles')
      .doc('LAW.P.C654')
      .get();
    
    if (pole1.exists) {
      const data = pole1.data();
      console.log('\nPOLE DOCUMENT DATA:');
      console.log(`Collection: planned-poles`);
      console.log(`Document ID: ${pole1.id}`);
      console.log('\nActual Field Values:');
      console.log(JSON.stringify({
        poleNumber: data.poleNumber,
        address: data.address,
        location: data.location,
        ponNumber: data.ponNumber,
        zoneNumber: data.zoneNumber,
        projectName: data.projectName,
        importStatus: data.importStatus,
        workflowGroup: data.workflowGroup,
        propertyId: data.propertyId,
        fieldAgent: data.fieldAgent,
        dropNumber: data.dropNumber,
        totalStatusRecords: data.totalStatusRecords,
        lastSyncedFrom: data.lastSyncedFrom,
        lastSyncDate: data.lastSyncDate?.toDate(),
        stagingDocId: data.stagingDocId
      }, null, 2));
      
      // Get status history
      console.log('\n📜 STATUS HISTORY SUBCOLLECTION:');
      const history = await productionDb
        .collection('planned-poles')
        .doc('LAW.P.C654')
        .collection('statusHistory')
        .orderBy('timestamp', 'desc')
        .get();
      
      console.log(`Path: planned-poles/LAW.P.C654/statusHistory`);
      console.log(`Total history entries: ${history.size}\n`);
      
      history.forEach((doc, index) => {
        const histData = doc.data();
        console.log(`HISTORY ENTRY ${index + 1}:`);
        console.log(`Document ID: ${doc.id}`);
        console.log(JSON.stringify({
          status: histData.status,
          fieldAgent: histData.fieldAgent,
          propertyId: histData.propertyId,
          dropNumber: histData.dropNumber,
          timestamp: histData.timestamp?.toDate(),
          lastModifiedInOnemap: histData.lastModifiedInOnemap,
          source: histData.source,
          stagingDocId: histData.stagingDocId
        }, null, 2));
        console.log('');
      });
    }
    
    // Show example 2: Simple pole
    console.log('\n📍 EXAMPLE 2: Standard Pole (Single Status)');
    console.log('─'.repeat(70));
    
    const pole2 = await productionDb
      .collection('planned-poles')
      .doc('LAW.P.C442')
      .get();
    
    if (pole2.exists) {
      const data = pole2.data();
      console.log('\nPOLE DOCUMENT DATA:');
      console.log(`Collection: planned-poles`);
      console.log(`Document ID: ${pole2.id}`);
      console.log('\nKey Fields:');
      console.log(`- Pole Number: ${data.poleNumber}`);
      console.log(`- Address: ${data.address}`);
      console.log(`- GPS: Lat ${data.location?.latitude}, Lon ${data.location?.longitude}`);
      console.log(`- Status: ${data.importStatus}`);
      console.log(`- PON: ${data.ponNumber}`);
      console.log(`- Zone: ${data.zoneNumber}`);
      console.log(`- Last Sync: ${data.lastSyncDate?.toDate()}`);
    }
    
    // Show database statistics
    console.log('\n📊 DATABASE STATISTICS');
    console.log('─'.repeat(70));
    
    const totalPoles = await productionDb
      .collection('planned-poles')
      .count()
      .get();
    
    const syncedToday = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    console.log(`Total poles in production: ${totalPoles.data().count}`);
    console.log(`Poles synced from vf-onemap-data: ${syncedToday.data().count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
showActualData().then(() => {
  console.log('\n✨ Data confirmation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});