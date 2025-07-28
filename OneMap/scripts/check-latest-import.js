#\!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkLatestImport() {
  try {
    // Get latest import batch
    const snapshot = await db.collection('vf-onemap-import-batches')
      .orderBy('importedAt', 'desc')
      .limit(5)
      .get();
    
    console.log('📊 Latest Import Batches:\n');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const importDate = data.importedAt ? new Date(data.importedAt._seconds * 1000).toISOString() : 'Unknown';
      console.log(`📁 ${data.fileName}`);
      console.log(`   Batch ID: ${data.batchId}`);
      console.log(`   Records: ${data.totalRecords}`);
      console.log(`   New Records: ${data.newRecords || 'N/A'}`);
      console.log(`   Status Changes: ${data.statusChanges || 'N/A'}`);
      console.log(`   Imported: ${importDate}`);
      console.log(`   Status: ${data.status}\n`);
    });
    
    // Get total record count
    const recordsSnapshot = await db.collection('vf-onemap-processed-records')
      .select() // Empty select just gets document IDs
      .get();
    
    console.log(`📊 Total Records in Database: ${recordsSnapshot.size}`);
    
    await admin.app().delete();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLatestImport();
EOF < /dev/null
