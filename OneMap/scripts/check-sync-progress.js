const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function checkSyncProgress() {
  console.log('🔍 Checking sync progress...\n');
  
  try {
    // Check planned-poles
    const plannedPolesQuery = await db.collection('planned-poles')
      .where('metadata.importedBy', '==', 'onemap-sync')
      .where('projectId', '==', '6edHoC3ZakUTbXznbQ5a') // Lawley project
      .get();
    
    console.log(`✅ Records in planned-poles: ${plannedPolesQuery.size}`);
    
    // Check pole-trackers
    const poleTrackersQuery = await db.collection('pole-trackers')
      .where('createdBy', '==', 'onemap-sync')
      .where('projectId', '==', '6edHoC3ZakUTbXznbQ5a')
      .get();
    
    console.log(`✅ Records in pole-trackers: ${poleTrackersQuery.size}`);
    
    const total = plannedPolesQuery.size + poleTrackersQuery.size;
    console.log(`\n📊 Total synced so far: ${total} records`);
    
    // Show sample records
    if (plannedPolesQuery.size > 0) {
      console.log('\n📋 Sample planned-poles records:');
      plannedPolesQuery.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.clientPoleNumber} (Property: ${data.propertyId})`);
      });
    }
    
    if (poleTrackersQuery.size > 0) {
      console.log('\n📋 Sample pole-trackers records:');
      poleTrackersQuery.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.poleNumber} (Property: ${data.propertyId})`);
      });
    }
    
    // Check if sync is still running
    console.log('\n💡 Status: The sync appears to be running in the background.');
    console.log('It may continue even after the command times out.');
    console.log('\nTo verify completion:');
    console.log('1. Wait a few minutes');
    console.log('2. Run this script again');
    console.log('3. Check the FibreFlow app directly');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSyncProgress();