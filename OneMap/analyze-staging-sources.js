#!/usr/bin/env node

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function analyzeStaging() {
  console.log('🔍 Analyzing Staging Database Sources\n');
  
  // Get all unique batch IDs
  const batchIds = new Map();
  
  console.log('Loading batch information...');
  let processed = 0;
  let lastDoc = null;
  
  while (true) {
    let query = db.collection('onemap-processing-staging')
      .select('import_batch_id')
      .limit(1000);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) break;
    
    snapshot.forEach(doc => {
      const batchId = doc.data().import_batch_id;
      if (batchId) {
        batchIds.set(batchId, (batchIds.get(batchId) || 0) + 1);
      }
      processed++;
    });
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Processed ${processed} records...`);
  }
  
  // Get import batch details
  console.log('\nChecking import batch details...');
  const importDetails = [];
  
  for (const [batchId, count] of batchIds.entries()) {
    const importDoc = await db.collection('onemap-processing-imports').doc(batchId).get();
    if (importDoc.exists) {
      const data = importDoc.data();
      importDetails.push({
        batchId,
        count,
        fileName: data.fileName || 'Unknown',
        importDate: data.importDate || data.import_date,
        status: data.status
      });
    } else {
      importDetails.push({
        batchId,
        count,
        fileName: 'No import record found',
        importDate: null,
        status: 'Unknown'
      });
    }
  }
  
  // Sort by count
  importDetails.sort((a, b) => b.count - a.count);
  
  console.log('\n# Staging Database Source Analysis\n');
  console.log('## Import Batches Found:');
  console.log(`Total batches: ${importDetails.length}`);
  console.log(`Total records: ${processed}\n`);
  
  console.log('## Batch Details:');
  importDetails.forEach(batch => {
    console.log(`\n### ${batch.batchId}`);
    console.log(`- Records: ${batch.count}`);
    console.log(`- File: ${batch.fileName}`);
    console.log(`- Status: ${batch.status}`);
  });
  
  // Check for records without batch IDs
  const noBatchCount = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', null)
    .select()
    .get();
  
  console.log(`\n## Records without batch ID: ${noBatchCount.size}`);
  
  // Summary
  console.log('\n## Summary:');
  console.log('The staging database contains data from multiple sources:');
  
  const june3Batches = importDetails.filter(b => b.fileName.includes('03062025'));
  const june5Batches = importDetails.filter(b => b.fileName.includes('05062025'));
  const otherBatches = importDetails.filter(b => 
    !b.fileName.includes('03062025') && !b.fileName.includes('05062025')
  );
  
  console.log(`- June 3rd batches: ${june3Batches.length} (${june3Batches.reduce((sum, b) => sum + b.count, 0)} records)`);
  console.log(`- June 5th batches: ${june5Batches.length} (${june5Batches.reduce((sum, b) => sum + b.count, 0)} records)`);
  console.log(`- Other batches: ${otherBatches.length} (${otherBatches.reduce((sum, b) => sum + b.count, 0)} records)`);
  console.log(`- No batch ID: ${noBatchCount.size} records`);
  
  console.log('\nThis explains why staging has more records than just June 3 + June 5 CSVs!');
}

analyzeStaging().catch(console.error);