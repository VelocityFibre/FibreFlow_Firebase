#\!/usr/bin/env node

const admin = require('firebase-admin');
if (\!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkStats() {
  console.log('🔍 Checking Import Statistics\n');
  
  // Check actual count in staging
  const stagingCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  console.log(`📊 Total records in staging: ${stagingCount.size}`);
  
  // Check June 5 specific batches we know about
  console.log('\nChecking known June 5 batches:');
  
  const batch1 = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_1753204272721')
    .select()
    .get();
  console.log(`- Batch 1 (IMP_JUNE5_1753204272721): ${batch1.size} records`);
  
  const batch2 = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_CONTINUE_1753205172726')
    .select()
    .get();
  console.log(`- Batch 2 (IMP_JUNE5_CONTINUE_1753205172726): ${batch2.size} records`);
  
  const totalJune5 = batch1.size + batch2.size;
  console.log(`\n✅ Total June 5 imported so far: ${totalJune5}`);
  console.log(`📊 Expected June 5 total: 6,039`);
  console.log(`📊 Remaining to import: ${6039 - totalJune5}`);
  
  // Check a few specific Property IDs to see if they exist
  console.log('\nSample checks:');
  const sampleIds = ['255000', '255500', '256000', '256500'];
  for (const id of sampleIds) {
    const doc = await db.collection('onemap-processing-staging').doc(id).get();
    console.log(`Property ${id}: ${doc.exists ? 'EXISTS' : 'NOT FOUND'}`);
  }
  
  // Estimate if we need to continue
  if (totalJune5 < 6039) {
    console.log(`\n⚠️  Import incomplete. Need to import ${6039 - totalJune5} more records.`);
    console.log('Run the final import script to complete the process.');
  } else {
    console.log('\n✅ June 5th import appears to be complete\!');
  }
}

checkStats().catch(console.error);
EOF < /dev/null
