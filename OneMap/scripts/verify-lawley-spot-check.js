#!/usr/bin/env node

/**
 * Spot Check Verification for Lawley Import
 * Verifies random sample of poles from vf-onemap-processed-records
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function performSpotCheck() {
  console.log('🔍 LAWLEY IMPORT SPOT CHECK VERIFICATION\n');
  console.log('Project: Lawley');
  console.log('Import Date: 2025-01-29');
  console.log('Database: vf-onemap-data');
  console.log('Collection: vf-onemap-processed-records');
  console.log('='.repeat(80) + '\n');

  try {
    // First, get a sample of records with pole numbers
    const sampleQuery = await db.collection('vf-onemap-processed-records')
      .where('site', '==', 'Lawley')
      .where('poleNumber', '!=', '')
      .limit(50)
      .get();

    if (sampleQuery.empty) {
      console.log('❌ No Lawley records with pole numbers found');
      process.exit(1);
    }

    console.log(`Found ${sampleQuery.size} Lawley records with pole numbers\n`);

    // Select 15 random records for spot check
    const allRecords = sampleQuery.docs;
    const selectedRecords = [];
    const usedIndexes = new Set();

    while (selectedRecords.length < 15 && selectedRecords.length < allRecords.length) {
      const randomIndex = Math.floor(Math.random() * allRecords.length);
      if (!usedIndexes.has(randomIndex)) {
        usedIndexes.add(randomIndex);
        selectedRecords.push(allRecords[randomIndex]);
      }
    }

    console.log(`📊 SPOT CHECKING ${selectedRecords.length} RANDOM RECORDS:\n`);

    // Verification counters
    let verifiedCount = 0;
    const issues = [];
    const poleDropMap = new Map(); // Track drops per pole
    const dropNumbers = new Set(); // Track unique drop numbers

    // Verify each selected record
    for (let i = 0; i < selectedRecords.length; i++) {
      const doc = selectedRecords[i];
      const data = doc.data();
      
      console.log(`\n${i + 1}. Property ID: ${data.propertyId}`);
      console.log('-'.repeat(60));

      // Verify pole number format
      if (data.poleNumber) {
        console.log(`   ✓ Pole Number: ${data.poleNumber}`);
        
        if (!data.poleNumber.startsWith('LAW.P.')) {
          issues.push(`Invalid pole format: ${data.poleNumber} (Property ${data.propertyId})`);
          console.log(`   ⚠️  WARNING: Pole number doesn't match LAW.P.X format`);
        }

        // Track drops per pole
        if (!poleDropMap.has(data.poleNumber)) {
          poleDropMap.set(data.poleNumber, []);
        }
        poleDropMap.get(data.poleNumber).push(data.dropNumber || 'NO_DROP');
      } else {
        console.log(`   ✗ No pole number`);
      }

      // Verify drop number
      if (data.dropNumber) {
        console.log(`   ✓ Drop Number: ${data.dropNumber}`);
        
        // Check for duplicate drops
        if (dropNumbers.has(data.dropNumber)) {
          issues.push(`Duplicate drop number: ${data.dropNumber}`);
          console.log(`   ⚠️  WARNING: Duplicate drop number detected`);
        }
        dropNumbers.add(data.dropNumber);
      } else {
        console.log(`   ✗ No drop number`);
      }

      // Verify GPS coordinates
      if (data.latitude && data.longitude) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log(`   ✓ GPS: ${lat}, ${lng}`);
          
          // Verify coordinates are in South Africa range
          if (lat < -35 || lat > -22 || lng < 16 || lng > 33) {
            issues.push(`GPS outside SA: ${lat}, ${lng} (Property ${data.propertyId})`);
            console.log(`   ⚠️  WARNING: GPS coordinates outside South Africa`);
          }
        } else {
          console.log(`   ✗ Invalid GPS format`);
          issues.push(`Invalid GPS: ${data.latitude}, ${data.longitude}`);
        }
      } else {
        console.log(`   ✗ No GPS coordinates`);
      }

      // Verify status
      if (data.status) {
        console.log(`   ✓ Status: ${data.status}`);
        
        // Check expected statuses
        const validStatuses = [
          'Survey Requested',
          'Pole Permission: Approved',
          'Pole Permission: Pending',
          'Pole Permission: Rejected',
          'Installation Complete'
        ];
        
        if (!validStatuses.some(s => data.status.includes(s))) {
          console.log(`   ⚠️  Unusual status value`);
        }
      } else {
        console.log(`   ✗ No status`);
      }

      // Verify status history
      if (data.statusHistory && Array.isArray(data.statusHistory)) {
        console.log(`   ✓ Status History: ${data.statusHistory.length} entries`);
        
        // Check first entry
        if (data.statusHistory.length > 0) {
          const firstEntry = data.statusHistory[0];
          console.log(`      - First: ${firstEntry.status} on ${firstEntry.date}`);
        }
      } else {
        console.log(`   ✗ No status history`);
      }

      // Additional fields
      console.log(`   • Location: ${data.locationAddress || 'N/A'}`);
      console.log(`   • Agent: ${data.fieldAgentName || 'N/A'}`);
      console.log(`   • Zone: ${data.flowNameGroups || 'N/A'}`);

      verifiedCount++;
    }

    // Check poles with too many drops
    console.log('\n\n📊 DATA INTEGRITY SUMMARY:');
    console.log('='.repeat(80));

    console.log(`\n✅ Verified Records: ${verifiedCount}/${selectedRecords.length}`);
    console.log(`📍 Unique Poles Found: ${poleDropMap.size}`);
    console.log(`💧 Unique Drop Numbers: ${dropNumbers.size}`);

    // Check for poles exceeding 12 drops
    let overloadedPoles = 0;
    poleDropMap.forEach((drops, pole) => {
      if (drops.length > 12) {
        overloadedPoles++;
        issues.push(`Pole ${pole} has ${drops.length} drops (exceeds limit of 12)`);
      }
    });

    if (overloadedPoles > 0) {
      console.log(`\n⚠️  Poles exceeding 12 drops: ${overloadedPoles}`);
    }

    // Display issues
    if (issues.length > 0) {
      console.log(`\n❌ Issues Found: ${issues.length}`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No data integrity issues found in sample');
    }

    // Get overall statistics
    console.log('\n\n📈 OVERALL LAWLEY PROJECT STATISTICS:');
    console.log('-'.repeat(80));

    const totalCount = await db.collection('vf-onemap-processed-records')
      .where('site', '==', 'Lawley')
      .count()
      .get();

    console.log(`Total Lawley Records: ${totalCount.data().count}`);

    // Sample of pole distribution
    const poleStats = await db.collection('vf-onemap-processed-records')
      .where('site', '==', 'Lawley')
      .where('poleNumber', '!=', '')
      .select('poleNumber')
      .limit(1000)
      .get();

    const poleCounts = new Map();
    poleStats.forEach(doc => {
      const pole = doc.data().poleNumber;
      poleCounts.set(pole, (poleCounts.get(pole) || 0) + 1);
    });

    console.log(`Unique Poles in Sample: ${poleCounts.size}`);
    
    // Find poles with most drops
    const sortedPoles = Array.from(poleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\nPoles with Most Drops (Top 5):');
    sortedPoles.forEach(([pole, count]) => {
      console.log(`   ${pole}: ${count} drops`);
    });

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run verification
performSpotCheck().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});