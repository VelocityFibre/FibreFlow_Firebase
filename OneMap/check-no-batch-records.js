#!/usr/bin/env node

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkNoBatchRecords() {
  console.log('🔍 Checking records without batch IDs\n');
  
  // Count all records
  const allRecords = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  console.log(`Total staging records: ${allRecords.size}`);
  
  // Count records WITH batch IDs
  const withBatchIds = new Set();
  const batchCounts = new Map();
  
  let processed = 0;
  let lastDoc = null;
  
  while (true) {
    let query = db.collection('onemap-processing-staging')
      .select('property_id', 'import_batch_id')
      .limit(1000);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) break;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.import_batch_id) {
        withBatchIds.add(data.property_id || doc.id);
        batchCounts.set(data.import_batch_id, (batchCounts.get(data.import_batch_id) || 0) + 1);
      }
      processed++;
    });
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  
  console.log(`\nRecords WITH batch IDs: ${withBatchIds.size}`);
  console.log(`Records WITHOUT batch IDs: ${allRecords.size - withBatchIds.size}`);
  
  // Sample some records without batch IDs
  console.log('\nSampling records to understand the data...');
  
  const sampleSnapshot = await db.collection('onemap-processing-staging')
    .limit(5)
    .get();
  
  console.log('\nSample records structure:');
  sampleSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nProperty ID: ${doc.id}`);
    console.log(`- Has batch ID: ${data.import_batch_id ? 'Yes - ' + data.import_batch_id : 'No'}`);
    console.log(`- Has current_data: ${data.current_data ? 'Yes' : 'No'}`);
    console.log(`- First seen: ${data.first_seen_date ? new Date(data.first_seen_date._seconds * 1000).toISOString() : 'Unknown'}`);
    if (data.current_data) {
      console.log(`- Status: ${data.current_data.Status}`);
      console.log(`- Location: ${data.current_data['Location Address']}`);
    }
  });
  
  // Summary of batch IDs
  console.log('\n## Batch ID Summary:');
  [...batchCounts.entries()]
    .sort(([,a], [,b]) => b - a)
    .forEach(([batchId, count]) => {
      console.log(`- ${batchId}: ${count} records`);
    });
  
  console.log(`\n## Analysis:
- Total records: ${allRecords.size}
- With batch IDs: ${withBatchIds.size}
- Without batch IDs: ${allRecords.size - withBatchIds.size}

The ${allRecords.size - withBatchIds.size} records without batch IDs are likely:
1. June 3rd initial import (before batch tracking was added)
2. Early test imports
3. Manual data additions

This explains the discrepancy between CSV totals and staging totals!`);
}

checkNoBatchRecords().catch(console.error);