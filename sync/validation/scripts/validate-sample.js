#!/usr/bin/env node

/**
 * Sample Validation - Test with limited records
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

// Initialize Firebase Admin for staging
const stagingServiceAccount = require('../../config/service-accounts/vf-onemap-data-key.json');
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(stagingServiceAccount),
  projectId: 'vf-onemap-data'
}, 'staging');

const stagingDb = stagingApp.firestore();

async function runSampleValidation() {
  console.log('🧪 Running Sample Validation (First 100 records)\n');
  
  try {
    // Read CSV
    console.log('📄 Reading master CSV...');
    const fileContent = await fs.readFile('/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/master/master_csv_latest.csv', 'utf-8');
    const allRecords = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Take sample
    const sampleRecords = allRecords.slice(0, 100);
    console.log(`✅ Loaded ${allRecords.length} total records, using first 100 for test\n`);
    
    // Get unique pole numbers
    const poleNumbers = [...new Set(sampleRecords.map(r => r['Pole Number']).filter(p => p))];
    console.log(`🔍 Checking ${poleNumbers.length} unique poles in staging...\n`);
    
    // Query staging for these poles
    let found = 0;
    let missing = [];
    
    for (const poleNumber of poleNumbers) {
      const snapshot = await stagingDb.collection('vf-onemap-processed-records')
        .where('poleNumber', '==', poleNumber)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        found++;
      } else {
        missing.push(poleNumber);
      }
    }
    
    // Results
    console.log('📊 SAMPLE VALIDATION RESULTS:');
    console.log(`   Total poles checked: ${poleNumbers.length}`);
    console.log(`   ✅ Found in staging: ${found}`);
    console.log(`   ❌ Missing in staging: ${missing.length}`);
    
    if (missing.length > 0) {
      console.log('\n   Missing poles:', missing.slice(0, 5).join(', '), missing.length > 5 ? '...' : '');
    }
    
    return {
      sample: 100,
      uniquePoles: poleNumbers.length,
      found,
      missing: missing.length
    };
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

runSampleValidation()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));