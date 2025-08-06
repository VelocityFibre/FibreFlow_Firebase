/**
 * CLEAR DATABASE SCRIPT - Created 2025-08-05
 * Purpose: Clear corrupted data to start fresh with fixed import script
 * 
 * ⚠️ WARNING: This will DELETE all data in the specified collections!
 * ⚠️ Make sure you've run backup-before-clear-2025-08-05.js first!
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
const serviceAccount = require('../credentials/vf-onemap-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteCollection(collectionName, batchSize = 100) {
  console.log(`\n🗑️  Deleting collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.orderBy('__name__').limit(batchSize);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject);
  });
}

async function deleteQueryBatch(query, batchSize, resolve, reject) {
  try {
    const snapshot = await query.get();
    
    // When there are no documents left, we are done
    if (snapshot.size === 0) {
      resolve();
      return;
    }
    
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`  Deleted ${snapshot.size} documents...`);
    
    // Recurse on the next process tick, to avoid exploding the stack
    process.nextTick(() => {
      deleteQueryBatch(query, batchSize, resolve, reject);
    });
    
  } catch (error) {
    reject(error);
  }
}

async function confirmAndClear() {
  console.log('🚨 DATABASE CLEAR SCRIPT - 2025-08-05');
  console.log('=====================================\n');
  console.log('This script will DELETE all data from:');
  console.log('  1. vf-onemap-processed-records');
  console.log('  2. vf-onemap-status-changes');
  console.log('  3. import-tracking');
  console.log('\n⚠️  This action cannot be undone!');
  console.log('⚠️  Make sure you have run the backup script first!\n');
  
  rl.question('Type "DELETE ALL DATA" to proceed: ', async (answer) => {
    if (answer === 'DELETE ALL DATA') {
      console.log('\n🔥 Starting database clear...\n');
      
      try {
        // Delete main collections
        await deleteCollection('vf-onemap-processed-records');
        console.log('✅ Cleared vf-onemap-processed-records');
        
        await deleteCollection('vf-onemap-status-changes');
        console.log('✅ Cleared vf-onemap-status-changes');
        
        await deleteCollection('import-tracking');
        console.log('✅ Cleared import-tracking');
        
        // Create fresh start marker
        await db.collection('_system').doc('fresh-start').set({
          timestamp: new Date(),
          reason: 'Cleared database to fix phantom status changes',
          fixedScriptVersion: 'bulk-import-fixed-2025-08-05.js',
          clearedBy: 'clear-database-2025-08-05.js'
        });
        
        console.log('\n✅ DATABASE CLEARED SUCCESSFULLY!');
        console.log('\n📋 Next Steps:');
        console.log('1. Use bulk-import-fixed-2025-08-05.js for all imports');
        console.log('2. Import files chronologically starting from May');
        console.log('3. Verify no phantom status changes are created');
        
      } catch (error) {
        console.error('\n❌ Error clearing database:', error);
      }
      
    } else {
      console.log('\n❌ Cancelled - no data was deleted');
    }
    
    rl.close();
    process.exit(0);
  });
}

// Run the script
confirmAndClear();