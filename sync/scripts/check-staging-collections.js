#!/usr/bin/env node

/**
 * Check Staging Collections Script
 * Lists all collections in vf-onemap-data to verify data structure
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/vf-onemap-data-key.json')
  ),
  projectId: 'vf-onemap-data'
}, 'staging');

const stagingDb = stagingApp.firestore();

async function checkCollections() {
  console.log('🔍 Checking vf-onemap-data collections...\n');
  
  try {
    // Get all collections
    const collections = await stagingDb.listCollections();
    
    if (collections.length === 0) {
      console.log('⚠️  No collections found in vf-onemap-data!');
      console.log('\n💡 This means the staging database is empty.');
      console.log('   You need to import data from OneMap CSVs first.');
      console.log('\n📝 To import data:');
      console.log('   1. Use existing OneMap import scripts in /OneMap/scripts/');
      console.log('   2. Or create new import script to populate staging database');
      return;
    }
    
    console.log(`✅ Found ${collections.length} collections:\n`);
    
    // Check each collection
    for (const collection of collections) {
      const snapshot = await collection.limit(5).get();
      console.log(`📁 Collection: ${collection.id}`);
      console.log(`   Documents: ${snapshot.size} (limited to 5)`);
      
      // Show sample document structure
      if (snapshot.size > 0) {
        const sampleDoc = snapshot.docs[0];
        const data = sampleDoc.data();
        console.log(`   Sample document ID: ${sampleDoc.id}`);
        console.log(`   Fields: ${Object.keys(data).slice(0, 10).join(', ')}${Object.keys(data).length > 10 ? '...' : ''}`);
      }
      console.log('');
    }
    
    // Try to get full counts for known collections
    const knownCollections = ['poles', 'drops', 'import-records', 'properties'];
    console.log('📊 Checking for expected collections:');
    
    for (const collName of knownCollections) {
      try {
        const count = await stagingDb.collection(collName).count().get();
        console.log(`   ${collName}: ${count.data().count} documents`);
      } catch (error) {
        console.log(`   ${collName}: Not found or empty`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error.message);
  }
}

// Run the check
checkCollections().then(() => {
  console.log('\n✨ Collection check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});