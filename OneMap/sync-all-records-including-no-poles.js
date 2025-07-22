#!/usr/bin/env node

/**
 * Sync ALL records to production, including those without pole numbers
 * These are valid properties that need tracking even without poles assigned yet
 */

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function syncAllRecordsIncludingNoPoles() {
  console.log('🚀 Starting sync of ALL records (including no pole numbers)...\n');
  
  try {
    // Get records without pole numbers from staging
    const stagingRef = db.collection('onemap-processing-staging');
    const noPoleQuery = await stagingRef
      .where('poleNumber', 'in', ['', 'N/A', null])
      .get();
    
    console.log(`📊 Found ${noPoleQuery.size} records without pole numbers to sync\n`);
    
    let syncedCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of noPoleQuery.docs) {
      const data = doc.data();
      
      // These go to planned-poles collection even without pole numbers
      // They are properties that need pole assignment
      const productionData = {
        ...data,
        poleNumber: data.poleNumber || 'PENDING_ASSIGNMENT',
        importedFrom: '1Map',
        importId: 'IMP_2025-07-21_NO_POLES',
        syncedAt: FieldValue.serverTimestamp(),
        projectId: 'Law-001',
        requiresPoleAssignment: true,
        notes: 'Property imported without pole number - needs field assignment'
      };
      
      // Add to planned-poles collection
      const docRef = db.collection('planned-poles').doc(`PROP_${data.propertyId}`);
      batch.set(docRef, productionData, { merge: true });
      batchCount++;
      
      if (batchCount % 10 === 0) {
        console.log(`   Processing property ${data.propertyId} - Status: ${data.status || 'No status'}`);
      }
      
      // Commit batch every 100 records
      if (batchCount >= 100) {
        await batch.commit();
        syncedCount += batchCount;
        console.log(`   ✅ Committed batch of ${batchCount} records (Total: ${syncedCount})`);
        batchCount = 0;
      }
    }
    
    // Commit remaining records
    if (batchCount > 0) {
      await batch.commit();
      syncedCount += batchCount;
      console.log(`   ✅ Committed final batch of ${batchCount} records`);
    }
    
    console.log('\n📋 SYNC COMPLETE!');
    console.log('================');
    console.log(`Records without poles synced: ${syncedCount}`);
    console.log(`\nThese properties are now in the planned-poles collection`);
    console.log(`marked as "PENDING_ASSIGNMENT" and ready for field teams.`);
    
    // Update sync tracking
    await db.collection('onemap-sync-tracking').add({
      syncId: 'SYNC_2025-07-21_NO_POLES',
      syncDate: FieldValue.serverTimestamp(),
      recordsProcessed: noPoleQuery.size,
      recordsSynced: syncedCount,
      source: 'Records without pole numbers from May 22-30',
      targetProject: 'Law-001',
      notes: 'Synced properties that need pole assignment'
    });
    
    console.log('\n✅ All records successfully synced to production!');
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
  
  process.exit(0);
}

// Run the sync
syncAllRecordsIncludingNoPoles();