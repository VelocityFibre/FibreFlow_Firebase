const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'vf-onemap-data'
  });
}

const db = admin.firestore();

async function quickCount() {
  const snapshot = await db.collection('vf-onemap-processed-records')
    .select() // Only get document IDs, not data
    .get();
  
  console.log(`Total records: ${snapshot.size}`);
  
  // Get latest batch
  const batchSnapshot = await db.collection('vf-onemap-import-batches')
    .orderBy('importedAt', 'desc')
    .limit(1)
    .get();
    
  if (!batchSnapshot.empty) {
    const batch = batchSnapshot.docs[0].data();
    console.log(`Latest import: ${batch.fileName} - ${batch.newRecords || 0} new records`);
  }
}

quickCount().then(() => process.exit(0)).catch(console.error);