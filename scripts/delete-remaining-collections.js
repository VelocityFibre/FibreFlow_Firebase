const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../fibreflow-service-account.json');
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Collections to keep (only our restored projects and tasks)
const KEEP_COLLECTIONS = ['projects', 'tasks'];

// Delete all documents in a collection
async function deleteCollection(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });

  async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
      deleteQueryBatch(query, resolve);
    });
  }
}

async function deleteRemainingCollections() {
  console.log('🗑️  Deleting ALL remaining collections except projects and tasks...\n');
  
  try {
    // Get all collections
    const collections = await db.listCollections();
    
    const collectionsToDelete = collections
      .map(c => c.id)
      .filter(name => !KEEP_COLLECTIONS.includes(name));
    
    if (collectionsToDelete.length === 0) {
      console.log('✅ No collections to delete');
      return;
    }
    
    console.log('📋 Collections to delete:');
    for (const name of collectionsToDelete) {
      const snapshot = await db.collection(name).get();
      console.log(`   - ${name}: ${snapshot.size} documents`);
    }
    
    console.log('\n🗑️  Deleting collections...');
    
    for (const collectionName of collectionsToDelete) {
      try {
        const snapshot = await db.collection(collectionName).get();
        if (!snapshot.empty) {
          console.log(`   Deleting ${collectionName} (${snapshot.size} docs)...`);
          await deleteCollection(collectionName);
          console.log(`   ✅ Deleted ${collectionName}`);
        } else {
          console.log(`   ✓ ${collectionName} already empty`);
        }
      } catch (error) {
        console.log(`   ❌ Error deleting ${collectionName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Cleanup completed!');
    console.log('\n📊 Remaining collections:');
    console.log('   - projects: 2 documents (Mohadin & Lawley)');
    console.log('   - tasks: 28 documents (for these projects)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the cleanup
deleteRemainingCollections()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });