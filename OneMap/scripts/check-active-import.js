const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'vf-onemap-data'
  });
}

const db = admin.firestore();

async function checkActiveImport() {
  // Check for recent batch
  const batchSnapshot = await db.collection('vf-onemap-import-batches')
    .orderBy('importedAt', 'desc')
    .limit(5)
    .get();
    
  console.log('Recent import batches:');
  batchSnapshot.forEach(doc => {
    const data = doc.data();
    const time = data.importedAt ? new Date(data.importedAt._seconds * 1000).toLocaleTimeString() : 'N/A';
    console.log(`- ${doc.id}: ${data.fileName} at ${time} - ${data.totalRecords} records`);
  });
  
  // Count records
  const count = await db.collection('vf-onemap-processed-records').count().get();
  console.log(`\nTotal records: ${count.data().count}`);
  
  // Check for June 22 specific
  const june22 = await db.collection('vf-onemap-import-batches')
    .where('fileName', '==', 'Lawley Raw Stats/Lawley June Week 3 22062025.csv')
    .get();
    
  if (!june22.empty) {
    console.log('\nJune 22 imports found:');
    june22.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.totalRecords} records, ${data.newRecords || 'N/A'} new`);
    });
  }
}

checkActiveImport().then(() => process.exit(0)).catch(console.error);