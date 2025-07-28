#!/usr/bin/env node

/**
 * Sync Remaining Poles
 * Continues sync from where it left off
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
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

async function getUnsyncedPoles() {
  console.log('🔍 Finding unsynced poles...\n');
  
  // Get already synced poles
  const syncedSnapshot = await productionDb
    .collection('planned-poles')
    .where('lastSyncedFrom', '==', 'vf-onemap-data')
    .get();
  
  const syncedPoleNumbers = new Set();
  syncedSnapshot.forEach(doc => {
    syncedPoleNumbers.add(doc.id);
  });
  
  console.log(`✅ Already synced: ${syncedPoleNumbers.size} poles`);
  
  // Get ALL staging records with pole numbers
  const stagingSnapshot = await stagingDb
    .collection('vf-onemap-processed-records')
    .where('poleNumber', '!=', '')
    .limit(1000)
    .get();
  
  // Filter out already synced
  const unsyncedRecords = [];
  const poleGroups = {};
  
  stagingSnapshot.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    const poleNumber = data.poleNumber;
    
    if (poleNumber && !syncedPoleNumbers.has(poleNumber)) {
      unsyncedRecords.push(data);
      
      if (!poleGroups[poleNumber]) {
        poleGroups[poleNumber] = [];
      }
      poleGroups[poleNumber].push(data);
    }
  });
  
  console.log(`📊 Found ${Object.keys(poleGroups).length} poles to sync`);
  console.log(`📄 Total records to process: ${unsyncedRecords.length}\n`);
  
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

async function syncRemainingPoles() {
  console.log('🚀 Starting Sync of Remaining Poles\n');
  console.log('Date: 2025/08/01\n');
  
  try {
    const poleGroups = await getUnsyncedPoles();
    const poleNumbers = Object.keys(poleGroups);
    
    if (poleNumbers.length === 0) {
      console.log('✅ All poles are already synced!');
      return;
    }
    
    // Show poles with multiple records
    const duplicates = poleNumbers.filter(pole => poleGroups[pole].length > 1);
    if (duplicates.length > 0) {
      console.log(`📊 Poles with multiple records (status changes):`);
      duplicates.forEach(pole => {
        console.log(`   ${pole}: ${poleGroups[pole].length} records`);
      });
      console.log('');
    }
    
    // Sync each pole
    console.log('🔄 Syncing poles with history tracking...\n');
    
    let syncedCount = 0;
    let historyCount = 0;
    
    for (const poleNumber of poleNumbers) {
      const records = poleGroups[poleNumber];
      
      // Determine latest record
      const latestRecord = records.sort((a, b) => {
        const dateA = a.lastModifiedDate || a.dateStatusChanged || '0';
        const dateB = b.lastModifiedDate || b.dateStatusChanged || '0';
        return dateB.localeCompare(dateA);
      })[0];
      
      // Check if pole exists in production
      const existingDoc = await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .get();
      
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
      
      // Update or create pole
      await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .set(mappedData, { merge: true });
      
      syncedCount++;
      
      // Add status history
      const batch = productionDb.batch();
      
      for (const record of records) {
        const historyEntry = await createStatusHistoryEntry(record);
        
        if (existingDoc.exists) {
          historyEntry.previousStatus = existingDoc.data().importStatus || null;
        }
        
        const historyId = `${record.id}_${Date.now()}`;
        const historyRef = productionDb
          .collection('planned-poles')
          .doc(poleNumber)
          .collection('statusHistory')
          .doc(historyId);
        
        batch.set(historyRef, historyEntry);
        historyCount++;
      }
      
      await batch.commit();
      
      console.log(`✓ ${poleNumber}: Synced with ${records.length} status history entries`);
      
      // Progress update every 10 poles
      if (syncedCount % 10 === 0) {
        console.log(`   📊 Progress: ${syncedCount}/${poleNumbers.length} poles synced`);
      }
    }
    
    // Final summary
    console.log('\n' + '═'.repeat(80));
    console.log('✨ SYNC COMPLETED SUCCESSFULLY!');
    console.log(`📊 Total poles synced: ${syncedCount}`);
    console.log(`📜 Status history entries created: ${historyCount}`);
    console.log(`🕐 Completed at: ${new Date().toLocaleString()}`);
    
    // Check final production count
    const finalCount = await productionDb.collection('planned-poles').count().get();
    console.log(`\n📈 Final production poles: ${finalCount.data().count}`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
}

// Run sync
syncRemainingPoles().then(() => {
  console.log('\n✅ Sync process completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});