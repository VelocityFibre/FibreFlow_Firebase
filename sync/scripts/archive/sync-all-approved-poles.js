#!/usr/bin/env node

/**
 * Sync ALL Approved Poles - Complete Sync
 * Syncs ALL poles with "Pole Permission: Approved" status
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

async function getAllApprovedPoles() {
  console.log('📥 Fetching ALL approved poles from staging...\n');
  
  // Get already synced poles to avoid duplicates
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => syncedPoleNumbers.add(doc.id));
  
  console.log(`✅ Already synced: ${syncedPoleNumbers.size} poles`);
  
  // Get ALL approved records with pagination
  let allApprovedRecords = [];
  let lastDoc = null;
  let hasMore = true;
  let batchCount = 0;
  
  while (hasMore) {
    batchCount++;
    console.log(`📦 Fetching batch ${batchCount}...`);
    
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
      console.log(`✅ Completed fetching. Total batches: ${batchCount - 1}`);
    } else {
      snapshot.forEach(doc => {
        allApprovedRecords.push({ id: doc.id, ...doc.data() });
      });
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      console.log(`   Total records so far: ${allApprovedRecords.length}`);
    }
  }
  
  // Group by pole number and filter out already synced
  const poleGroups = {};
  let skippedAlreadySynced = 0;
  let skippedNoPoleNumber = 0;
  
  allApprovedRecords.forEach(record => {
    const poleNumber = record.poleNumber;
    
    if (!poleNumber || poleNumber.trim() === '') {
      skippedNoPoleNumber++;
      return;
    }
    
    if (syncedPoleNumbers.has(poleNumber)) {
      skippedAlreadySynced++;
      return;
    }
    
    if (!poleGroups[poleNumber]) {
      poleGroups[poleNumber] = [];
    }
    poleGroups[poleNumber].push(record);
  });
  
  console.log(`\n📊 ANALYSIS COMPLETE:`);
  console.log(`- Total approved records: ${allApprovedRecords.length}`);
  console.log(`- Skipped (already synced): ${skippedAlreadySynced}`);
  console.log(`- Skipped (no pole number): ${skippedNoPoleNumber}`);
  console.log(`- Ready to sync: ${Object.keys(poleGroups).length} unique poles\n`);
  
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

async function syncAllApprovedPoles() {
  console.log('🚀 STARTING COMPLETE SYNC OF ALL APPROVED POLES');
  console.log('Date: 2025/08/01');
  console.log('Target: ALL "Pole Permission: Approved" records');
  console.log('='.repeat(80));
  
  try {
    // Get all unsynced approved poles
    const poleGroups = await getUnsynced();
    const poleNumbers = Object.keys(poleGroups);
    
    if (poleNumbers.length === 0) {
      console.log('✅ All approved poles are already synced!');
      return;
    }
    
    console.log(`🎯 SYNC TARGET: ${poleNumbers.length} unique poles to sync`);
    
    // Process in smaller batches to avoid timeouts
    const BATCH_SIZE = 100;  // Process 100 poles at a time
    const totalBatches = Math.ceil(poleNumbers.length / BATCH_SIZE);
    
    console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} poles each\n`);
    
    let totalSynced = 0;
    let totalHistoryEntries = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, poleNumbers.length);
      const batchPoles = poleNumbers.slice(startIndex, endIndex);
      
      console.log(`\n🔄 BATCH ${batchIndex + 1}/${totalBatches}: Processing poles ${startIndex + 1}-${endIndex}`);
      console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);
      
      let batchSynced = 0;
      let batchHistoryEntries = 0;
      
      // Process each pole in the batch
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
        
        // Progress indicator
        if (batchSynced % 25 === 0) {
          console.log(`   📊 Batch progress: ${batchSynced}/${batchPoles.length} poles`);
        }
      }
      
      totalSynced += batchSynced;
      totalHistoryEntries += batchHistoryEntries;
      
      console.log(`✅ BATCH ${batchIndex + 1} COMPLETE:`);
      console.log(`   - Poles synced: ${batchSynced}`);
      console.log(`   - History entries: ${batchHistoryEntries}`);
      console.log(`   - Total synced so far: ${totalSynced}/${poleNumbers.length}`);
      console.log(`   - Completed at: ${new Date().toLocaleTimeString()}`);
      
      // Brief pause between batches to avoid overwhelming Firebase
      if (batchIndex < totalBatches - 1) {
        console.log(`   ⏸️  Pausing 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final verification
    console.log('\n' + '='.repeat(80));
    console.log('✨ COMPLETE SYNC FINISHED!');
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   - Total poles synced: ${totalSynced}`);
    console.log(`   - Status history entries created: ${totalHistoryEntries}`);
    console.log(`   - Completion time: ${new Date().toLocaleString()}`);
    
    // Check final production count
    const finalCount = await productionDb.collection('planned-poles').count().get();
    const syncedCount = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    console.log(`\n📈 PRODUCTION DATABASE STATUS:`);
    console.log(`   - Total poles in production: ${finalCount.data().count}`);
    console.log(`   - Synced from OneMap: ${syncedCount.data().count}`);
    
    console.log('\n🎯 ALL APPROVED POLES SYNC COMPLETE! 🎯');
    
  } catch (error) {
    console.error('❌ Error during complete sync:', error);
    process.exit(1);
  }
}

async function getUnsynced() {
  const poleGroups = await getAllApprovedPoles();
  return poleGroups;
}

// Run complete sync
syncAllApprovedPoles().then(() => {
  console.log('\n✅ Complete approved poles sync finished successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});