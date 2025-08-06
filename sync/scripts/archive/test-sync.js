#!/usr/bin/env node

/**
 * Test Sync Script
 * Performs a small test sync with just a few records
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load configurations
const fieldMappings = require('../config/field-mappings.json');
const syncRules = require('../config/sync-rules.json');

// Initialize Firebase Admin
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/vf-onemap-data-key.json')
  ),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

// Test configuration
const TEST_LIMIT = 5; // Only sync 5 poles for testing

async function detectConflicts(stagingPoles) {
  console.log('\n🔍 Detecting conflicts...');
  const conflicts = [];
  
  for (const pole of stagingPoles) {
    const poleNumber = pole['Pole Number'];
    
    // Check if pole exists in production
    const existingPole = await productionDb
      .collection('planned-poles')
      .doc(poleNumber)
      .get();
    
    if (existingPole.exists) {
      conflicts.push({
        type: 'duplicate',
        poleNumber,
        staging: pole,
        production: existingPole.data()
      });
    }
  }
  
  return conflicts;
}

async function mapFields(sourceData, mapping) {
  const mappedData = {};
  
  for (const [sourceField, targetField] of Object.entries(mapping)) {
    if (sourceData[sourceField] !== undefined) {
      // Handle nested fields like location.latitude
      if (targetField.includes('.')) {
        const [parent, child] = targetField.split('.');
        if (!mappedData[parent]) mappedData[parent] = {};
        mappedData[parent][child] = sourceData[sourceField];
      } else {
        mappedData[targetField] = sourceData[sourceField];
      }
    }
  }
  
  // Add sync metadata
  mappedData.lastSyncedFrom = 'vf-onemap-data';
  mappedData.lastSyncDate = admin.firestore.FieldValue.serverTimestamp();
  
  return mappedData;
}

async function testSync() {
  console.log('🚀 Starting Test Sync');
  console.log(`📋 Configuration: Syncing ${TEST_LIMIT} poles maximum`);
  console.log(`📋 Mode: ${syncRules.sync.mode}`);
  
  try {
    // Step 1: Fetch test data from staging
    console.log('\n📥 Fetching poles from staging...');
    const stagingSnapshot = await stagingDb
      .collection('poles')
      .limit(TEST_LIMIT)
      .get();
    
    const stagingPoles = stagingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${stagingPoles.length} poles to test`);
    
    // Show sample data
    if (stagingPoles.length > 0) {
      console.log('\n📄 Sample pole data:');
      const sample = stagingPoles[0];
      console.log(`  - Pole Number: ${sample['Pole Number']}`);
      console.log(`  - Status: ${sample['Status']}`);
      console.log(`  - Location: ${sample['Location Address']}`);
    }
    
    // Step 2: Detect conflicts
    const conflicts = await detectConflicts(stagingPoles);
    
    if (conflicts.length > 0) {
      console.log(`\n⚠️  Found ${conflicts.length} conflicts:`);
      conflicts.forEach((conflict, index) => {
        console.log(`\n${index + 1}. Pole ${conflict.poleNumber}:`);
        console.log(`   Staging Status: ${conflict.staging['Status']}`);
        console.log(`   Production Status: ${conflict.production.workflowStatus || 'N/A'}`);
      });
      
      console.log('\n❓ In a real sync, these would require manual approval.');
      console.log('   For this test, we\'ll skip conflicting poles.');
    }
    
    // Step 3: Filter out conflicts
    const conflictPoleNumbers = conflicts.map(c => c.poleNumber);
    const polesToSync = stagingPoles.filter(
      pole => !conflictPoleNumbers.includes(pole['Pole Number'])
    );
    
    console.log(`\n✅ ${polesToSync.length} poles ready to sync (no conflicts)`);
    
    // Step 4: Perform test sync
    if (polesToSync.length > 0) {
      console.log('\n🔄 Syncing poles to production...');
      
      const batch = productionDb.batch();
      let syncCount = 0;
      
      for (const pole of polesToSync) {
        const poleNumber = pole['Pole Number'];
        const mappedData = await mapFields(pole, fieldMappings.poles.sourceToTarget);
        
        const docRef = productionDb.collection('planned-poles').doc(poleNumber);
        batch.set(docRef, mappedData, { merge: true });
        syncCount++;
        
        console.log(`  ✓ Prepared ${poleNumber} for sync`);
      }
      
      // Execute batch
      await batch.commit();
      console.log(`\n✅ Successfully synced ${syncCount} poles!`);
      
      // Create sync report
      const report = {
        timestamp: new Date().toISOString(),
        type: 'test-sync',
        mode: 'manual',
        summary: {
          totalAnalyzed: stagingPoles.length,
          conflicts: conflicts.length,
          synced: syncCount,
          skipped: conflicts.length
        },
        syncedPoles: polesToSync.map(p => p['Pole Number']),
        conflicts: conflicts.map(c => ({
          poleNumber: c.poleNumber,
          reason: 'duplicate'
        }))
      };
      
      // Save report
      const reportPath = path.join(__dirname, '../reports', `test-sync-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 Sync Report:');
      console.log(`  - Total analyzed: ${report.summary.totalAnalyzed}`);
      console.log(`  - Conflicts found: ${report.summary.conflicts}`);
      console.log(`  - Successfully synced: ${report.summary.synced}`);
      console.log(`  - Report saved to: ${reportPath}`);
      
    } else {
      console.log('\n⚠️  No poles to sync (all had conflicts)');
    }
    
  } catch (error) {
    console.error('\n❌ Test sync failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
console.log('🧪 FibreFlow Database Sync - Test Mode\n');

testSync().then(() => {
  console.log('\n✨ Test sync completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Check the production database to verify synced poles');
  console.log('   2. Review the sync report in the reports folder');
  console.log('   3. Run full-sync.js when ready for complete sync');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});