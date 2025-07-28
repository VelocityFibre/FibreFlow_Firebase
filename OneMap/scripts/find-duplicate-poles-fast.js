#!/usr/bin/env node

/**
 * Fast duplicate pole detection using batch processing
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function findDuplicatesFast() {
  console.log('🔍 FAST DUPLICATE POLE DETECTION');
  console.log('Database: vf-onemap-data');
  console.log('=' .repeat(80) + '\n');

  try {
    // First, let's get a sample to understand the scale
    console.log('📊 Getting initial sample...\n');
    
    const sampleRef = db.collection('vf-onemap-processed-records')
      .where('poleNumber', '!=', '')
      .limit(1000);
    
    const sampleSnapshot = await sampleRef.get();
    console.log(`Sample size: ${sampleSnapshot.size} records with pole numbers\n`);

    // Check for specific Lawley poles
    console.log('🎯 Checking for Lawley pole duplicates...\n');
    
    // Query for a specific pole that might have duplicates
    const lawleyPoleRef = db.collection('vf-onemap-processed-records')
      .where('poleNumber', '==', 'LAW.P.B167')
      .limit(10);
    
    const lawleySnapshot = await lawleyPoleRef.get();
    
    if (!lawleySnapshot.empty) {
      console.log(`Found ${lawleySnapshot.size} records for pole LAW.P.B167:`);
      lawleySnapshot.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`\n[${idx + 1}] Document ID: ${doc.id}`);
        console.log(`    Property ID: ${data.propertyId || 'N/A'}`);
        console.log(`    Drop Number: ${data.dropNumber || 'N/A'}`);
        console.log(`    Site: ${data.site || 'N/A'}`);
        console.log(`    Status: ${data.statusUpdate || 'N/A'}`);
      });
    }

    // Check a few more common poles
    const commonPoles = ['LAW.P.A001', 'LAW.P.B001', 'LAW.P.C001', 'LAW.P.B167', 'LAW.P.C739'];
    
    console.log('\n\n📋 CHECKING COMMON POLE PATTERNS:\n');
    
    for (const poleNum of commonPoles) {
      const poleQuery = db.collection('vf-onemap-processed-records')
        .where('poleNumber', '==', poleNum)
        .limit(10);
      
      const poleSnapshot = await poleQuery.get();
      
      if (!poleSnapshot.empty && poleSnapshot.size > 1) {
        console.log(`⚠️  DUPLICATE FOUND: ${poleNum} has ${poleSnapshot.size} records`);
      } else if (poleSnapshot.size === 1) {
        console.log(`✅ ${poleNum}: 1 record (no duplicates)`);
      } else {
        console.log(`❌ ${poleNum}: Not found`);
      }
    }

    // Quick aggregation approach - count by site
    console.log('\n\n📊 DUPLICATE PATTERNS BY SITE:\n');
    
    const sites = ['Lawley', 'Mohadin'];
    
    for (const site of sites) {
      console.log(`\nChecking ${site}...`);
      
      // Get sample of poles from this site
      const siteQuery = db.collection('vf-onemap-processed-records')
        .where('site', '==', site)
        .where('poleNumber', '!=', '')
        .limit(100);
      
      const siteSnapshot = await siteQuery.get();
      
      // Check for duplicates in this sample
      const poleCounts = new Map();
      siteSnapshot.forEach(doc => {
        const poleNumber = doc.data().poleNumber;
        if (poleNumber) {
          poleCounts.set(poleNumber, (poleCounts.get(poleNumber) || 0) + 1);
        }
      });
      
      const duplicatesInSample = Array.from(poleCounts.entries())
        .filter(([pole, count]) => count > 1);
      
      if (duplicatesInSample.length > 0) {
        console.log(`  Found ${duplicatesInSample.length} poles with duplicates in sample`);
        duplicatesInSample.slice(0, 3).forEach(([pole, count]) => {
          console.log(`    - ${pole}: ${count} records`);
        });
      }
    }

    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(40));
    console.log('1. Run full duplicate cleanup script to merge duplicates');
    console.log('2. Update import scripts to check for existing poles');
    console.log('3. Consider using poleNumber as document ID');
    console.log('4. Add pre-import validation to prevent future duplicates');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }

  await admin.app().delete();
}

// Run the fast check
findDuplicatesFast().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});