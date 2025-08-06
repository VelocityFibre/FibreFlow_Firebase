const admin = require('firebase-admin');
const serviceAccount = require('../config/service-accounts/vf-onemap-data-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkFields() {
  try {
    console.log('Checking actual field names in vf-onemap-data...\n');
    
    // Get a sample document
    const snapshot = await db.collection('vf-onemap-processed-records')
      .limit(3)
      .get();
    
    if (!snapshot.empty) {
      snapshot.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1} (ID: ${doc.id}):`);
        const data = doc.data();
        
        // Look for status-related fields
        Object.keys(data).forEach(key => {
          if (key.toLowerCase().includes('status') || 
              key.toLowerCase().includes('state') ||
              key.toLowerCase().includes('approval') ||
              key.toLowerCase().includes('permission')) {
            console.log(`  ${key}: ${data[key]}`);
          }
        });
        
        // Show pole and other key fields
        console.log(`  poleNumber: ${data.poleNumber}`);
        console.log(`  dropNumber: ${data.dropNumber}`);
        console.log(`  locationAddress: ${data.locationAddress}`);
        
        // Show all fields if first document
        if (index === 0) {
          console.log('\n  All fields:', Object.keys(data).sort().join(', '));
        }
      });
    }
    
    // Check status changes structure
    console.log('\n\nChecking vf-onemap-status-changes structure...');
    const statusSnapshot = await db.collection('vf-onemap-status-changes')
      .limit(3)
      .get();
    
    if (!statusSnapshot.empty) {
      const doc = statusSnapshot.docs[0];
      const data = doc.data();
      console.log('Sample status change document:');
      console.log('Fields:', Object.keys(data).sort().join(', '));
      console.log('\nSample values:');
      Object.entries(data).slice(0, 10).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkFields();