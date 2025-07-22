#!/usr/bin/env node

/**
 * Quick check of staging database status
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkStatus() {
  console.log('🔍 Checking OneMap staging status...\n');
  
  // Check staging collection
  const stagingSnapshot = await db.collection('onemap-processing-staging')
    .limit(10)
    .get();
  
  console.log(`📊 Staging collection sample size: ${stagingSnapshot.size}`);
  
  // Count total (approximate)
  const countSnapshot = await db.collection('onemap-processing-staging')
    .select('property_id')
    .get();
  
  console.log(`📊 Total records in staging: ${countSnapshot.size}`);
  
  // Check imports
  const importsSnapshot = await db.collection('onemap-processing-imports')
    .orderBy('importDate', 'desc')
    .limit(5)
    .get();
  
  console.log(`\n📋 Recent imports:`);
  importsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.importId}: ${data.recordsProcessed || 0} records, Status: ${data.status}`);
  });
  
  // Check for June data
  const juneRecords = await db.collection('onemap-processing-staging')
    .where('import_batch_id', '>=', 'IMP_2025-06')
    .where('import_batch_id', '<', 'IMP_2025-07')
    .limit(5)
    .get();
  
  console.log(`\n📅 June import records found: ${juneRecords.size}`);
}

checkStatus().catch(console.error);