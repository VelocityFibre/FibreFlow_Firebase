#\!/usr/bin/env node

/**
 * Sync only NEW records (May 27, 29, 30) to production
 * Skips the original May 22 records that are already in production
 */

const admin = require('firebase-admin');
const serviceAccount = require('./fibreflow-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Property IDs from May 22 that are already in production (first 746 records)
const MAY_22_CUTOFF_ID = 270901; // Last property ID before May 27 additions

async function syncNewRecordsOnly() {
  console.log('🚀 Starting sync of NEW records only (May 27, 29, 30)...\n');
  
  try {
    // Get all staged records
    const stagingRef = db.collection('onemap-processing-staging');
    const snapshot = await stagingRef.get();
    
    console.log(`📊 Found ${snapshot.size} total records in staging`);
    
    let newRecordsCount = 0;
    let skippedCount = 0;
    let syncedCount = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const propertyId = parseInt(data.propertyId);
      
      // Skip records from May 22 (already in production)
      if (propertyId <= MAY_22_CUTOFF_ID) {
        skippedCount++;
        continue;
      }
      
      newRecordsCount++;
      
      // Determine target collection based on status
      let targetCollection;
      if (\!data.poleNumber || data.poleNumber === 'N/A') {
        console.log(`   ⚠️  Skipping property ${propertyId} - no pole number`);
        continue;
      }
      
      if (data.status && data.status.includes('Installed')) {
        targetCollection = 'pole-trackers';
      } else {
        targetCollection = 'planned-poles';
      }
      
      // Prepare production data
      const productionData = {
        ...data,
        importedFrom: '1Map',
        importId: 'IMP_2025-07-21_NEW_RECORDS',
        syncedAt: FieldValue.serverTimestamp(),
        projectId: 'Law-001' // Lawley project
      };
      
      // Add to batch
      const docRef = db.collection(targetCollection).doc(`PROP_${propertyId}`);
      batch.set(docRef, productionData, { merge: true });
      batchCount++;
      syncedCount++;
      
      // Commit batch every 500 records
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`   ✅ Committed batch of ${batchCount} records`);
        batchCount = 0;
      }
    }
    
    // Commit remaining records
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✅ Committed final batch of ${batchCount} records`);
    }
    
    console.log('\n📋 SYNC COMPLETE\!');
    console.log('================');
    console.log(`Total records in staging: ${snapshot.size}`);
    console.log(`Records from May 22 (skipped): ${skippedCount}`);
    console.log(`New records (May 27, 29, 30): ${newRecordsCount}`);
    console.log(`Records synced to production: ${syncedCount}`);
    console.log(`Records without pole numbers: ${newRecordsCount - syncedCount}`);
    
    // Update sync tracking
    await db.collection('onemap-sync-tracking').add({
      syncId: 'SYNC_2025-07-21_NEW_RECORDS',
      syncDate: FieldValue.serverTimestamp(),
      recordsProcessed: newRecordsCount,
      recordsSynced: syncedCount,
      source: 'May 27, 29, 30 CSV files',
      targetProject: 'Law-001'
    });
    
    console.log('\n✅ New records successfully synced to production\!');
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
  
  process.exit(0);
}

// Run the sync
syncNewRecordsOnly();
EOF < /dev/null
