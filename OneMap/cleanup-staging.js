#!/usr/bin/env node

/**
 * Cleanup OneMap Staging Collections
 * Safely deletes all documents from staging without affecting production
 */

const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Staging collections to clean
const STAGING_COLLECTIONS = [
  'onemap-processing-staging',
  'onemap-processing-imports'
];

async function cleanupStaging() {
  console.log('🧹 OneMap Staging Cleanup Tool');
  console.log('================================');
  console.log('This will DELETE all documents from:');
  STAGING_COLLECTIONS.forEach(col => console.log(`  - ${col}`));
  console.log('\n⚠️  This is SAFE - it will NOT affect your live data!');
  console.log('\nStarting cleanup in 3 seconds... (Press Ctrl+C to cancel)\n');
  
  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    for (const collectionName of STAGING_COLLECTIONS) {
      console.log(`\n📋 Cleaning ${collectionName}...`);
      
      // Get all documents
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`✅ ${collectionName} is already empty`);
        continue;
      }
      
      console.log(`Found ${snapshot.size} documents to delete`);
      
      // Delete in batches of 500 (Firestore limit)
      let deleted = 0;
      const batchSize = 500;
      
      while (deleted < snapshot.size) {
        const batch = db.batch();
        const docs = snapshot.docs.slice(deleted, deleted + batchSize);
        
        docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deleted += docs.length;
        console.log(`  Deleted ${deleted}/${snapshot.size} documents...`);
      }
      
      console.log(`✅ ${collectionName} cleaned successfully!`);
    }
    
    // Create cleanup log
    const cleanupLog = {
      cleanupId: `CLEANUP_${Date.now()}`,
      timestamp: Timestamp.now(),
      collections: STAGING_COLLECTIONS,
      cleanedBy: 'cleanup-staging-script',
      reason: 'Manual cleanup requested'
    };
    
    // Save cleanup log to imports collection (it will be the only document)
    await db.collection('onemap-processing-imports').add(cleanupLog);
    console.log('\n📝 Cleanup log created');
    
    console.log('\n🎉 Staging cleanup complete!');
    console.log('Your production data remains untouched.');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error('Some documents may not have been deleted.');
    process.exit(1);
  }
}

// Verify function to check what will be deleted
async function verifyBeforeCleanup() {
  console.log('\n📊 Checking staging collections...\n');
  
  for (const collectionName of STAGING_COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();
    console.log(`${collectionName}: ${snapshot.size} documents`);
    
    if (!snapshot.empty && snapshot.size <= 5) {
      // Show sample documents if few enough
      console.log('  Sample documents:');
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`    - ${doc.id}: ${data.propertyId || data.importId || 'unknown'}`);
      });
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--verify')) {
    await verifyBeforeCleanup();
    console.log('\nRun without --verify to actually delete these documents.');
  } else {
    await cleanupStaging();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}