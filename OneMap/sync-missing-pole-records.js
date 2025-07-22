#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function syncMissingPoleRecords() {
  console.log('🚀 Syncing records WITHOUT pole numbers to production...\n');
  console.log('These are valid properties that need pole assignment by field teams.\n');
  
  try {
    const snapshot = await db.collection('onemap-processing-staging').get();
    
    let toSync = [];
    
    // Find all records without pole numbers
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (!data.poleNumber || data.poleNumber === '' || data.poleNumber === 'N/A') {
        // Check if already in production
        const plannedPoleDoc = await db.collection('planned-poles').doc(`PROP_${data.propertyId}`).get();
        const poleTrackerDoc = await db.collection('pole-trackers').doc(`PROP_${data.propertyId}`).get();
        
        if (!plannedPoleDoc.exists && !poleTrackerDoc.exists) {
          toSync.push(data);
        }
      }
    }
    
    console.log(`📊 Found ${toSync.length} records to sync\n`);
    
    if (toSync.length === 0) {
      console.log('All records already synced!');
      process.exit(0);
    }
    
    // Sort by property ID for organized processing
    toSync.sort((a, b) => parseInt(a.propertyId) - parseInt(b.propertyId));
    
    let syncedCount = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const data of toSync) {
      // Prepare production data
      const productionData = {
        ...data,
        poleNumber: 'PENDING_ASSIGNMENT',
        importedFrom: '1Map',
        importId: 'IMP_2025-07-21_NO_POLES',
        syncedAt: FieldValue.serverTimestamp(),
        projectId: 'Law-001',
        requiresPoleAssignment: true,
        assignmentPriority: data.status === 'Pole Permission: Approved' ? 'HIGH' : 'NORMAL',
        notes: 'Property imported without pole number - needs field assignment'
      };
      
      // All go to planned-poles since they need planning/assignment
      const docRef = db.collection('planned-poles').doc(`PROP_${data.propertyId}`);
      batch.set(docRef, productionData);
      batchCount++;
      
      if (batchCount % 10 === 0) {
        console.log(`   Processing: Property ${data.propertyId} - Status: ${data.status || 'No status'}`);
      }
      
      // Commit batch every 100 records
      if (batchCount >= 100) {
        await batch.commit();
        syncedCount += batchCount;
        console.log(`   ✅ Committed batch of ${batchCount} records (Total: ${syncedCount})`);
        batch = db.batch(); // Create new batch
        batchCount = 0;
      }
    }
    
    // Commit remaining records
    if (batchCount > 0) {
      await batch.commit();
      syncedCount += batchCount;
      console.log(`   ✅ Committed final batch of ${batchCount} records`);
    }
    
    // Create summary report
    const statusBreakdown = {};
    toSync.forEach(record => {
      const status = record.status || 'No Status';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    console.log('\n📋 SYNC COMPLETE!');
    console.log('================');
    console.log(`Total records synced: ${syncedCount}`);
    console.log('\nStatus breakdown of synced records:');
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n✅ All properties without pole numbers have been synced!');
    console.log('They are now in planned-poles collection marked as PENDING_ASSIGNMENT');
    
    // Update tracking
    await db.collection('onemap-sync-tracking').add({
      syncId: 'SYNC_2025-07-21_NO_POLES',
      syncDate: FieldValue.serverTimestamp(),
      recordsProcessed: toSync.length,
      recordsSynced: syncedCount,
      source: 'Records without pole numbers from staging',
      targetProject: 'Law-001',
      statusBreakdown,
      notes: 'Synced properties that need pole assignment'
    });
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
  
  process.exit(0);
}

syncMissingPoleRecords().catch(console.error);