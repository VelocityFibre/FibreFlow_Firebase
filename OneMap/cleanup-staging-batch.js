#!/usr/bin/env node

/**
 * Batch delete OneMap staging collections
 * Processes in small batches to avoid timeouts
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 50) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject);
  });
}

function deleteQueryBatch(query, batchSize, resolve, reject) {
  query.get()
    .then((snapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    })
    .then((numDeleted) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(query, batchSize, resolve, reject);
      });
    })
    .catch(reject);
}

async function main() {
  console.log('🧹 OneMap Staging Cleanup (Batch Mode)');
  console.log('=====================================');
  console.log('Deleting in batches of 50 documents...\n');

  try {
    // Clean onemap-processing-staging
    console.log('📋 Deleting onemap-processing-staging...');
    await deleteCollection('onemap-processing-staging', 50);
    console.log('✅ onemap-processing-staging deleted!\n');

    // Clean onemap-processing-imports
    console.log('📋 Deleting onemap-processing-imports...');
    await deleteCollection('onemap-processing-imports', 50);
    console.log('✅ onemap-processing-imports deleted!\n');

    console.log('🎉 Staging cleanup complete!');
    console.log('Your production data remains safe and untouched.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0));
}