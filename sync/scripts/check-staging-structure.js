const admin = require('firebase-admin');
const serviceAccount = require('../config/service-accounts/vf-onemap-data-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkStructure() {
  try {
    // List collections
    const collections = await db.listCollections();
    console.log('Collections in staging DB:');
    for (const col of collections) {
      console.log(' -', col.id);
    }
    
    // Check vf-onemap-processed-records collection
    console.log('\nChecking vf-onemap-processed-records collection...');
    const snapshot = await db.collection('vf-onemap-processed-records')
      .where('Status', '==', 'Pole Permission: Approved')
      .limit(5)
      .get();
    
    console.log(`Found ${snapshot.size} documents with "Pole Permission: Approved" status`);
    
    if (!snapshot.empty) {
      console.log('\nSample approved pole:');
      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log('- Pole Number:', data['Pole Number']);
      console.log('- Status:', data.Status);
      console.log('- Address:', data.Address);
      console.log('- Field Agent:', data['Field Agent']);
    }
    
    // Count total approved
    const countSnapshot = await db.collection('vf-onemap-processed-records')
      .where('Status', '==', 'Pole Permission: Approved')
      .count()
      .get();
    
    console.log(`\nTotal approved records: ${countSnapshot.data().count}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkStructure();