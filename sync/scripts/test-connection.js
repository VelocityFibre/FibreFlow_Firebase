#!/usr/bin/env node

/**
 * Test Connection Script
 * Tests connection to both Firebase projects before running sync
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load service accounts
const stagingKeyPath = path.join(__dirname, '../config/service-accounts/vf-onemap-data-key.json');
const productionKeyPath = path.join(__dirname, '../config/service-accounts/fibreflow-73daf-key.json');

// Check if service account files exist
if (!fs.existsSync(stagingKeyPath)) {
  console.error('❌ Staging service account not found at:', stagingKeyPath);
  process.exit(1);
}

if (!fs.existsSync(productionKeyPath)) {
  console.error('❌ Production service account not found at:', productionKeyPath);
  process.exit(1);
}

console.log('✅ Service account files found');

// Initialize Firebase Admin instances
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(require(stagingKeyPath)),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(require(productionKeyPath)),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

async function testConnections() {
  console.log('\n🔄 Testing connections...\n');

  try {
    // Test staging database
    console.log('📊 Testing vf-onemap-data (staging) connection...');
    const stagingPoles = await stagingDb.collection('poles').limit(5).get();
    console.log(`✅ Staging connected! Found ${stagingPoles.size} poles (showing max 5)`);
    
    // Show sample pole data
    if (stagingPoles.size > 0) {
      const samplePole = stagingPoles.docs[0].data();
      console.log('   Sample pole fields:', Object.keys(samplePole).slice(0, 10).join(', '), '...');
    }

    // Test production database
    console.log('\n📊 Testing fibreflow-73daf (production) connection...');
    const productionPoles = await productionDb.collection('planned-poles').limit(5).get();
    console.log(`✅ Production connected! Found ${productionPoles.size} planned poles`);
    
    // Get counts
    console.log('\n📈 Database Statistics:');
    
    // Staging counts
    const stagingPolesCount = await stagingDb.collection('poles').count().get();
    const stagingDropsCount = await stagingDb.collection('drops').count().get();
    console.log(`\nStaging (vf-onemap-data):`);
    console.log(`  - Total poles: ${stagingPolesCount.data().count}`);
    console.log(`  - Total drops: ${stagingDropsCount.data().count}`);
    
    // Production counts
    const productionPolesCount = await productionDb.collection('planned-poles').count().get();
    console.log(`\nProduction (fibreflow-73daf):`);
    console.log(`  - Total planned poles: ${productionPolesCount.data().count}`);
    
    console.log('\n✅ Both databases are accessible and ready for sync!');
    console.log('\n💡 Next step: Run test-sync.js to perform a small test sync');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testConnections().then(() => {
  console.log('\n✨ Connection test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});