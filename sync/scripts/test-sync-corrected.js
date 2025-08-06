#!/usr/bin/env node

/**
 * Test Sync Script - Corrected for actual collection names
 * Syncs from vf-onemap-processed-records to planned-poles
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
const TEST_LIMIT = 5; // Only sync 5 records for testing

// Updated field mappings based on actual data structure
const actualFieldMappings = {
  "poleNumber": "poleNumber",           // Will use poleNumber from data
  "latitude": "location.latitude",      
  "longitude": "location.longitude",    
  "locationAddress": "address",
  "pons": "ponNumber",
  "sections": "zoneNumber",
  "site": "projectName",
  "status": "importStatus",
  "flowNameGroups": "workflowGroup",
  "propertyId": "propertyId",
  "lastModifiedDate": "lastModifiedInOnemap",
  "dateStatusChanged": "statusChangeDate",
  "dropNumber": "dropNumber"
};

async function detectConflicts(stagingRecords) {
  console.log('\n🔍 Detecting conflicts...');
  const conflicts = [];
  
  for (const record of stagingRecords) {
    // Try to extract pole number from the record
    const poleNumber = record.poleNumber || record['Pole Number'] || null;
    
    if (!poleNumber) {
      console.log(`   ⚠️  Record ${record.id} has no pole number - skipping`);
      continue;
    }
    
    // Check if pole exists in production
    const existingPole = await productionDb
      .collection('planned-poles')
      .doc(poleNumber)
      .get();
    
    if (existingPole.exists) {
      conflicts.push({
        type: 'duplicate',
        poleNumber,
        staging: record,
        production: existingPole.data()
      });
    }
  }
  
  return conflicts;
}

async function mapFields(sourceData, id) {
  const mappedData = {};
  
  // Map fields based on actual data structure
  for (const [sourceField, targetField] of Object.entries(actualFieldMappings)) {
    if (sourceData[sourceField] !== undefined && sourceData[sourceField] !== null) {
      // Handle nested fields like location.latitude
      if (targetField.includes('.')) {
        const [parent, child] = targetField.split('.');
        if (!mappedData[parent]) mappedData[parent] = {};
        
        // Parse coordinates if they're strings
        if ((child === 'latitude' || child === 'longitude') && typeof sourceData[sourceField] === 'string') {
          mappedData[parent][child] = parseFloat(sourceData[sourceField]);
        } else {
          mappedData[parent][child] = sourceData[sourceField];
        }
      } else {
        mappedData[targetField] = sourceData[sourceField];
      }
    }
  }
  
  // Ensure we have a pole number
  if (!mappedData.poleNumber) {
    // Try to extract from various possible fields
    mappedData.poleNumber = sourceData.poleNumber || 
                           sourceData['Pole Number'] || 
                           sourceData['pole_number'] ||
                           `TEMP_${id}`; // Fallback to temp ID
  }
  
  // Add sync metadata
  mappedData.lastSyncedFrom = 'vf-onemap-data';
  mappedData.lastSyncDate = admin.firestore.FieldValue.serverTimestamp();
  mappedData.stagingDocId = id;
  
  return mappedData;
}

async function testSync() {
  console.log('🚀 Starting Test Sync (Corrected)');
  console.log(`📋 Configuration: Syncing ${TEST_LIMIT} records maximum`);
  console.log(`📋 Mode: ${syncRules.sync.mode}`);
  
  try {
    // Step 1: Fetch test data from staging (correct collection)
    console.log('\n📥 Fetching records from vf-onemap-processed-records...');
    const stagingSnapshot = await stagingDb
      .collection('vf-onemap-processed-records')
      .limit(TEST_LIMIT)
      .get();
    
    const stagingRecords = stagingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${stagingRecords.length} records to test`);
    
    // Show sample data structure
    if (stagingRecords.length > 0) {
      console.log('\n📄 Sample record data:');
      const sample = stagingRecords[0];
      console.log(`  - Document ID: ${sample.id}`);
      console.log(`  - Property ID: ${sample.propertyId}`);
      console.log(`  - Location: ${sample.locationAddress}`);
      console.log(`  - Site: ${sample.site}`);
      console.log(`  - Status: ${sample.status}`);
      console.log(`  - Pole Number: ${sample.poleNumber || 'Not found'}`);
      console.log(`  - Drop Number: ${sample.dropNumber || 'Not found'}`);
      console.log(`  - Available fields: ${Object.keys(sample).slice(0, 15).join(', ')}...`);
    }
    
    // Step 2: Detect conflicts
    const conflicts = await detectConflicts(stagingRecords);
    
    if (conflicts.length > 0) {
      console.log(`\n⚠️  Found ${conflicts.length} conflicts:`);
      conflicts.forEach((conflict, index) => {
        console.log(`\n${index + 1}. Pole ${conflict.poleNumber}:`);
        console.log(`   Staging Status: ${conflict.staging.status}`);
        console.log(`   Production Status: ${conflict.production.workflowStatus || conflict.production.importStatus || 'N/A'}`);
      });
      
      console.log('\n❓ In a real sync, these would require manual approval.');
      console.log('   For this test, we\'ll skip conflicting records.');
    }
    
    // Step 3: Filter records for sync
    const recordsWithPoleNumbers = stagingRecords.filter(record => {
      const poleNumber = record.poleNumber || record['Pole Number'];
      return poleNumber && poleNumber !== '';
    });
    
    console.log(`\n📊 Records with pole numbers: ${recordsWithPoleNumbers.length}`);
    
    const conflictPoleNumbers = conflicts.map(c => c.poleNumber);
    const recordsToSync = recordsWithPoleNumbers.filter(
      record => {
        const poleNumber = record.poleNumber || record['Pole Number'];
        return !conflictPoleNumbers.includes(poleNumber);
      }
    );
    
    console.log(`✅ ${recordsToSync.length} records ready to sync (no conflicts)`);
    
    // Step 4: Perform test sync
    if (recordsToSync.length > 0) {
      console.log('\n🔄 Syncing records to production...');
      
      const batch = productionDb.batch();
      let syncCount = 0;
      
      for (const record of recordsToSync) {
        const mappedData = await mapFields(record, record.id);
        const poleNumber = mappedData.poleNumber;
        
        const docRef = productionDb.collection('planned-poles').doc(poleNumber);
        batch.set(docRef, mappedData, { merge: true });
        syncCount++;
        
        console.log(`  ✓ Prepared ${poleNumber} for sync`);
      }
      
      // Execute batch
      await batch.commit();
      console.log(`\n✅ Successfully synced ${syncCount} records!`);
      
      // Create sync report
      const report = {
        timestamp: new Date().toISOString(),
        type: 'test-sync',
        mode: 'manual',
        collection: 'vf-onemap-processed-records',
        summary: {
          totalAnalyzed: stagingRecords.length,
          withPoleNumbers: recordsWithPoleNumbers.length,
          conflicts: conflicts.length,
          synced: syncCount,
          skipped: stagingRecords.length - syncCount
        },
        syncedRecords: recordsToSync.map(r => ({
          id: r.id,
          poleNumber: r.poleNumber || r['Pole Number'],
          location: r.locationAddress
        })),
        conflicts: conflicts.map(c => ({
          poleNumber: c.poleNumber,
          reason: 'duplicate'
        }))
      };
      
      // Save report
      const reportPath = path.join(__dirname, '../reports', `test-sync-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 Sync Report Summary:');
      console.log(`  - Total analyzed: ${report.summary.totalAnalyzed}`);
      console.log(`  - With pole numbers: ${report.summary.withPoleNumbers}`);
      console.log(`  - Conflicts found: ${report.summary.conflicts}`);
      console.log(`  - Successfully synced: ${report.summary.synced}`);
      console.log(`  - Report saved to: ${reportPath}`);
      
    } else {
      console.log('\n⚠️  No records to sync (either no pole numbers or all had conflicts)');
      console.log('   This might indicate the records don\'t have pole numbers assigned yet.');
    }
    
  } catch (error) {
    console.error('\n❌ Test sync failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
console.log('🧪 FibreFlow Database Sync - Test Mode (Corrected)\n');

testSync().then(() => {
  console.log('\n✨ Test sync completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Check the production database to verify synced records');
  console.log('   2. Review the sync report in the reports folder');
  console.log('   3. Analyze records without pole numbers if needed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});