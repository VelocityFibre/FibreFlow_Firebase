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

async function listAllCollections() {
  console.log('📊 Listing all Firestore collections and document counts:\n');
  
  try {
    // Get all collections
    const collections = await db.listCollections();
    
    console.log(`Found ${collections.length} collections:\n`);
    
    for (const collection of collections) {
      const snapshot = await collection.get();
      console.log(`📁 ${collection.id}: ${snapshot.size} documents`);
      
      // If it's a small collection, show the documents
      if (snapshot.size > 0 && snapshot.size <= 10) {
        snapshot.forEach(doc => {
          const data = doc.data();
          const preview = data.name || data.description || data.title || doc.id;
          console.log(`   - ${doc.id}: ${preview}`);
        });
      }
    }
    
    // Specifically check for BOQ-related collections
    console.log('\n🔍 Checking BOQ-related collections:');
    const boqVariations = ['boq', 'BOQ', 'billOfQuantities', 'BoQ', 'materials', 'projectMaterials'];
    
    for (const name of boqVariations) {
      try {
        const snapshot = await db.collection(name).get();
        if (!snapshot.empty) {
          console.log(`   ✓ ${name}: ${snapshot.size} documents`);
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
listAllCollections()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });