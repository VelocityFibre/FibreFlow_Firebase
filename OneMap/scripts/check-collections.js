const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
  console.log('Checking available collections...\n');
  
  try {
    // List all collections
    const collections = await db.listCollections();
    
    console.log('Available collections:');
    for (const collection of collections) {
      console.log(`- ${collection.id}`);
      
      // Get a sample document to see the structure
      const sampleDoc = await collection.limit(1).get();
      if (!sampleDoc.empty) {
        const data = sampleDoc.docs[0].data();
        const fields = Object.keys(data);
        console.log(`  Sample fields: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
        console.log(`  Document count estimate: Getting count...`);
        
        // Get document count
        const countSnapshot = await collection.count().get();
        console.log(`  Document count: ${countSnapshot.data().count}`);
      } else {
        console.log('  (Empty collection)');
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    process.exit(0);
  }
}

checkCollections().catch(console.error);