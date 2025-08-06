const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkImport() {
  console.log('🔍 Checking actual import results...\n');
  
  try {
    // Get actual count
    const processedCount = await db.collection('vf-onemap-processed-records').count().get();
    console.log(`Records in database: ${processedCount.data().count}`);
    
    // Check a few records
    const sample = await db.collection('vf-onemap-processed-records').limit(5).get();
    
    if (!sample.empty) {
      console.log('\nSample records:');
      sample.forEach(doc => {
        const data = doc.data();
        console.log(`- ${doc.id}: ${data.status || 'No status'} (Import: ${data.importBatch || 'Unknown'})`);
      });
    }
    
    // Check latest import batch
    const latest = await db.collection('vf-onemap-processed-records')
      .where('importBatch', '>=', 'FIXED_2025-08-05')
      .limit(10)
      .get();
    
    console.log(`\nRecords from today's import: ${latest.size}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkImport();