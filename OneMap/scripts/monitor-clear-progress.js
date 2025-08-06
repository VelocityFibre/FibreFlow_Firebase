const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkProgress() {
  console.log('📊 Checking clear progress...\n');
  
  try {
    const processedCount = await db.collection('vf-onemap-processed-records').count().get();
    const statusCount = await db.collection('vf-onemap-status-changes').count().get();
    const importCount = await db.collection('import-tracking').count().get();
    
    console.log(`vf-onemap-processed-records: ${processedCount.data().count.toLocaleString()} documents`);
    console.log(`vf-onemap-status-changes: ${statusCount.data().count.toLocaleString()} documents`);
    console.log(`import-tracking: ${importCount.data().count.toLocaleString()} documents`);
    
    const total = processedCount.data().count + statusCount.data().count + importCount.data().count;
    
    if (total === 0) {
      console.log('\n⚠️  DATABASE IS EMPTY');
      console.log('🎯 Ready for imports');
      
      // Check if evidence was preserved
      const evidenceCount = await db.collection('EVIDENCE_2025-08-05_phantom-changes').count().get();
      console.log(`\n📸 Evidence preserved: ${evidenceCount.data().count} documents`);
    } else {
      console.log(`\n⏳ Still clearing... ${total.toLocaleString()} documents remaining`);
      console.log('💡 Run this script again to check progress');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkProgress();