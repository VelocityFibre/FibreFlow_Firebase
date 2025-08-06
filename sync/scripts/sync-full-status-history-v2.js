#!/usr/bin/env node

/**
 * Sync Full Status History V2 - Production Sync Module
 * 
 * Purpose: Synchronize complete status history from approval onwards
 * Updated to use correct field names and collection structure
 * 
 * Collections:
 * - vf-onemap-processed-records: Current status of each record
 * - vf-onemap-status-changes: Complete status change history
 * 
 * Strategy:
 * 1. Find all poles that have been approved (from status-changes)
 * 2. Get their complete status history timeline
 * 3. Sync to production with full lifecycle visibility
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
  STATUS_PRIORITY: [
    'Drop Installed',
    'Pole Installed',
    'Home Installation: Complete',
    'Home Installation: In Progress',
    'Pole Permission: Approved',
    'Pole Permission: Requested',
    'Survey: Requested'
  ],
  APPROVAL_STATUSES: [
    'Pole Permission: Approved'
  ]
};

async function findPolesWithApprovalHistory() {
  console.log('\n🔍 Finding all poles that have ever been approved...');
  
  try {
    // Query status changes for approved poles
    const approvedSnapshot = await stagingDb.collection('vf-onemap-status-changes')
      .where('toStatus', '==', 'Pole Permission: Approved')
      .get();
    
    // Get unique pole numbers
    const approvedPoleNumbers = new Set();
    approvedSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.poleNumber && data.poleNumber.trim() !== '') {
        approvedPoleNumbers.add(data.poleNumber);
      }
    });
    
    console.log(`✅ Found ${approvedPoleNumbers.size} unique poles with approval history`);
    return Array.from(approvedPoleNumbers);
  } catch (error) {
    console.error('❌ Error finding approved poles:', error);
    throw error;
  }
}

async function getFullStatusHistory(poleNumber) {
  try {
    // Get all status changes for this pole (without compound ordering to avoid index requirement)
    const changesSnapshot = await stagingDb.collection('vf-onemap-status-changes')
      .where('poleNumber', '==', poleNumber)
      .get();
    
    const statusHistory = [];
    const approvalFound = { hasApproval: false, approvalDate: null };
    
    changesSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Check if this is an approval
      if (data.toStatus === 'Pole Permission: Approved') {
        approvalFound.hasApproval = true;
        approvalFound.approvalDate = data.changeDate;
      }
      
      statusHistory.push({
        id: doc.id,
        fromStatus: data.fromStatus || 'Initial',
        toStatus: data.toStatus,
        changeDate: data.changeDate,
        changeIndex: data.changeIndex || 0,
        agent: data.agent || '',
        propertyId: data.propertyId || '',
        dropNumber: data.dropNumber || '',
        locationAddress: data.locationAddress || '',
        daysInPreviousStatus: data.daysInPreviousStatus || 0,
        importBatch: data.importBatch || '',
        sourceFile: data.sourceFile || ''
      });
    });
    
    // Sort by changeDate and changeIndex
    statusHistory.sort((a, b) => {
      const dateCompare = (a.changeDate || '').localeCompare(b.changeDate || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.changeIndex || 0) - (b.changeIndex || 0);
    });
    
    // Get current status from processed records
    const currentSnapshot = await stagingDb.collection('vf-onemap-processed-records')
      .where('poleNumber', '==', poleNumber)
      .limit(1)
      .get();
    
    let currentStatus = null;
    if (!currentSnapshot.empty) {
      const currentData = currentSnapshot.docs[0].data();
      currentStatus = {
        status: currentData.currentStatus || currentData.status || '',
        lastUpdated: currentData.lastModifiedDate || new Date(),
        gpsLocation: currentData.gpsLocation || null,
        address: currentData.locationAddress || '',
        dropNumber: currentData.dropNumber || ''
      };
    }
    
    return {
      statusHistory,
      currentStatus,
      approvalInfo: approvalFound
    };
  } catch (error) {
    console.error(`❌ Error getting status history for pole ${poleNumber}:`, error);
    return { statusHistory: [], currentStatus: null, approvalInfo: { hasApproval: false } };
  }
}

async function syncPoleWithFullHistory(poleNumber, historyData) {
  try {
    const { statusHistory, currentStatus, approvalInfo } = historyData;
    
    if (statusHistory.length === 0 && !currentStatus) {
      console.log(`⚠️  No data found for pole ${poleNumber}`);
      return false;
    }
    
    // Prepare production data
    const productionData = {
      poleNumber,
      currentStatus: currentStatus?.status || statusHistory[statusHistory.length - 1]?.toStatus || 'Unknown',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      
      // Location data
      gpsLocation: currentStatus?.gpsLocation || null,
      address: currentStatus?.address || '',
      
      // Approval tracking
      hasApprovalHistory: approvalInfo.hasApproval,
      approvalDate: approvalInfo.approvalDate,
      
      // Project info (defaulting to Lawley as most are from there)
      projectName: 'Lawley',
      
      // Track sync metadata
      syncMetadata: {
        lastSyncDate: admin.firestore.FieldValue.serverTimestamp(),
        sourceSystem: 'vf-onemap-data',
        syncType: 'full-status-history-v2',
        totalStatusChanges: statusHistory.length,
        hasPostApprovalStatuses: statusHistory.some(h => 
          h.changeIndex > statusHistory.findIndex(s => s.toStatus === 'Pole Permission: Approved')
        )
      }
    };
    
    // Save to production
    const productionRef = productionDb.collection('planned-poles').doc(poleNumber);
    await productionRef.set(productionData, { merge: true });
    
    // Save complete status history
    if (statusHistory.length > 0) {
      const historyRef = productionRef.collection('statusHistory');
      const batch = productionDb.batch();
      
      for (const change of statusHistory) {
        const historyDoc = {
          ...change,
          syncDate: admin.firestore.FieldValue.serverTimestamp()
        };
        // Use changeDate and index for unique ID
        const docId = `${change.changeDate}_${change.changeIndex}_${change.toStatus.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const docRef = historyRef.doc(docId);
        batch.set(docRef, historyDoc);
      }
      
      await batch.commit();
    }
    
    // Count post-approval statuses
    const approvalIndex = statusHistory.findIndex(h => h.toStatus === 'Pole Permission: Approved');
    const postApprovalCount = approvalIndex >= 0 ? statusHistory.length - approvalIndex - 1 : 0;
    
    console.log(`✅ Synced pole ${poleNumber}: ${statusHistory.length} changes (${postApprovalCount} after approval) - Current: ${productionData.currentStatus}`);
    return true;
  } catch (error) {
    console.error(`❌ Error syncing pole ${poleNumber}:`, error);
    return false;
  }
}

async function runFullHistorySync() {
  console.log('\n🚀 Starting Full Status History Sync V2');
  console.log('=' * 60);
  console.log('Strategy: Sync ALL status changes for poles from approval onwards');
  console.log('=' * 60);
  
  const startTime = Date.now();
  const stats = {
    totalPoles: 0,
    syncedPoles: 0,
    failedPoles: 0,
    totalStatusChanges: 0,
    polesWithPostApproval: 0
  };
  
  try {
    // Step 1: Find all poles with approval history
    const approvedPoles = await findPolesWithApprovalHistory();
    stats.totalPoles = approvedPoles.length;
    
    if (stats.totalPoles === 0) {
      console.log('\n⚠️  No approved poles found to sync');
      return;
    }
    
    console.log(`\n📋 Processing ${stats.totalPoles} poles with approval history...`);
    
    // Step 2: Process in batches
    for (let i = 0; i < approvedPoles.length; i += CONFIG.BATCH_SIZE) {
      const batch = approvedPoles.slice(i, i + CONFIG.BATCH_SIZE);
      const batchPromises = [];
      
      console.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} (${batch.length} poles)...`);
      
      for (const poleNumber of batch) {
        batchPromises.push(
          getFullStatusHistory(poleNumber).then(async (historyData) => {
            stats.totalStatusChanges += historyData.statusHistory.length;
            
            // Check if has post-approval statuses
            const approvalIndex = historyData.statusHistory.findIndex(h => h.toStatus === 'Pole Permission: Approved');
            if (approvalIndex >= 0 && approvalIndex < historyData.statusHistory.length - 1) {
              stats.polesWithPostApproval++;
            }
            
            const success = await syncPoleWithFullHistory(poleNumber, historyData);
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
    console.log(`Total status changes: ${stats.totalStatusChanges}`);
    console.log(`Poles with post-approval changes: ${stats.polesWithPostApproval}`);
    console.log(`Average changes per pole: ${(stats.totalStatusChanges / stats.totalPoles).toFixed(1)}`);
    console.log(`Duration: ${duration} seconds`);
    console.log(`Rate: ${(stats.syncedPoles / (duration / 60)).toFixed(1)} poles/minute`);
    
    // Save sync report with proper naming
    const reportDate = new Date();
    const reportName = `FULL_STATUS_HISTORY_SYNC_${reportDate.toISOString().split('T')[0]}`;
    const report = {
      reportName,
      scriptName: 'sync-full-status-history-v2.js',
      executionDate: '2025-08-04',
      timestamp: reportDate.toISOString(),
      type: 'full-status-history-sync-v2',
      description: 'Complete status history sync from approval onwards',
      stats,
      duration: `${duration}s`,
      success: stats.failedPoles === 0,
      strategy: 'Sync all status changes for poles that have been approved, providing full lifecycle visibility'
    };
    
    await productionDb.collection('sync-reports').doc(reportName).set(report);
    console.log(`\n📄 Sync report saved: ${reportName}`);
    
  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    process.exit(1);
  }
}

// Run the sync
if (require.main === module) {
  console.log('🏁 Full Status History Sync V2 - Starting...\n');
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

module.exports = { runFullHistorySync, findPolesWithApprovalHistory, getFullStatusHistory };