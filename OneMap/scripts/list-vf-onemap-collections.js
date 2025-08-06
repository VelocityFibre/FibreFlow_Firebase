const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function listCollections() {
  console.log('Listing all collections in vf-onemap-data database...\n');
  
  try {
    const collections = await db.listCollections();
    
    console.log(`Found ${collections.length} collections:\n`);
    
    for (const collection of collections) {
      // Get document count
      const snapshot = await collection.limit(5).get();
      console.log(`- ${collection.id} (sample size: ${snapshot.size} docs)`);
      
      // Show sample document structure
      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data();
        console.log(`  Sample doc ID: ${firstDoc.id}`);
        console.log(`  Fields: ${Object.keys(data).slice(0, 10).join(', ')}${Object.keys(data).length > 10 ? '...' : ''}`);
        
        // Check for status-related fields
        const statusFields = Object.keys(data).filter(key => 
          key.toLowerCase().includes('status') || 
          key.toLowerCase().includes('state')
        );
        if (statusFields.length > 0) {
          console.log(`  Status fields: ${statusFields.join(', ')}`);
        }
      }
      console.log('');
    }
    
    // Let's specifically look for the import-tracking collection since we're looking for status changes
    console.log('\nChecking for import tracking data...');
    const importTracking = await db.collection('import-tracking').limit(5).get();
    if (!importTracking.empty) {
      console.log(`Found ${importTracking.size} import tracking documents`);
      
      importTracking.forEach(doc => {
        const data = doc.data();
        console.log(`\nImport batch: ${doc.id}`);
        console.log(`Fields: ${Object.keys(data).join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

listCollections();