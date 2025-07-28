#!/usr/bin/env node

/**
 * Simple Verification of Last Sync
 * Checks specific poles that were synced
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

async function verifyLastSync() {
  console.log('🔍 Verifying Last Sync Results\n');
  
  // List of poles we know were synced (from the report)
  const syncedPoles = [
    'LAW.P.C654', 'LAW.P.C442', 'LAW.P.C443', 'LAW.P.C405',
    'LAW.P.C450', 'LAW.P.C449', 'LAW.P.C653', 'LAW.P.C652',
    'LAW.P.C328', 'LAW.P.A019', 'LAW.P.A020', 'LAW.P.A029'
  ];
  
  console.log(`Checking ${syncedPoles.length} sample poles from last sync:\n`);
  
  for (const poleNumber of syncedPoles) {
    const doc = await productionDb
      .collection('planned-poles')
      .doc(poleNumber)
      .get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log(`✅ ${poleNumber}`);
      console.log(`   Status: ${data.importStatus}`);
      console.log(`   Project: ${data.projectName}`);
      console.log(`   Last Sync: ${data.lastSyncDate?.toDate().toLocaleString() || 'Unknown'}`);
      console.log(`   Status Records: ${data.totalStatusRecords || 1}`);
      
      // Check for status history
      const history = await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .collection('statusHistory')
        .get();
      
      if (!history.empty) {
        console.log(`   📜 Has ${history.size} history entries`);
      }
      console.log('');
    } else {
      console.log(`❌ ${poleNumber} - Not found`);
    }
  }
  
  console.log('\n📊 Summary from Last Sync Report:');
  console.log('   - Total poles synced: 36');
  console.log('   - Status history entries: 38');
  console.log('   - Poles with multiple statuses: 2');
  console.log('     • LAW.P.C654 (2 statuses)');
  console.log('     • LAW.P.C328 (2 statuses)');
}

// Run verification
verifyLastSync().then(() => {
  console.log('\n✨ Verification completed!');
  console.log('\n💡 To see full status history for a pole:');
  console.log('   node scripts/verify-status-history.js');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});