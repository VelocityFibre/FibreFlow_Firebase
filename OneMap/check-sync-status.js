#!/usr/bin/env node

/**
 * 1Map Sync Status Checker
 * 
 * Shows the status of all sync operations
 * Usage: node check-sync-status.js
 */

const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();
const PROCESSING_COLLECTION = 'onemap-processing';

class SyncStatusChecker {
  async checkStatus() {
    console.log(`
📊 1MAP SYNC STATUS REPORT
==========================
`);
    
    // Get all imports
    const imports = await db
      .collection(PROCESSING_COLLECTION)
      .orderBy('importDate', 'desc')
      .limit(10)
      .get();
    
    if (imports.empty) {
      console.log('❌ No sync operations found yet.');
      console.log('   Run: node process-1map-sync.js <csv-file> to start');
      return;
    }
    
    console.log(`Found ${imports.size} recent sync operations:\n`);
    
    // Display each import
    for (const doc of imports.docs) {
      const data = doc.data();
      await this.displayImport(data);
    }
    
    // Show summary statistics
    await this.showSummaryStats();
  }
  
  async displayImport(data) {
    const date = data.importDate?.toDate() || new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0];
    
    const statusEmoji = {
      'processing': '⚙️ ',
      'validated': '✅',
      'synced': '🚀',
      'error': '❌',
      'completed': '✓'
    }[data.status] || '❓';
    
    console.log(`${statusEmoji} Import: ${data.importId}`);
    console.log(`   Date: ${dateStr} ${timeStr}`);
    console.log(`   File: ${data.fileName || 'unknown'}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Records: ${data.recordCount || 0}`);
    
    if (data.changes) {
      console.log(`   Changes: ${data.changes.new || 0} new, ${data.changes.updated || 0} updated, ${data.changes.unchanged || 0} unchanged`);
    }
    
    if (data.errors && data.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${data.errors.length}`);
    }
    
    if (data.syncedAt) {
      const syncDate = data.syncedAt.toDate();
      console.log(`   Synced: ${syncDate.toISOString()}`);
    }
    
    console.log('');
  }
  
  async showSummaryStats() {
    console.log(`
📈 OVERALL STATISTICS
=====================
`);
    
    // Get all synced imports for stats
    const syncedImports = await db
      .collection(PROCESSING_COLLECTION)
      .where('status', '==', 'synced')
      .get();
    
    let totalSynced = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    
    syncedImports.forEach(doc => {
      const data = doc.data();
      if (data.changes) {
        totalNew += data.changes.new || 0;
        totalUpdated += data.changes.updated || 0;
        totalSynced += (data.changes.new || 0) + (data.changes.updated || 0);
      }
    });
    
    console.log(`Total Synced Records: ${totalSynced}`);
    console.log(`Total New Records: ${totalNew}`);
    console.log(`Total Updates: ${totalUpdated}`);
    console.log(`Total Sync Operations: ${syncedImports.size}`);
    
    // Get latest sync date
    const latestSync = await db
      .collection(PROCESSING_COLLECTION)
      .where('status', '==', 'synced')
      .orderBy('syncedAt', 'desc')
      .limit(1)
      .get();
    
    if (!latestSync.empty) {
      const lastSyncDate = latestSync.docs[0].data().syncedAt.toDate();
      console.log(`Last Sync: ${lastSyncDate.toISOString()}`);
    }
    
    // Show pending syncs
    const pendingImports = await db
      .collection(PROCESSING_COLLECTION)
      .where('status', 'in', ['validated', 'processing'])
      .get();
    
    if (!pendingImports.empty) {
      console.log(`\n⏳ Pending Syncs: ${pendingImports.size}`);
      pendingImports.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.importId} (${data.status})`);
      });
    }
  }
  
  async showRecentChanges() {
    console.log(`
🔍 RECENT CHANGES
=================
`);
    
    // Get the most recent validated/synced import
    const recentImport = await db
      .collection(PROCESSING_COLLECTION)
      .where('status', 'in', ['validated', 'synced'])
      .orderBy('importDate', 'desc')
      .limit(1)
      .get();
    
    if (recentImport.empty) {
      console.log('No recent changes found.');
      return;
    }
    
    const importId = recentImport.docs[0].id;
    const importData = recentImport.docs[0].data();
    
    console.log(`From import: ${importId} (${importData.fileName})\n`);
    
    // Get changed records
    const changedRecords = await db
      .collection(PROCESSING_COLLECTION)
      .doc(importId)
      .collection('records')
      .where('_import.status', 'in', ['new', 'updated'])
      .limit(10)
      .get();
    
    changedRecords.forEach(doc => {
      const data = doc.data();
      const status = data._import.status;
      const recordId = data._import.recordId;
      
      console.log(`${status === 'new' ? '🆕' : '📝'} ${recordId}`);
      
      if (data._mapped) {
        console.log(`   Pole: ${data._mapped.poleNumber || 'N/A'}`);
        console.log(`   Property: ${data._mapped.propertyId || 'N/A'}`);
        console.log(`   Address: ${data._mapped.address || 'N/A'}`);
      }
      
      if (status === 'updated' && data._import.changes) {
        console.log('   Changes:');
        data._import.changes.forEach(change => {
          console.log(`   - ${change.field}: "${change.old}" → "${change.new}"`);
        });
      }
      
      console.log('');
    });
    
    if (changedRecords.size === 10) {
      console.log('... and more changes. See full report for details.');
    }
  }
}

// Main execution
async function main() {
  const checker = new SyncStatusChecker();
  
  try {
    await checker.checkStatus();
    await checker.showRecentChanges();
    
    console.log(`
📝 NEXT STEPS
=============
- Download new CSV: node download-from-gdrive.js
- Process sync: node process-1map-sync.js <csv-file>
- Check status: node check-sync-status.js
`);
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}