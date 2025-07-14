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

async function deleteAllPoleTrackers() {
  console.log('🗑️  Deleting all pole tracker entries...\n');
  
  try {
    // Get all documents from pole-trackers collection
    const snapshot = await db.collection('pole-trackers').get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No pole tracker entries found');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} pole tracker entries\n`);
    
    // Show what we're deleting
    console.log('📋 Pole entries to delete:');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.projectName || 'Unknown Project'} (${data.location || 'No location'})`);
    });
    
    console.log(`\n🗑️  Deleting all ${snapshot.size} pole tracker entries...`);
    
    // Delete in batches
    let batch = db.batch();
    let batchCount = 0;
    let totalDeleted = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      
      // Commit batch when it reaches 500
      if (batchCount >= 500) {
        await batch.commit();
        totalDeleted += batchCount;
        console.log(`   ✓ Deleted ${totalDeleted}/${snapshot.size} entries...`);
        
        // Start new batch
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit any remaining documents
    if (batchCount > 0) {
      await batch.commit();
      totalDeleted += batchCount;
    }
    
    console.log(`\n✅ Successfully deleted all ${totalDeleted} pole tracker entries!`);
    console.log('\n💡 The pole tracker section is now empty.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the deletion
deleteAllPoleTrackers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });