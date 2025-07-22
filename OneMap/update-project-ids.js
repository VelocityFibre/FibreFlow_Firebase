#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function updateProjectIds() {
  console.log('🔍 Finding and updating records from staging...\n');
  
  // Get all property IDs from staging
  const stagingSnapshot = await db.collection('onemap-processing-staging').get();
  const stagingPropertyIds = new Set(stagingSnapshot.docs.map(doc => doc.data().propertyId));
  
  console.log(`Found ${stagingPropertyIds.size} property IDs in staging\n`);
  
  // Check planned-poles
  const plannedSnapshot = await db.collection('planned-poles').get();
  
  let toUpdate = [];
  let alreadyCorrect = 0;
  
  plannedSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const propId = doc.id.replace('PROP_', '');
    
    // If this property is in our staging data
    if (stagingPropertyIds.has(propId)) {
      if (data.projectId !== 'Law-001') {
        toUpdate.push(doc.ref);
      } else {
        alreadyCorrect++;
      }
    }
  });
  
  console.log(`Records needing projectId update: ${toUpdate.length}`);
  console.log(`Records already correct: ${alreadyCorrect}`);
  
  if (toUpdate.length > 0) {
    console.log('\nUpdating projectId to Law-001...');
    
    let updated = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const docRef of toUpdate) {
      batch.update(docRef, { 
        projectId: 'Law-001',
        projectUpdatedAt: FieldValue.serverTimestamp()
      });
      batchCount++;
      
      if (batchCount >= 500) {
        await batch.commit();
        updated += batchCount;
        console.log(`  ✅ Updated ${updated} records...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      updated += batchCount;
    }
    
    console.log(`\n✅ Successfully updated ${updated} records with projectId: Law-001`);
  }
  
  // Final check
  const finalSnapshot = await db.collection('planned-poles')
    .where('projectId', '==', 'Law-001')
    .get();
    
  console.log(`\n📊 FINAL STATUS:`);
  console.log(`Total Lawley records in production: ${finalSnapshot.size}`);
  console.log(`Total in staging: ${stagingSnapshot.size}`);
  
  if (finalSnapshot.size === stagingSnapshot.size) {
    console.log('\n✅ SUCCESS: All staging records are now in production with correct project ID!');
  }
  
  process.exit(0);
}

updateProjectIds().catch(console.error);