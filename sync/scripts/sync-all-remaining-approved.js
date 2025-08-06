#!/usr/bin/env node

/**
 * Sync ALL Remaining Approved Poles - Comprehensive Sync
 * Uses pagination to get ALL remaining approved poles
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

async function getAllRemainingApprovedPoles() {
  console.log('🔍 Finding ALL remaining approved poles...\n');
  
  // Get already synced poles
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => syncedPoleNumbers.add(doc.id));
  
  console.log(`✅ Already synced: ${syncedPoleNumbers.size} poles`);
  
  // Get ALL remaining approved poles with pagination
  let allRemainingRecords = [];
  let lastDoc = null;
  let hasMore = true;
  let batchCount = 0;
  
  console.log('📥 Fetching ALL remaining approved poles...');
  
  while (hasMore) {
    batchCount++;
    console.log(`  📦 Fetching batch ${batchCount}...`);
    
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
      let foundInBatch = 0;
      let skippedInBatch = 0;
      
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        const poleNumber = data.poleNumber;
        
        if (poleNumber && poleNumber.trim() !== '') {
          if (!syncedPoleNumbers.has(poleNumber)) {
            allRemainingRecords.push(data);
            foundInBatch++;
          } else {
            skippedInBatch++;
          }
        }
      });
      
      console.log(`     Found: ${foundInBatch} to sync, Skipped: ${skippedInBatch} already synced`);
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
  }
  
  console.log(`\n📊 REMAINING APPROVED POLES ANALYSIS:`);
  console.log(`- Total remaining records: ${allRemainingRecords.length}`);
  
  // Group by pole number
  const poleGroups = {};
  allRemainingRecords.forEach(record => {
    const poleNumber = record.poleNumber;
    if (!poleGroups[poleNumber]) {
      poleGroups[poleNumber] = [];
    }
    poleGroups[poleNumber].push(record);
  });
  
  console.log(`- Unique remaining poles: ${Object.keys(poleGroups).length}`);
  
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

async function syncAllRemainingApprovedPoles() {
  console.log('🚀 SYNCING ALL REMAINING APPROVED POLES');
  console.log('Date: 2025/08/01');
  console.log('='.repeat(60));
  
  try {
    const poleGroups = await getAllRemainingApprovedPoles();
    const poleNumbers = Object.keys(poleGroups);
    
    if (poleNumbers.length === 0) {
      console.log('\n🎯 ALL APPROVED POLES ARE ALREADY SYNCED!');
      return;
    }
    
    console.log(`\n🎯 SYNC TARGET: ${poleNumbers.length} remaining unique poles`);
    
    // Process in smaller batches
    const BATCH_SIZE = 50;  // Smaller batches for reliability
    const totalBatches = Math.ceil(poleNumbers.length / BATCH_SIZE);
    
    console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} poles each\n`);
    
    let totalSynced = 0;
    let totalHistoryEntries = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, poleNumbers.length);
      const batchPoles = poleNumbers.slice(startIndex, endIndex);
      
      console.log(`\n🔄 BATCH ${batchIndex + 1}/${totalBatches}: Processing poles ${startIndex + 1}-${endIndex}`);
      console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
      
      let batchSynced = 0;
      let batchHistoryEntries = 0;
      
      for (const poleNumber of batchPoles) {
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
        
        batchSynced++;
        
        // Add status history
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
          batchHistoryEntries++;
        }
        
        await batch.commit();
        
        // Progress update
        if (batchSynced % 10 === 0) {
          console.log(`   📊 Batch: ${batchSynced}/${batchPoles.length} poles`);
        }
      }
      
      totalSynced += batchSynced;
      totalHistoryEntries += batchHistoryEntries;
      
      console.log(`✅ BATCH COMPLETE: ${batchSynced} poles, ${batchHistoryEntries} history entries`);
      console.log(`📈 Running total: ${totalSynced}/${poleNumbers.length} poles synced`);
      console.log(`⏰ Completed: ${new Date().toLocaleTimeString()}`);
      
      // Brief pause between batches
      if (batchIndex < totalBatches - 1) {
        console.log(`   ⏸️  Pausing 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final count
    const finalSyncedCount = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    const totalProductionCount = await productionDb
      .collection('planned-poles')
      .count()
      .get();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ALL REMAINING APPROVED POLES SYNCED!');
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   - Poles synced this run: ${totalSynced}`);
    console.log(`   - History entries created: ${totalHistoryEntries}`);
    console.log(`   - Total OneMap poles in production: ${finalSyncedCount.data().count}`);
    console.log(`   - Total production poles: ${totalProductionCount.data().count}`);
    console.log(`   - Completion time: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

// Run sync
syncAllRemainingApprovedPoles().then(() => {
  console.log('\n✅ All remaining approved poles sync completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});