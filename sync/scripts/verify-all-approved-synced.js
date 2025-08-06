#!/usr/bin/env node

/**
 * Comprehensive verification that ALL approved poles were synced
 * Date: 2025/08/01
 */

const admin = require('firebase-admin');

const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/vf-onemap-data-key.json')
  ),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

async function verifyAllApprovedPolesSynced() {
  console.log('🔍 VERIFICATION: Did we sync ALL approved poles?');
  console.log('='.repeat(60));
  
  // Get all synced poles from production
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => syncedPoleNumbers.add(doc.id));
  
  console.log('✅ Production synced poles:', syncedPoleNumbers.size);
  
  // Get ALL approved poles from staging (no limit)
  let allApprovedRecords = [];
  let lastDoc = null;
  let hasMore = true;
  
  console.log('\n📥 Fetching ALL approved records from staging...');
  
  while (hasMore) {
    let query = stagingDb
      .collection('vf-onemap-processed-records')
      .where('status', '==', 'Pole Permission: Approved')
      .limit(1000);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
    } else {
      snapshot.forEach(doc => {
        allApprovedRecords.push({ id: doc.id, ...doc.data() });
      });
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      console.log('  Fetched batch, total so far:', allApprovedRecords.length);
    }
  }
  
  console.log('\n📊 STAGING ANALYSIS:');
  console.log('- Total approved records found:', allApprovedRecords.length);
  
  // Group by pole number
  const approvedPoleGroups = {};
  let recordsWithoutPoles = 0;
  
  allApprovedRecords.forEach(record => {
    const poleNumber = record.poleNumber;
    if (poleNumber && poleNumber.trim() !== '') {
      if (!approvedPoleGroups[poleNumber]) {
        approvedPoleGroups[poleNumber] = [];
      }
      approvedPoleGroups[poleNumber].push(record);
    } else {
      recordsWithoutPoles++;
    }
  });
  
  const uniqueApprovedPoles = Object.keys(approvedPoleGroups);
  console.log('- Unique approved poles in staging:', uniqueApprovedPoles.length);
  console.log('- Records without pole numbers:', recordsWithoutPoles);
  
  // Check which approved poles are NOT synced
  const unsyncedApprovedPoles = [];
  
  uniqueApprovedPoles.forEach(poleNumber => {
    if (!syncedPoleNumbers.has(poleNumber)) {
      unsyncedApprovedPoles.push(poleNumber);
    }
  });
  
  console.log('\n🎯 VERIFICATION RESULTS:');
  console.log('- Approved poles in staging:', uniqueApprovedPoles.length);
  console.log('- Synced to production:', syncedPoleNumbers.size);
  console.log('- NOT synced:', unsyncedApprovedPoles.length);
  
  if (unsyncedApprovedPoles.length === 0) {
    console.log('\n✅ SUCCESS: ALL approved poles with valid numbers were synced!');
  } else {
    console.log('\n❌ INCOMPLETE: These approved poles were NOT synced:');
    unsyncedApprovedPoles.slice(0, 10).forEach(pole => {
      console.log('  - ' + pole);
    });
    if (unsyncedApprovedPoles.length > 10) {
      console.log('  ... and ' + (unsyncedApprovedPoles.length - 10) + ' more');
    }
    
    // Show details for first few unsynced poles
    console.log('\n📋 Details for unsynced poles:');
    for (let i = 0; i < Math.min(3, unsyncedApprovedPoles.length); i++) {
      const poleNumber = unsyncedApprovedPoles[i];
      const records = approvedPoleGroups[poleNumber];
      console.log(`\n  ${poleNumber}:`);
      console.log(`    - Records: ${records.length}`);
      console.log(`    - Status: ${records[0].status}`);
      console.log(`    - Address: ${records[0].locationAddress || 'No address'}`);
      console.log(`    - Agent: ${records[0].fieldAgentName || 'No agent'}`);
    }
  }
  
  // Additional verification - check sync completeness percentage
  const syncPercentage = ((syncedPoleNumbers.size / uniqueApprovedPoles.length) * 100).toFixed(1);
  console.log('\n📈 SYNC COMPLETENESS: ' + syncPercentage + '%');
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  if (unsyncedApprovedPoles.length === 0) {
    console.log('🎯 FINAL ANSWER: YES - All approved poles were synced successfully!');
  } else {
    console.log('🎯 FINAL ANSWER: NO - ' + unsyncedApprovedPoles.length + ' approved poles still need syncing');
  }
  
  process.exit(0);
}

verifyAllApprovedPolesSynced().catch(error => {
  console.error('❌ Error during verification:', error);
  process.exit(1);
});