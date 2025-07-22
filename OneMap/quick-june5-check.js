#\!/usr/bin/env node

const admin = require('firebase-admin');
if (\!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function quickCheck() {
  console.log('Quick June 5th Status Check\n');
  
  // Check total staging
  const staging = await db.collection('onemap-processing-staging').select().get();
  console.log(`Total staging records: ${staging.size}`);
  
  // Check specific June 5 batches
  const batches = [
    'IMP_JUNE5_1753204272721',
    'IMP_JUNE5_CONTINUE_1753205172726', 
    'IMP_JUNE5_FINAL_1753206178738'
  ];
  
  let total = 0;
  for (const batchId of batches) {
    const batch = await db.collection('onemap-processing-staging')
      .where('import_batch_id', '==', batchId)
      .select()
      .get();
    console.log(`${batchId}: ${batch.size} records`);
    total += batch.size;
  }
  
  console.log(`\nTotal June 5 imported: ${total}`);
  console.log(`Expected: 6,039`);
  console.log(`Status: ${total >= 6000 ? '✅ Import likely complete\!' : '⚠️  Import incomplete'}`);
  
  // Quick sample check
  const testIds = ['248000', '250000', '252000', '254000', '256000'];
  console.log('\nSample checks:');
  for (const id of testIds) {
    const doc = await db.collection('onemap-processing-staging').doc(id).get();
    console.log(`${id}: ${doc.exists ? '✓' : '✗'}`);
  }
}

quickCheck().catch(console.error);
EOF < /dev/null
