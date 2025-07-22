const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function checkDetailedSyncStatus() {
  console.log('🔍 Checking detailed sync status...\n');
  
  try {
    // Check recent sync activity
    const recentSyncs = await db.collection('planned-poles')
      .where('metadata.importedBy', '==', 'onemap-sync')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log('🕐 Recent sync activity:');
    if (recentSyncs.empty) {
      console.log('No recent syncs found.');
    } else {
      recentSyncs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt.toDate();
        const timeDiff = (new Date() - createdAt) / 1000 / 60; // minutes ago
        console.log(`- ${data.clientPoleNumber}: synced ${Math.round(timeDiff)} minutes ago`);
      });
    }
    
    // Check total synced
    const [plannedPolesQuery, poleTrackersQuery] = await Promise.all([
      db.collection('planned-poles')
        .where('metadata.importedBy', '==', 'onemap-sync')
        .where('projectId', '==', '6edHoC3ZakUTbXznbQ5a')
        .get(),
      db.collection('pole-trackers')
        .where('createdBy', '==', 'onemap-sync')
        .where('projectId', '==', '6edHoC3ZakUTbXznbQ5a')
        .get()
    ]);
    
    const total = plannedPolesQuery.size + poleTrackersQuery.size;
    console.log(`\n📊 Total synced: ${total} / 543 records (${Math.round(total/543*100)}%)`);
    
    // Check staging for unsynced records
    const stagingSnapshot = await db.collection('onemap-processing-staging')
      .where('poleNumber', '!=', null)
      .get();
    
    let syncedCount = 0;
    let unsyncedCount = 0;
    const unsyncedSamples = [];
    
    for (const doc of stagingSnapshot.docs) {
      const data = doc.data();
      // Check if this record exists in production
      const existsInProd = await db.collection('planned-poles')
        .where('propertyId', '==', data.propertyId)
        .limit(1)
        .get();
      
      if (!existsInProd.empty) {
        syncedCount++;
      } else {
        unsyncedCount++;
        if (unsyncedSamples.length < 5) {
          unsyncedSamples.push({
            propertyId: data.propertyId,
            poleNumber: data.poleNumber,
            status: data.status
          });
        }
      }
    }
    
    console.log(`\n📦 Staging analysis:`);
    console.log(`- Already synced: ${syncedCount}`);
    console.log(`- Not yet synced: ${unsyncedCount}`);
    
    if (unsyncedSamples.length > 0) {
      console.log('\n🚫 Sample unsynced records:');
      unsyncedSamples.forEach(r => {
        console.log(`- Property ${r.propertyId}: ${r.poleNumber} (${r.status})`);
      });
    }
    
    // Summary
    console.log('\n💡 Summary:');
    if (unsyncedCount > 0) {
      console.log(`- ${unsyncedCount} records still need to be synced`);
      console.log('- The sync appears to have stopped or timed out');
      console.log('\n✅ To complete the sync, run:');
      console.log('   node scripts/batch-sync-to-production.js');
    } else if (total === 543) {
      console.log('- All 543 records have been successfully synced! ✅');
    } else {
      console.log(`- Sync in progress or partially complete (${total}/543)`);
    }
    
  } catch (error) {
    console.error('Error checking sync status:', error);
  }
}

checkDetailedSyncStatus();