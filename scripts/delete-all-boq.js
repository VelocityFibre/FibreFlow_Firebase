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

async function deleteAllBOQ() {
  console.log('🔍 Checking main BOQ collection...\n');
  
  try {
    // Get all documents from BOQ collection
    const boqSnapshot = await db.collection('boq').get();
    
    if (boqSnapshot.empty) {
      console.log('ℹ️  No BOQ items found in the collection');
      return;
    }
    
    console.log(`📊 Found ${boqSnapshot.size} BOQ items\n`);
    
    // Group by project to show what we're deleting
    const itemsByProject = {};
    
    boqSnapshot.forEach(doc => {
      const data = doc.data();
      const projectId = data.projectId || 'Unknown';
      
      if (!itemsByProject[projectId]) {
        itemsByProject[projectId] = [];
      }
      
      itemsByProject[projectId].push({
        id: doc.id,
        name: data.name || data.description || 'Unnamed',
        category: data.category || 'Unknown',
        quantity: data.quantity || 0,
        unit: data.unit || ''
      });
    });
    
    // Show items grouped by project
    console.log('📋 BOQ items by project:');
    for (const [projectId, items] of Object.entries(itemsByProject)) {
      console.log(`\n   Project ID: ${projectId}`);
      console.log(`   Items: ${items.length}`);
      
      // Show first few items as examples
      items.slice(0, 3).forEach(item => {
        console.log(`     - ${item.name} (${item.quantity} ${item.unit})`);
      });
      
      if (items.length > 3) {
        console.log(`     ... and ${items.length - 3} more items`);
      }
    }
    
    console.log(`\n🗑️  Deleting all ${boqSnapshot.size} BOQ items...`);
    
    // Delete in batches
    const batch = db.batch();
    let batchCount = 0;
    let totalDeleted = 0;
    
    for (const doc of boqSnapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      
      // Commit every 500 documents
      if (batchCount >= 500) {
        await batch.commit();
        totalDeleted += batchCount;
        console.log(`   ✓ Deleted ${totalDeleted} items...`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
      totalDeleted += batchCount;
    }
    
    console.log(`\n✅ Successfully deleted all ${totalDeleted} BOQ items!`);
    console.log('\n💡 The BOQ section should now be empty.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the deletion
deleteAllBOQ()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });