const admin = require('firebase-admin');
const fs = require('fs');

// Initialize TWO Firebase instances - one for each database
const staging = admin.initializeApp({
  credential: admin.credential.cert(require('../credentials/vf-onemap-service-account.json')),
  projectId: 'vf-onemap-data'
}, 'staging');

// Check if we have production credentials
let production;
try {
  // Try to find FibreFlow production credentials
  const prodCredPath = '../../../credentials/fibreflow-service-account.json';
  if (fs.existsSync(prodCredPath)) {
    production = admin.initializeApp({
      credential: admin.credential.cert(require(prodCredPath)),
      projectId: 'fibreflow-73daf'
    }, 'production');
  } else {
    console.log('⚠️  No production credentials found. Checking default app...');
    // Try using default initialized app
    production = admin.initializeApp({
      projectId: 'fibreflow-73daf'
    }, 'production');
  }
} catch (error) {
  console.error('❌ Cannot access production database:', error.message);
  process.exit(1);
}

const stagingDb = staging.firestore();
const productionDb = production.firestore();

async function checkProductionForCorruption() {
  console.log('🔍 CHECKING PRODUCTION DATABASE FOR CORRUPTION');
  console.log('=============================================\n');
  
  // The 5 properties we know had phantom changes
  const corruptedProperties = ['308025', '291411', '292578', '307935', '308220'];
  
  console.log('Checking properties:', corruptedProperties.join(', '));
  console.log('\n');
  
  for (const propertyId of corruptedProperties) {
    console.log(`\n📍 Property ${propertyId}:`);
    
    try {
      // Check if property exists in production planned-poles
      const plannedPoleDoc = await productionDb
        .collection('planned-poles')
        .where('propertyId', '==', propertyId)
        .limit(1)
        .get();
      
      if (!plannedPoleDoc.empty) {
        const data = plannedPoleDoc.docs[0].data();
        console.log('  ✅ Found in planned-poles collection');
        console.log(`  Status: ${data.status || 'No status field'}`);
        console.log(`  Status History: ${data.statusHistory ? data.statusHistory.length + ' entries' : 'No history'}`);
      } else {
        console.log('  ❌ NOT found in planned-poles collection');
      }
      
      // Check pole-installations collection
      const poleInstDoc = await productionDb
        .collection('pole-installations')
        .where('propertyId', '==', propertyId)
        .limit(1)
        .get();
      
      if (!poleInstDoc.empty) {
        console.log('  ✅ Found in pole-installations collection');
      }
      
      // Check if there's a vf-onemap collection in production
      try {
        const oneMapDoc = await productionDb
          .collection('vf-onemap-processed-records')
          .doc(propertyId)
          .get();
        
        if (oneMapDoc.exists) {
          console.log('  ⚠️  Found in vf-onemap-processed-records (production)!');
          console.log('  This suggests data WAS synced to production!');
        }
      } catch (e) {
        // Collection might not exist
      }
      
    } catch (error) {
      console.log(`  ❌ Error checking production: ${error.message}`);
    }
  }
  
  // Summary check
  console.log('\n\n📊 SUMMARY CHECK:');
  try {
    // Check if vf-onemap collections exist in production
    const collections = await productionDb.listCollections();
    const oneMapCollections = collections.filter(col => 
      col.id.includes('onemap') || col.id.includes('vf-onemap')
    );
    
    if (oneMapCollections.length > 0) {
      console.log('\n⚠️  FOUND OneMap collections in PRODUCTION:');
      for (const col of oneMapCollections) {
        const count = await productionDb.collection(col.id).count().get();
        console.log(`  - ${col.id}: ${count.data().count} documents`);
      }
      console.log('\n🚨 This means corrupted data MAY be in production!');
    } else {
      console.log('\n✅ NO OneMap collections found in production');
      console.log('✅ Corruption appears isolated to staging (vf-onemap-data)');
    }
    
  } catch (error) {
    console.log('Could not list collections:', error.message);
  }
  
  process.exit(0);
}

checkProductionForCorruption();