#!/usr/bin/env node

/**
 * Sync Full Status History - Production Sync Module
 * 
 * Purpose: Synchronize complete status history from approval onwards
 * Strategy: 
 * 1. Find all poles that have been approved at any point
 * 2. Sync ALL their status changes (not just approved status)
 * 3. Maintain complete timeline from approval through installation
 * 
 * This ensures production has full visibility of pole lifecycle after approval
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin for both projects
const stagingServiceAccount = require('../config/service-accounts/vf-onemap-data-key.json');
const productionServiceAccount = require('../config/service-accounts/fibreflow-73daf-key.json');

const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(stagingServiceAccount),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(productionServiceAccount),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

// Configuration
const CONFIG = {
  BATCH_SIZE: 500,
  SYNC_APPROVED_AND_BEYOND: true,
  STATUS_PRIORITY: [
    'Drop Installed',
    'Pole Installed',
    'Home Installation: In Progress',
    'Home Installation: Complete',
    'Pole Permission: Approved',
    'Pole Permission: Requested',
    'Survey: Requested'
  ],
  STATUSES_TO_TRACK_AFTER_APPROVAL: [
    'Pole Permission: Approved',
    'Pole Installed',
    'Drop Installed',
    'Home Installation: In Progress',
    'Home Installation: Complete',
    'Fiber Installation: In Progress',
    'Fiber Installation: Complete'
  ]
};

async function findPolesWithApprovalHistory() {
  console.log('\n🔍 Finding all poles that have ever been approved...');
  
  try {
    // Query for all poles that have or had "Pole Permission: Approved" status
    const approvedSnapshot = await stagingDb.collection('1map')
      .where('Status', '==', 'Pole Permission: Approved')
      .get();
    
    // Get unique pole numbers
    const approvedPoleNumbers = new Set();
    approvedSnapshot.forEach(doc => {
      const data = doc.data();
      if (data['Pole Number']) {
        approvedPoleNumbers.add(data['Pole Number']);
      }
    });
    
    console.log(`✅ Found ${approvedPoleNumbers.size} unique poles with approval history`);
    return Array.from(approvedPoleNumbers);
  } catch (error) {
    console.error('❌ Error finding approved poles:', error);
    throw error;
  }
}

async function getAllStatusHistoryForPole(poleNumber) {
  try {
    // Get ALL records for this pole number (all statuses)
    const snapshot = await stagingDb.collection('1map')
      .where('Pole Number', '==', poleNumber)
      .orderBy('Timestamp', 'asc')
      .get();
    
    const statusHistory = [];
    const seenStatuses = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.Status;
      const timestamp = data.Timestamp;
      
      // Create unique key for status+timestamp to avoid duplicates
      const statusKey = `${status}_${timestamp?.toMillis() || 0}`;
      
      if (!seenStatuses.has(statusKey)) {
        seenStatuses.add(statusKey);
        statusHistory.push({
          id: doc.id,
          status,
          timestamp,
          propertyId: data['Property ID'] || '',
          dropNumber: data['Drop Number'] || '',
          fieldAgent: data['Field Agent'] || '',
          address: data.Address || '',
          source: 'vf-onemap-data'
        });
      }
    });
    
    return statusHistory;
  } catch (error) {
    console.error(`❌ Error getting status history for pole ${poleNumber}:`, error);
    return [];
  }
}

async function syncPoleWithFullHistory(poleNumber, statusHistory) {
  try {
    if (statusHistory.length === 0) {
      console.log(`⚠️  No status history found for pole ${poleNumber}`);
      return false;
    }
    
    // Find the latest status based on priority
    let latestRecord = statusHistory[statusHistory.length - 1];
    for (const priorityStatus of CONFIG.STATUS_PRIORITY) {
      const record = statusHistory.find(h => h.status === priorityStatus);
      if (record) {
        latestRecord = record;
        break;
      }
    }
    
    // Get the full record data for the latest status
    const latestDoc = await stagingDb.collection('1map').doc(latestRecord.id).get();
    const poleData = latestDoc.data();
    
    // Prepare production data
    const productionData = {
      poleNumber,
      currentStatus: latestRecord.status,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      
      // Location data
      gpsLocation: poleData['GPS Location'] || null,
      address: poleData.Address || '',
      addressCode: poleData['Address Code'] || '',
      
      // Pole details
      pon: poleData.PON || '',
      zone: poleData.Zone || '',
      distributionOrFeeder: poleData['Distribution/Feeder'] || '',
      
      // Project info
      projectName: poleData['Project Name'] || 'Lawley',
      
      // Track sync metadata
      syncMetadata: {
        lastSyncDate: admin.firestore.FieldValue.serverTimestamp(),
        sourceSystem: 'vf-onemap-data',
        syncType: 'full-status-history',
        totalStatusCount: statusHistory.length,
        hasApprovalStatus: statusHistory.some(h => h.status === 'Pole Permission: Approved'),
        latestSourceId: latestRecord.id
      }
    };
    
    // Save to production
    const productionRef = productionDb.collection('planned-poles').doc(poleNumber);
    await productionRef.set(productionData, { merge: true });
    
    // Save complete status history
    const historyRef = productionRef.collection('statusHistory');
    const batch = productionDb.batch();
    
    for (const historyItem of statusHistory) {
      const historyDoc = {
        ...historyItem,
        syncDate: admin.firestore.FieldValue.serverTimestamp()
      };
      const docRef = historyRef.doc(`${historyItem.status}_${historyItem.timestamp?.toMillis() || Date.now()}`);
      batch.set(docRef, historyDoc);
    }
    
    await batch.commit();
    
    console.log(`✅ Synced pole ${poleNumber} with ${statusHistory.length} status entries (Current: ${latestRecord.status})`);
    return true;
  } catch (error) {
    console.error(`❌ Error syncing pole ${poleNumber}:`, error);
    return false;
  }
}

async function runFullHistorySync() {
  console.log('\n🚀 Starting Full Status History Sync');
  console.log('=' * 60);
  console.log('Strategy: Sync ALL status changes for poles that have been approved');
  console.log('=' * 60);
  
  const startTime = Date.now();
  const stats = {
    totalPoles: 0,
    syncedPoles: 0,
    failedPoles: 0,
    totalStatusEntries: 0
  };
  
  try {
    // Step 1: Find all poles with approval history
    const approvedPoles = await findPolesWithApprovalHistory();
    stats.totalPoles = approvedPoles.length;
    
    console.log(`\n📋 Processing ${stats.totalPoles} poles with approval history...`);
    
    // Step 2: Process in batches
    for (let i = 0; i < approvedPoles.length; i += CONFIG.BATCH_SIZE) {
      const batch = approvedPoles.slice(i, i + CONFIG.BATCH_SIZE);
      const batchPromises = [];
      
      console.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} (${batch.length} poles)...`);
      
      for (const poleNumber of batch) {
        batchPromises.push(
          getAllStatusHistoryForPole(poleNumber).then(async (history) => {
            stats.totalStatusEntries += history.length;
            const success = await syncPoleWithFullHistory(poleNumber, history);
            if (success) {
              stats.syncedPoles++;
            } else {
              stats.failedPoles++;
            }
          })
        );
      }
      
      await Promise.all(batchPromises);
      
      // Progress update
      const progress = ((i + batch.length) / stats.totalPoles * 100).toFixed(1);
      console.log(`\n📊 Progress: ${progress}% (${stats.syncedPoles} synced, ${stats.failedPoles} failed)`);
    }
    
    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '=' * 60);
    console.log('✅ FULL STATUS HISTORY SYNC COMPLETE');
    console.log('=' * 60);
    console.log(`Total poles processed: ${stats.totalPoles}`);
    console.log(`Successfully synced: ${stats.syncedPoles}`);
    console.log(`Failed: ${stats.failedPoles}`);
    console.log(`Total status entries: ${stats.totalStatusEntries}`);
    console.log(`Average statuses per pole: ${(stats.totalStatusEntries / stats.totalPoles).toFixed(1)}`);
    console.log(`Duration: ${duration} seconds`);
    console.log(`Rate: ${(stats.syncedPoles / (duration / 60)).toFixed(1)} poles/minute`);
    
    // Save sync report
    const report = {
      timestamp: new Date().toISOString(),
      type: 'full-status-history-sync',
      stats,
      duration: `${duration}s`,
      success: stats.failedPoles === 0
    };
    
    await productionDb.collection('sync-reports').add(report);
    console.log('\n📄 Sync report saved to production database');
    
  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    process.exit(1);
  }
}

// Run the sync
if (require.main === module) {
  console.log('🏁 Full Status History Sync - Starting...\n');
  runFullHistorySync()
    .then(() => {
      console.log('\n✅ Sync completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}

module.exports = { runFullHistorySync, findPolesWithApprovalHistory, getAllStatusHistoryForPole };