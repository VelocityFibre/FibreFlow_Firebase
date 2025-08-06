#!/usr/bin/env node

/**
 * Prepare for Next Sync
 * Shows what's available to sync and current status
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

async function prepareNextSync() {
  console.log('🔄 PREPARING FOR NEXT SYNC\n');
  console.log('═'.repeat(80));
  
  try {
    // 1. Check staging database status
    console.log('📊 STAGING DATABASE STATUS (vf-onemap-data):');
    console.log('─'.repeat(80));
    
    const totalRecords = await stagingDb
      .collection('vf-onemap-processed-records')
      .count()
      .get();
    
    console.log(`Total records in staging: ${totalRecords.data().count}`);
    
    // Get records with pole numbers
    const withPoleNumbers = await stagingDb
      .collection('vf-onemap-processed-records')
      .where('poleNumber', '!=', '')
      .count()
      .get();
    
    console.log(`Records with pole numbers: ${withPoleNumbers.data().count}`);
    console.log(`Records without pole numbers: ${totalRecords.data().count - withPoleNumbers.data().count}`);
    
    // 2. Check what's already synced
    console.log('\n📊 PRODUCTION DATABASE STATUS (fibreflow-73daf):');
    console.log('─'.repeat(80));
    
    const syncedPoles = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    console.log(`Poles already synced: ${syncedPoles.data().count}`);
    
    // 3. Analyze what's left to sync
    console.log('\n🔍 SYNC ANALYSIS:');
    console.log('─'.repeat(80));
    
    // Get all synced pole numbers
    const syncedSnapshot = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .get();
    
    const syncedPoleNumbers = new Set();
    syncedSnapshot.forEach(doc => {
      syncedPoleNumbers.add(doc.id);
    });
    
    // Check staging for unsynced records
    const stagingSnapshot = await stagingDb
      .collection('vf-onemap-processed-records')
      .limit(100) // Check first 100
      .get();
    
    let unsyncedCount = 0;
    let missingPoleCount = 0;
    const unsyncedSamples = [];
    
    stagingSnapshot.forEach(doc => {
      const data = doc.data();
      const poleNumber = data.poleNumber;
      
      if (!poleNumber || poleNumber === '') {
        missingPoleCount++;
      } else if (!syncedPoleNumbers.has(poleNumber)) {
        unsyncedCount++;
        if (unsyncedSamples.length < 5) {
          unsyncedSamples.push({
            poleNumber,
            status: data.status,
            propertyId: data.propertyId
          });
        }
      }
    });
    
    console.log(`\n📋 From first 100 staging records:`);
    console.log(`  - Already synced: ${100 - unsyncedCount - missingPoleCount}`);
    console.log(`  - Ready to sync: ${unsyncedCount}`);
    console.log(`  - Missing pole numbers: ${missingPoleCount}`);
    
    if (unsyncedSamples.length > 0) {
      console.log('\n📍 Sample unsynced poles:');
      unsyncedSamples.forEach(sample => {
        console.log(`  - ${sample.poleNumber}: ${sample.status} (Property: ${sample.propertyId})`);
      });
    }
    
    // 4. Recommend next sync batch
    console.log('\n\n💡 RECOMMENDED NEXT STEPS:');
    console.log('═'.repeat(80));
    
    if (unsyncedCount > 0) {
      console.log('✅ There are unsynced records ready to process!\n');
      console.log('To sync the next batch:');
      console.log('1. Edit sync-with-status-history.js');
      console.log('2. Change line: const poleGroups = await getRecordsGroupedByPole(50);');
      console.log('3. Increase 50 to desired batch size (e.g., 100, 500, or 999999 for all)');
      console.log('4. Run: node scripts/sync-with-status-history.js');
    } else {
      console.log('✅ All records in the current sample are synced!');
      console.log('\nTo check more records:');
      console.log('1. Increase the limit in this script (line ~65)');
      console.log('2. Or run a full sync to process all remaining records');
    }
    
    // 5. Create pre-sync checklist
    const checklist = {
      timestamp: new Date().toISOString(),
      staging: {
        totalRecords: totalRecords.data().count,
        withPoleNumbers: withPoleNumbers.data().count,
        withoutPoleNumbers: totalRecords.data().count - withPoleNumbers.data().count
      },
      production: {
        alreadySynced: syncedPoles.data().count
      },
      readyToSync: {
        estimated: withPoleNumbers.data().count - syncedPoles.data().count,
        verified: unsyncedCount,
        sample: unsyncedSamples
      },
      recommendations: {
        batchSize: unsyncedCount > 100 ? 100 : unsyncedCount,
        fullSync: withPoleNumbers.data().count - syncedPoles.data().count > 1000
      }
    };
    
    // Save checklist
    const checklistPath = path.join(__dirname, '../reports', `pre-sync-checklist-${Date.now()}.json`);
    fs.writeFileSync(checklistPath, JSON.stringify(checklist, null, 2));
    console.log(`\n📄 Pre-sync checklist saved: ${checklistPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run preparation
prepareNextSync().then(() => {
  console.log('\n✨ Next sync preparation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});