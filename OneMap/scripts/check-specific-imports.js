#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkSpecificImports() {
  try {
    console.log('🔍 Checking specific import batches...\n');
    
    // Check July 8 import
    const july8Batch = await db.collection('vf-onemap-import-batches')
      .where('fileName', '==', 'Lawley July Week 2 08072025.csv')
      .get();
    
    console.log('📋 July 8 Import:');
    july8Batch.forEach(doc => {
      const data = doc.data();
      console.log('- Batch ID:', data.batchId);
      console.log('- Import Time:', data.importedAt?.toDate ? data.importedAt.toDate() : data.importedAt);
      console.log('- Status Changes:', data.statusChanges);
      console.log('- Total Records:', data.totalRecords);
    });
    
    // Check July 18 import
    const july18Batch = await db.collection('vf-onemap-import-batches')
      .where('fileName', '==', 'Lawley July Week 3 18072025.csv')
      .get();
    
    console.log('\n📋 July 18 Import:');
    july18Batch.forEach(doc => {
      const data = doc.data();
      console.log('- Batch ID:', data.batchId);
      console.log('- Import Time:', data.importedAt?.toDate ? data.importedAt.toDate() : data.importedAt);
      console.log('- Status Changes:', data.statusChanges);
      console.log('- Total Records:', data.totalRecords);
    });
    
    // Now let's check the actual CSV data for July 8
    console.log('\n🔍 Checking if we can verify the CSV content...');
    console.log('Run these commands to check the actual CSV files:');
    console.log('grep "308025" downloads/"Lawley July Week 2 08072025.csv" | cut -d";" -f1,4');
    console.log('grep "308025" downloads/"Lawley July Week 3 18072025.csv" | cut -d";" -f1,4');
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSpecificImports();