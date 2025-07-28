#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize both databases
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

async function checkProgress() {
  console.log('🔍 Sync Progress Check - ' + new Date().toLocaleString());
  console.log('═'.repeat(60));
  
  // Get already synced
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => {
    syncedPoleNumbers.add(doc.id);
  });
  
  console.log('✅ Already synced:', syncedPoleNumbers.size, 'poles');
  
  // Check staging for unsynced
  const stagingSnapshot = await stagingDb
    .collection('vf-onemap-processed-records')
    .limit(500)
    .get();
  
  let unsyncedCount = 0;
  let noPoleCount = 0;
  const unsyncedSamples = [];
  
  stagingSnapshot.forEach(doc => {
    const data = doc.data();
    const poleNumber = data.poleNumber;
    
    if (!poleNumber || poleNumber === '') {
      noPoleCount++;
    } else if (!syncedPoleNumbers.has(poleNumber)) {
      unsyncedCount++;
      if (unsyncedSamples.length < 10) {
        unsyncedSamples.push(poleNumber);
      }
    }
  });
  
  console.log('\n📊 From first 500 staging records:');
  console.log('  - Already synced:', 500 - unsyncedCount - noPoleCount);
  console.log('  - Still to sync:', unsyncedCount);
  console.log('  - No pole number:', noPoleCount);
  
  if (unsyncedSamples.length > 0) {
    console.log('\n📍 Sample unsynced poles:', unsyncedSamples.join(', '));
  }
  
  // Production count
  const prodCount = await productionDb.collection('planned-poles').count().get();
  console.log('\n📈 Production total:', prodCount.data().count, 'poles');
  console.log('📈 Expected final:', 7247 + 175, 'poles');
  console.log('📈 Still to sync:', 7247 + 175 - prodCount.data().count, 'poles');
}

checkProgress().then(() => process.exit(0)).catch(console.error);