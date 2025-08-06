#!/usr/bin/env node

/**
 * Efficient Continue Sync - Process larger batches faster
 * Continues until all approved poles are synced
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

// Field mappings
const fieldMappings = {
  "poleNumber": "poleNumber",
  "latitude": "location.latitude",      
  "longitude": "location.longitude",    
  "locationAddress": "address",
  "pons": "ponNumber",
  "sections": "zoneNumber",
  "site": "projectName",
  "status": "importStatus",
  "flowNameGroups": "workflowGroup",
  "propertyId": "propertyId",
  "lastModifiedDate": "lastModifiedInOnemap",
  "dateStatusChanged": "statusChangeDate",
  "dropNumber": "dropNumber",
  "fieldAgentName": "fieldAgent"
};

async function getUnsyncedBatch() {
  // Get already synced poles  
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => syncedPoleNumbers.add(doc.id));
  
  console.log(`✅ Already synced: ${syncedPoleNumbers.size} poles`);
  
  // Get next batch of approved poles using offset
  const BATCH_SIZE = 200;  // Larger batch for efficiency
  const OFFSET = Math.floor(syncedPoleNumbers.size / 200) * 200;  // Calculate offset
  
  console.log(`📦 Fetching batch starting from offset ${OFFSET}...`);
  
  const approvedSnapshot = await stagingDb
    .collection('vf-onemap-processed-records')
    .where('status', '==', 'Pole Permission: Approved')
    .limit(BATCH_SIZE)
    .offset(OFFSET)
    .get();
  
  const poleGroups = {};
  let foundCount = 0;
  let skippedCount = 0;
  
  approvedSnapshot.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    const poleNumber = data.poleNumber;
    
    if (poleNumber && poleNumber.trim() !== '') {
      if (!syncedPoleNumbers.has(poleNumber)) {
        foundCount++;
        if (!poleGroups[poleNumber]) {
          poleGroups[poleNumber] = [];
        }
        poleGroups[poleNumber].push(data);
      } else {
        skippedCount++;
      }
    }
  });
  
  console.log(`📊 Batch results: ${foundCount} to sync, ${skippedCount} already synced`);
  
  return poleGroups;
}

async function createStatusHistoryEntry(record) {
  return {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: record.status,
    propertyId: record.propertyId,
    fieldAgent: record.fieldAgentName || null,
    locationAddress: record.locationAddress,
    dateStatusChanged: record.dateStatusChanged || null,
    lastModifiedDate: record.lastModifiedDate || null,
    flowNameGroups: record.flowNameGroups || null,
    syncedFrom: 'vf-onemap-data',
    stagingDocId: record.id,
    newStatus: record.status,
    previousStatus: null
  };
}

async function efficientContinueSync() {
  console.log('⚡ EFFICIENT CONTINUE SYNC');
  console.log('Date: 2025/08/01');
  console.log('='.repeat(50));
  
  try {
    const poleGroups = await getUnsyncedBatch();
    const poleNumbers = Object.keys(poleGroups);
    
    if (poleNumbers.length === 0) {
      console.log('\n🎯 NO MORE POLES IN THIS BATCH!');
      
      // Quick verification
      const totalSynced = await productionDb
        .collection('planned-poles')
        .where('lastSyncedFrom', '==', 'vf-onemap-data')
        .count()
        .get();
      
      console.log(`📈 Total synced so far: ${totalSynced.data().count} poles`);
      
      if (totalSynced.data().count >= 3600) {
        console.log('🎯 SYNC LIKELY COMPLETE! Run verification script.');
      } else {
        console.log('🔄 More poles likely remain. Try different offset approach.');
      }
      
      return;
    }
    
    console.log(`\n🎯 SYNCING: ${poleNumbers.length} poles in this batch`);
    
    let syncedCount = 0;
    let historyCount = 0;
    const startTime = Date.now();
    
    // Process poles
    for (const poleNumber of poleNumbers) {
      const records = poleGroups[poleNumber];
      
      // Get latest record
      const latestRecord = records.sort((a, b) => {
        const dateA = a.lastModifiedDate || a.dateStatusChanged || '0';
        const dateB = b.lastModifiedDate || b.dateStatusChanged || '0';
        return dateB.localeCompare(dateA);
      })[0];
      
      // Map fields
      const mappedData = {};
      for (const [source, target] of Object.entries(fieldMappings)) {
        if (latestRecord[source] !== undefined && latestRecord[source] !== null) {
          if (target.includes('.')) {
            const [parent, child] = target.split('.');
            if (!mappedData[parent]) mappedData[parent] = {};
            mappedData[parent][child] = source.includes('itude') ? 
              parseFloat(latestRecord[source]) : latestRecord[source];
          } else {
            mappedData[target] = latestRecord[source];
          }
        }
      }
      
      // Add sync metadata
      mappedData.poleNumber = poleNumber;
      mappedData.lastSyncedFrom = 'vf-onemap-data';
      mappedData.lastSyncDate = admin.firestore.FieldValue.serverTimestamp();
      mappedData.totalStatusRecords = records.length;
      
      // Create or update pole
      await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .set(mappedData, { merge: true });
      
      syncedCount++;
      
      // Add status history in batch
      const batch = productionDb.batch();
      
      for (const record of records) {
        const historyEntry = await createStatusHistoryEntry(record);
        const historyId = `${record.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const historyRef = productionDb
          .collection('planned-poles')
          .doc(poleNumber)
          .collection('statusHistory')
          .doc(historyId);
        
        batch.set(historyRef, historyEntry);
        historyCount++;
      }
      
      await batch.commit();
      
      // Progress update
      if (syncedCount % 25 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   📊 Progress: ${syncedCount}/${poleNumbers.length} poles (${elapsed}s)`);
      }
    }
    
    // Get final totals
    const finalSyncedCount = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ BATCH COMPLETE!');
    console.log(`📊 This batch: ${syncedCount} poles, ${historyCount} history entries`);
    console.log(`📈 Total OneMap poles: ${finalSyncedCount.data().count}`);
    console.log(`⏱️  Batch time: ${elapsed} seconds`);
    console.log(`⏰ Completed: ${new Date().toLocaleString()}`);
    
    // Progress estimate
    const remainingEstimate = 3633 - finalSyncedCount.data().count;
    if (remainingEstimate > 0) {
      console.log(`🔄 Estimated remaining: ~${remainingEstimate} poles`);
      console.log(`💡 Run: node efficient-continue-sync.js`);
    } else {
      console.log(`🎯 SYNC COMPLETE! Run verification to confirm.`);
    }
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

// Run efficient sync
efficientContinueSync().then(() => {
  console.log('\n✅ Efficient batch completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});