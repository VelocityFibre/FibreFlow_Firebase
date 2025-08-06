const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function deleteCollection(collectionName) {
  console.log(`\n🗑️ Deleting ${collectionName}...`);
  
  const batchSize = 500; // Larger batches for efficiency
  const collectionRef = db.collection(collectionName);
  
  let totalDeleted = 0;
  
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    
    if (snapshot.empty) {
      console.log(`✅ ${collectionName} cleared! Total deleted: ${totalDeleted.toLocaleString()}`);
      break;
    }
    
    // Delete in parallel batches
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    totalDeleted += snapshot.size;
    
    console.log(`  Progress: ${totalDeleted.toLocaleString()} documents deleted...`);
  }
  
  return totalDeleted;
}

async function clearAll() {
  console.log('🚨 EFFICIENT DATABASE CLEAR - 2025-08-05');
  console.log('======================================\n');
  
  const startTime = Date.now();
  
  try {
    // Clear collections sequentially
    const processed = await deleteCollection('vf-onemap-processed-records');
    const status = await deleteCollection('vf-onemap-status-changes');
    const tracking = await deleteCollection('import-tracking');
    
    const totalDeleted = processed + status + tracking;
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n✅ DATABASE CLEARED SUCCESSFULLY!');
    console.log(`📊 Total documents deleted: ${totalDeleted.toLocaleString()}`);
    console.log(`⏱️ Time taken: ${timeTaken} seconds`);
    
    // Create fresh start marker
    await db.collection('_system').doc('fresh-start').set({
      timestamp: new Date(),
      reason: 'Cleared database to fix phantom status changes',
      fixedScriptVersion: 'bulk-import-fixed-2025-08-05.js',
      clearedBy: 'clear-database-efficient-2025-08-05.js',
      documentsDeleted: totalDeleted
    });
    
    console.log('\n📋 Next Steps:');
    console.log('1. cd firebase-import');
    console.log('2. node bulk-import-fixed-2025-08-05.js "Lawley May Week 3 22052025 - First Report.csv"');
    console.log('3. Continue with chronological imports');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  clearAll();
}