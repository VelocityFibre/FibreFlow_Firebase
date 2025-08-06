#!/usr/bin/env node

/**
 * Continue Approved Poles Sync - Handles timeouts gracefully
 * Continues from where previous sync left off
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

async function getRemainingApprovedPoles() {
  console.log('🔍 Finding remaining approved poles to sync...\n');
  
  // Get already synced poles
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => syncedPoleNumbers.add(doc.id));
  
  console.log(`✅ Already synced: ${syncedPoleNumbers.size} poles`);
  
  // Get approved poles that are NOT yet synced
  const approvedSnapshot = await stagingDb
    .collection('vf-onemap-processed-records')
    .where('status', '==', 'Pole Permission: Approved')
    .limit(500)  // Smaller batch to avoid timeout
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
  
  console.log(`📊 From this batch:`);
  console.log(`- Found to sync: ${foundCount} records (${Object.keys(poleGroups).length} unique poles)`);
  console.log(`- Already synced: ${skippedCount} records`);
  
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

async function continueSyncApprovedPoles() {
  console.log('🔄 CONTINUING APPROVED POLES SYNC');
  console.log('Date: 2025/08/01');
  console.log('='.repeat(50));
  
  try {
    const poleGroups = await getRemainingApprovedPoles();
    const poleNumbers = Object.keys(poleGroups);
    
    if (poleNumbers.length === 0) {
      console.log('✅ No more approved poles to sync in this batch!');
      console.log('🔄 Run this script again to check for more...');
      return;
    }
    
    console.log(`\n🎯 SYNCING: ${poleNumbers.length} poles in this run`);
    
    let syncedCount = 0;
    let historyCount = 0;
    
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
        historyCount++;
      }
      
      await batch.commit();
      
      // Progress update
      if (syncedCount % 25 === 0) {
        console.log(`   📊 Progress: ${syncedCount}/${poleNumbers.length} poles synced`);
      }
    }
    
    // Get current totals
    const finalSyncedCount = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ BATCH SYNC COMPLETE!');
    console.log(`📊 This run: ${syncedCount} poles, ${historyCount} history entries`);
    console.log(`📈 Total synced from OneMap: ${finalSyncedCount.data().count} poles`);
    console.log(`⏰ Completed at: ${new Date().toLocaleString()}`);
    
    // Check if we need to continue
    const remainingCheck = await getRemainingApprovedPoles();
    const remainingCount = Object.keys(remainingCheck).length;
    
    if (remainingCount > 0) {
      console.log(`\n🔄 MORE TO SYNC: ~${remainingCount} poles remaining in next batch`);
      console.log(`💡 Run: node continue-approved-sync.js`);
    } else {
      console.log(`\n🎯 SYNC MAY BE COMPLETE! Verify with verification script.`);
    }
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

// Run continuation sync
continueSyncApprovedPoles().then(() => {
  console.log('\n✅ Sync batch completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});