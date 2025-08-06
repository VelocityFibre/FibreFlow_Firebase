const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function clearStatusChanges() {
  console.log('🗑️ Clearing remaining status changes...\n');
  
  const batchSize = 500;
  const collectionRef = db.collection('vf-onemap-status-changes');
  let totalDeleted = 0;
  
  try {
    while (true) {
      const snapshot = await collectionRef.limit(batchSize).get();
      
      if (snapshot.empty) {
        console.log(`\n✅ All status changes cleared!`);
        console.log(`📊 Total deleted: ${totalDeleted.toLocaleString()} documents`);
        break;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      totalDeleted += snapshot.size;
      
      console.log(`Progress: ${totalDeleted.toLocaleString()} documents deleted...`);
    }
    
    // Final check
    const finalCount = await db.collection('vf-onemap-status-changes').count().get();
    console.log(`\nFinal check: ${finalCount.data().count} documents remaining`);
    
    if (finalCount.data().count === 0) {
      console.log('\n🎉 DATABASE COMPLETELY CLEARED!');
      console.log('\n📋 Ready for fresh imports with:');
      console.log('cd firebase-import');
      console.log('node bulk-import-fixed-2025-08-05.js "Lawley May Week 3 22052025 - First Report.csv"');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

clearStatusChanges();