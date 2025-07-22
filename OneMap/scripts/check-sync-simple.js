const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function checkSimpleSync() {
  console.log('🔍 Checking sync status (simplified)...\n');
  
  try {
    // Count synced records by checking metadata
    const plannedPolesSnapshot = await db.collection('planned-poles')
      .where('metadata.importedBy', '==', 'onemap-sync')
      .get();
    
    const poleTrackersSnapshot = await db.collection('pole-trackers')
      .where('createdBy', '==', 'onemap-sync')
      .get();
    
    console.log(`📊 Sync Status:`);
    console.log(`- Records in planned-poles: ${plannedPolesSnapshot.size}`);
    console.log(`- Records in pole-trackers: ${poleTrackersSnapshot.size}`);
    console.log(`- Total synced: ${plannedPolesSnapshot.size + poleTrackersSnapshot.size} / 543 expected`);
    console.log(`- Progress: ${Math.round((plannedPolesSnapshot.size + poleTrackersSnapshot.size) / 543 * 100)}%`);
    
    // Check a few staging records to see if they're synced
    const stagingSample = await db.collection('onemap-processing-staging')
      .where('poleNumber', '!=', null)
      .limit(10)
      .get();
    
    console.log('\n🔍 Checking if staging records are synced:');
    let syncedInSample = 0;
    let unsyncedInSample = 0;
    
    for (const doc of stagingSample.docs) {
      const data = doc.data();
      // Simple check - see if property exists in planned-poles
      const existsQuery = await db.collection('planned-poles')
        .where('propertyId', '==', data.propertyId)
        .limit(1)
        .get();
      
      if (!existsQuery.empty) {
        syncedInSample++;
      } else {
        unsyncedInSample++;
      }
    }
    
    console.log(`- Out of 10 sample records: ${syncedInSample} synced, ${unsyncedInSample} not synced`);
    
    const totalSynced = plannedPolesSnapshot.size + poleTrackersSnapshot.size;
    const remaining = 543 - totalSynced;
    
    console.log('\n💡 Summary:');
    if (remaining > 0) {
      console.log(`- ${remaining} records still need to be synced`);
      console.log('- The sync appears to have stopped at 279 records');
      console.log('\n✅ To complete the sync, run:');
      console.log('   node scripts/batch-sync-to-production.js');
    } else {
      console.log('- All records have been synced! ✅');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSimpleSync();