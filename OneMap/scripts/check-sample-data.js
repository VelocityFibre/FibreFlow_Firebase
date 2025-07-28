const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSampleData() {
  console.log('Checking sample VF OneMap data structure...\n');
  
  try {
    const collection = db.collection('vf-onemap-processed-records');
    const sampleDocs = await collection.limit(3).get();
    
    if (sampleDocs.empty) {
      console.log('No documents found!');
      return;
    }
    
    sampleDocs.forEach((doc, index) => {
      console.log(`\n=== Sample Document ${index + 1} ===`);
      console.log(`Document ID: ${doc.id}`);
      
      const data = doc.data();
      const fields = Object.keys(data).sort();
      
      console.log('\nAll fields:');
      fields.forEach(field => {
        const value = data[field];
        const type = typeof value;
        const displayValue = type === 'string' ? `"${value}"` : 
                           type === 'object' && value ? JSON.stringify(value).substring(0, 100) + '...' :
                           String(value);
        console.log(`  ${field}: ${displayValue} (${type})`);
      });
      
      // Look for pole-related fields
      const poleFields = fields.filter(f => 
        f.toLowerCase().includes('pole') || 
        f.toLowerCase().includes('drop') ||
        f.toLowerCase().includes('number')
      );
      
      if (poleFields.length > 0) {
        console.log(`\nPole-related fields: ${poleFields.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking sample data:', error);
  } finally {
    process.exit(0);
  }
}

checkSampleData().catch(console.error);