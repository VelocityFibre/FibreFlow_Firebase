#!/usr/bin/env node

/**
 * Detailed Status History for Pole LAW.P.C518
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function showPoleDetails() {
  console.log('🏗️ DETAILED STATUS HISTORY FOR POLE LAW.P.C518\n');
  console.log('Database: vf-onemap-data (OneMap Database - NOT FibreFlow)');
  console.log('=' .repeat(60) + '\n');
  
  // Get all changes for this pole
  const poleHistory = await db.collection('vf-onemap-status-changes')
    .where('poleNumber', '==', 'LAW.P.C518')
    .orderBy('changeDate', 'asc')
    .get();
  
  console.log(`Found ${poleHistory.size} status changes for pole LAW.P.C518:\n`);
  
  let changeNum = 1;
  poleHistory.forEach(doc => {
    const data = doc.data();
    console.log(`Change #${changeNum}:`);
    console.log(`  Date: ${data.changeDate}`);
    console.log(`  Property ID: ${data.propertyId}`);
    console.log(`  Status Change: ${data.fromStatus} → ${data.toStatus}`);
    console.log(`  Agent: ${data.agent || 'No Agent'}`);
    console.log(`  Days in Previous Status: ${data.daysInPreviousStatus || 'N/A'}`);
    console.log(`  Location: ${data.locationAddress || 'Not specified'}`);
    console.log(`  Import Batch: ${data.importBatch}`);
    console.log(`  Source File: ${data.sourceFile}`);
    console.log('');
    changeNum++;
  });
  
  // Show which properties are associated with this pole
  const properties = new Set();
  poleHistory.forEach(doc => {
    properties.add(doc.data().propertyId);
  });
  
  console.log(`\n📍 Properties Associated with Pole LAW.P.C518:`);
  console.log(`Total: ${properties.size} unique properties`);
  Array.from(properties).forEach(prop => {
    console.log(`  - Property ${prop}`);
  });
  
  // Show current status of each property
  console.log(`\n📊 Current Status of Each Property:`);
  for (const propertyId of properties) {
    // Get the latest status for this property
    const latestStatus = await db.collection('vf-onemap-status-changes')
      .where('propertyId', '==', propertyId)
      .where('isLatestStatus', '==', true)
      .limit(1)
      .get();
    
    if (!latestStatus.empty) {
      const status = latestStatus.docs[0].data().toStatus;
      console.log(`  Property ${propertyId}: ${status}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('⚠️  IMPORTANT: This data is from the vf-onemap-data database');
  console.log('    This is the OneMap import database, NOT the FibreFlow production database');
  console.log('    Database: vf-onemap-data (Firebase project for OneMap imports)');
}

// Run
showPoleDetails()
  .then(() => process.exit())
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });