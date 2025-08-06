#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkImportBatches() {
  try {
    console.log('🔍 Checking import batches for June 30 and July 14...\n');
    
    const snapshot = await db.collection('vf-onemap-import-batches')
      .orderBy('importedAt', 'desc')
      .get();
    
    const relevantBatches = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fileName && 
          (data.fileName.includes('30062025') || 
           data.fileName.includes('14072025') ||
           data.csvDate === '2025-06-30' ||
           data.csvDate === '2025-07-14')) {
        relevantBatches.push(data);
      }
    });
    
    if (relevantBatches.length === 0) {
      console.log('❌ No import batches found for June 30 or July 14');
      
      // List all June/July imports
      console.log('\n📋 All June/July imports:');
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.csvDate && (data.csvDate.startsWith('2025-06') || data.csvDate.startsWith('2025-07'))) {
          console.log(`  ${data.csvDate}: ${data.fileName} (Batch: ${data.batchId})`);
        }
      });
    } else {
      console.log('✅ Found relevant import batches:\n');
      relevantBatches.forEach(batch => {
        console.log(`📦 Batch: ${batch.batchId}`);
        console.log(`   File: ${batch.fileName}`);
        console.log(`   CSV Date: ${batch.csvDate}`);
        console.log(`   Imported At: ${batch.importedAt?.toDate ? batch.importedAt.toDate() : batch.importedAt}`);
        console.log(`   Total Records: ${batch.totalRecords}`);
        console.log(`   Status Changes: ${batch.statusChanges}\n`);
      });
    }
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkImportBatches();