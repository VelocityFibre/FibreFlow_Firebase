#\!/usr/bin/env node

const admin = require('firebase-admin');
if (\!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function summarize() {
  console.log('📊 Staging Database Summary\n');
  
  // Total count
  const total = await db.collection('onemap-processing-staging').select().get();
  console.log(`Total records in staging: ${total.size}`);
  
  // Check a few specific batch IDs we know about
  const knownBatches = [
    { id: 'IMP_2025-07-22T14-31-52-652Z', name: 'June 3 initial' },
    { id: 'IMP_JUNE5_1753204272721', name: 'June 5 batch 1' },
    { id: 'IMP_JUNE5_CONTINUE_1753205172726', name: 'June 5 batch 2' },
    { id: 'IMP_JUNE5_FINAL_1753206178738', name: 'June 5 batch 3' },
    { id: 'SIMPLE_2025-07-22T18-15-25-478Z', name: 'June 5 simple' }
  ];
  
  let totalWithBatch = 0;
  console.log('\nKnown import batches:');
  
  for (const batch of knownBatches) {
    const count = await db.collection('onemap-processing-staging')
      .where('import_batch_id', '==', batch.id)
      .select()
      .get();
    
    if (count.size > 0) {
      console.log(`- ${batch.name} (${batch.id}): ${count.size} records`);
      totalWithBatch += count.size;
    }
  }
  
  console.log(`\nTotal with known batch IDs: ${totalWithBatch}`);
  console.log(`Records without these batch IDs: ${total.size - totalWithBatch}`);
  
  // Check for the specific June 3rd batch ID
  const june3Batch = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_2025-07-22T14-31-52-652Z')
    .select()
    .get();
  
  console.log(`\n## Analysis Summary:`);
  console.log(`- June 3rd records (batch IMP_2025-07-22T14-31-52-652Z): ${june3Batch.size}`);
  console.log(`- June 5th records (all batches): ~${totalWithBatch - june3Batch.size}`);
  console.log(`- Other/unknown records: ${total.size - totalWithBatch}`);
  
  console.log(`\n## Explanation of ${total.size} total records:`);
  console.log(`1. June 3rd CSV had 3,487 unique Property IDs`);
  console.log(`2. June 5th CSV had 6,039 unique Property IDs`);
  console.log(`3. Overlap between files: ~3,484 Property IDs`);
  console.log(`4. Expected unique total: ~6,042`);
  console.log(`5. Actual staging: ${total.size}`);
  console.log(`6. Extra records: ${total.size - 6042}`);
  
  console.log(`\nThe extra ${total.size - 6042} records are likely from:`);
  console.log(`- Initial June 3rd import (8,944 records before deduplication)`);
  console.log(`- Test imports and failed batches`);
  console.log(`- Records imported without batch IDs`);
}

summarize().catch(console.error);
EOF < /dev/null
