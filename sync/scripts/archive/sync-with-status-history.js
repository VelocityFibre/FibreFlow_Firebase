#!/usr/bin/env node

/**
 * Sync with Status History
 * Syncs data while preserving status history for duplicate pole records
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

async function getRecordsGroupedByPole(limit = 20) {
  console.log('\n📥 Fetching records grouped by pole number...');
  
  // Get records from staging
  const snapshot = await stagingDb
    .collection('vf-onemap-processed-records')
    .limit(limit)
    .get();
  
  // Group by pole number
  const poleGroups = {};
  
  snapshot.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    const poleNumber = data.poleNumber;
    
    if (poleNumber && poleNumber !== '') {
      if (!poleGroups[poleNumber]) {
        poleGroups[poleNumber] = [];
      }
      poleGroups[poleNumber].push(data);
    }
  });
  
  return poleGroups;
}

async function determineLatestRecord(records) {
  // Sort by last modified date or status change date
  return records.sort((a, b) => {
    const dateA = a.lastModifiedDate || a.dateStatusChanged || '0';
    const dateB = b.lastModifiedDate || b.dateStatusChanged || '0';
    return dateB.localeCompare(dateA);
  })[0];
}

async function createStatusHistoryEntry(record) {
  return {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: record.status || 'Unknown',
    previousStatus: null, // Will be set if updating existing
    fieldAgent: record.fieldAgentName || 'Unknown',
    propertyId: record.propertyId,
    stagingDocId: record.id,
    lastModifiedInOnemap: record.lastModifiedDate || null,
    dropNumber: record.dropNumber || null,
    source: 'vf-onemap-sync',
    importBatch: record.onemapNadId || null
  };
}

async function syncWithHistory() {
  console.log('🚀 Starting Sync with Status History Tracking\n');
  
  try {
    // Get records grouped by pole
    const poleGroups = await getRecordsGroupedByPole(500); // Increased batch to get all remaining poles
    const poleNumbers = Object.keys(poleGroups);
    
    console.log(`✅ Found ${poleNumbers.length} unique poles with records`);
    
    // Show poles with multiple records
    const duplicates = poleNumbers.filter(pole => poleGroups[pole].length > 1);
    if (duplicates.length > 0) {
      console.log(`\n📊 Poles with multiple records (status changes):`);
      duplicates.forEach(pole => {
        console.log(`   ${pole}: ${poleGroups[pole].length} records`);
        poleGroups[pole].forEach(record => {
          console.log(`     - ${record.status} (${record.propertyId})`);
        });
      });
    }
    
    // Sync each pole
    console.log('\n🔄 Syncing poles with history tracking...\n');
    
    let syncedCount = 0;
    let historyCount = 0;
    
    for (const poleNumber of poleNumbers) {
      const records = poleGroups[poleNumber];
      const latestRecord = await determineLatestRecord(records);
      
      // Check if pole exists in production
      const existingDoc = await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .get();
      
      // Map fields for the latest record
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
      
      // Add status history for all records
      const batch = productionDb.batch();
      
      for (const record of records) {
        const historyEntry = await createStatusHistoryEntry(record);
        
        // If updating existing pole, set previous status
        if (existingDoc.exists) {
          historyEntry.previousStatus = existingDoc.data().importStatus || null;
        }
        
        // Create unique ID for history entry
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
    }
    
    // Create sync report
    const report = {
      timestamp: new Date().toISOString(),
      type: 'sync-with-history',
      summary: {
        totalPolesAnalyzed: poleNumbers.length,
        polesSynced: syncedCount,
        statusHistoryEntriesCreated: historyCount,
        polesWithMultipleStatuses: duplicates.length
      },
      duplicates: duplicates.map(pole => ({
        poleNumber: pole,
        recordCount: poleGroups[pole].length,
        statuses: poleGroups[pole].map(r => r.status)
      }))
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../reports', `sync-history-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Sync Summary:');
    console.log(`  - Total poles synced: ${syncedCount}`);
    console.log(`  - Status history entries created: ${historyCount}`);
    console.log(`  - Poles with multiple statuses: ${duplicates.length}`);
    console.log(`  - Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
syncWithHistory().then(() => {
  console.log('\n✨ Sync with status history completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});