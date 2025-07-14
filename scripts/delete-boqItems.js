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

async function deleteBoqItems() {
  console.log('🗑️  Deleting all BOQ items from boqItems collection...\n');
  
  try {
    // Get all documents from boqItems collection
    const snapshot = await db.collection('boqItems').get();
    
    console.log(`📊 Found ${snapshot.size} BOQ items to delete\n`);
    
    if (snapshot.empty) {
      console.log('ℹ️  No items to delete');
      return;
    }
    
    // Delete in batches of 500
    let batch = db.batch();
    let batchCount = 0;
    let totalDeleted = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      
      // Commit batch when it reaches 500 or on last item
      if (batchCount >= 500) {
        await batch.commit();
        totalDeleted += batchCount;
        console.log(`   ✓ Deleted ${totalDeleted}/${snapshot.size} items...`);
        
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
    
    console.log(`\n✅ Successfully deleted all ${totalDeleted} BOQ items!`);
    console.log('\n💡 The BOQ section should now be empty.');
    console.log('   Refresh the page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the deletion
deleteBoqItems()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });