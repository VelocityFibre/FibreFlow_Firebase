#!/usr/bin/env node

/**
 * Confirm this is LIVE production data
 * Shows exact Firebase paths and URLs
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for PRODUCTION
const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'  // PRODUCTION PROJECT
}, 'production');

const productionDb = productionApp.firestore();

async function confirmLiveData() {
  console.log('🔴 CONFIRMING THIS IS LIVE PRODUCTION DATA\n');
  console.log('═'.repeat(70));
  
  // Show Firebase project details
  console.log('FIREBASE PROJECT DETAILS:');
  console.log('Project ID: fibreflow-73daf');
  console.log('Web App URL: https://fibreflow-73daf.web.app');
  console.log('Console URL: https://console.firebase.google.com/project/fibreflow-73daf');
  console.log('═'.repeat(70));
  
  // Get the exact document
  const poleDoc = await productionDb
    .collection('planned-poles')  // PRODUCTION COLLECTION
    .doc('LAW.P.C654')
    .get();
  
  console.log('\n📍 LIVE DOCUMENT PATH:');
  console.log(`Database: fibreflow-73daf (PRODUCTION)`);
  console.log(`Collection: planned-poles`);
  console.log(`Document: LAW.P.C654`);
  console.log(`Full Path: /planned-poles/LAW.P.C654`);
  
  if (poleDoc.exists) {
    const data = poleDoc.data();
    console.log('\n✅ DOCUMENT EXISTS IN PRODUCTION!');
    console.log(`Last Synced: ${data.lastSyncDate?.toDate()}`);
    console.log(`Current Status: ${data.importStatus}`);
    
    // Check subcollection
    const historyCount = await productionDb
      .collection('planned-poles')
      .doc('LAW.P.C654')
      .collection('statusHistory')
      .count()
      .get();
    
    console.log(`\n📜 STATUS HISTORY SUBCOLLECTION:`);
    console.log(`Path: /planned-poles/LAW.P.C654/statusHistory`);
    console.log(`Documents: ${historyCount.data().count}`);
  }
  
  // Show how to verify in Firebase Console
  console.log('\n\n🔍 TO VERIFY YOURSELF:');
  console.log('1. Go to: https://console.firebase.google.com/project/fibreflow-73daf/firestore');
  console.log('2. Navigate to: planned-poles → LAW.P.C654');
  console.log('3. Click on "statusHistory" subcollection');
  console.log('4. You\'ll see the exact same data!\n');
  
  console.log('🌐 THIS IS YOUR LIVE PRODUCTION FIBREFLOW DATABASE! 🌐');
}

// Run confirmation
confirmLiveData().then(() => {
  console.log('\n✨ Live data confirmation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});