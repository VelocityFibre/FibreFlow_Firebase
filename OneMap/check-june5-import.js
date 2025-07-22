#!/usr/bin/env node

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkImport() {
  // Check recent June 5 import
  const june5Import = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '==', 'IMP_JUNE5_1753204272721')
    .select('property_id')
    .get();
  
  console.log(`Records imported in partial June 5 batch: ${june5Import.size}`);
  
  // Check total staging count
  const totalCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  console.log(`Total records now in staging: ${totalCount.size}`);
  
  // Check June 5 import record
  const importDoc = await db.collection('onemap-processing-imports')
    .doc('IMP_JUNE5_1753204272721')
    .get();
  
  if (importDoc.exists) {
    console.log('Import record:', importDoc.data());
  }
}

checkImport().catch(console.error);