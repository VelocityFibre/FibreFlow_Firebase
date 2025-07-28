#!/usr/bin/env node

/**
 * Simple Lawley Import Verification
 * Checks random sample without complex queries
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Known Lawley pole numbers to check
const SAMPLE_POLES = [
  'LAW.P.A035', 'LAW.P.A044', 'LAW.P.A046', 'LAW.P.A047', 'LAW.P.A048',
  'LAW.P.A049', 'LAW.P.A050', 'LAW.P.A051', 'LAW.P.A052', 'LAW.P.A053',
  'LAW.P.B001', 'LAW.P.B002', 'LAW.P.B003', 'LAW.P.B004', 'LAW.P.B005'
];

async function verifyLawleyImport() {
  console.log('🔍 LAWLEY IMPORT VERIFICATION - SPOT CHECK\n');
  console.log('Database: vf-onemap-data');
  console.log('Collection: vf-onemap-processed-records');
  console.log('Import Date: 2025-01-29');
  console.log('='.repeat(80) + '\n');

  const verificationResults = {
    checked: 0,
    found: 0,
    issues: [],
    poleData: new Map(),
    dropNumbers: new Set(),
    gpsCoordinates: []
  };

  // First, get a general sample of records
  console.log('📊 FETCHING SAMPLE RECORDS...\n');
  
  try {
    // Get sample of records
    const sampleSnap = await db.collection('vf-onemap-processed-records')
      .limit(100)
      .get();

    console.log(`Retrieved ${sampleSnap.size} sample records\n`);

    // Filter for Lawley records
    const lawleyRecords = [];
    sampleSnap.forEach(doc => {
      const data = doc.data();
      if (data.site === 'Lawley' || 
          (data.poleNumber && data.poleNumber.startsWith('LAW.P.')) ||
          (data.locationAddress && data.locationAddress.includes('Lawley'))) {
        lawleyRecords.push({ id: doc.id, data });
      }
    });

    console.log(`Found ${lawleyRecords.length} Lawley records in sample\n`);

    if (lawleyRecords.length === 0) {
      console.log('⚠️  No Lawley records found in initial sample');
      console.log('Trying alternative approach...\n');
      
      // Try getting records by property ID range
      const altSnap = await db.collection('vf-onemap-processed-records')
        .orderBy('propertyId')
        .startAt('200000')
        .endAt('300000')
        .limit(50)
        .get();

      altSnap.forEach(doc => {
        const data = doc.data();
        if (data.site === 'Lawley' || 
            (data.poleNumber && data.poleNumber.startsWith('LAW.P.'))) {
          lawleyRecords.push({ id: doc.id, data });
        }
      });
    }

    // Verify records
    console.log('🔍 VERIFYING RECORDS:');
    console.log('-'.repeat(80) + '\n');

    // Take up to 15 records for detailed verification
    const recordsToCheck = lawleyRecords.slice(0, 15);

    for (let i = 0; i < recordsToCheck.length; i++) {
      const { id, data } = recordsToCheck[i];
      
      console.log(`\n${i + 1}. Document ID: ${id}`);
      console.log(`   Property ID: ${data.propertyId || 'N/A'}`);
      console.log('-'.repeat(60));

      verificationResults.checked++;

      // Verify pole number
      if (data.poleNumber) {
        console.log(`   ✓ Pole Number: ${data.poleNumber}`);
        
        if (!verificationResults.poleData.has(data.poleNumber)) {
          verificationResults.poleData.set(data.poleNumber, []);
        }
        verificationResults.poleData.get(data.poleNumber).push(data.dropNumber || 'NO_DROP');
        
        if (!data.poleNumber.startsWith('LAW.P.')) {
          verificationResults.issues.push(`Invalid pole format: ${data.poleNumber}`);
          console.log(`   ⚠️  WARNING: Unexpected pole format`);
        }
        verificationResults.found++;
      } else {
        console.log(`   ✗ No pole number`);
      }

      // Verify drop number
      if (data.dropNumber) {
        console.log(`   ✓ Drop Number: ${data.dropNumber}`);
        
        if (verificationResults.dropNumbers.has(data.dropNumber)) {
          verificationResults.issues.push(`Duplicate drop: ${data.dropNumber}`);
          console.log(`   ⚠️  WARNING: Duplicate drop number`);
        }
        verificationResults.dropNumbers.add(data.dropNumber);
      }

      // Verify GPS
      if (data.latitude && data.longitude) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log(`   ✓ GPS: ${lat}, ${lng}`);
          verificationResults.gpsCoordinates.push({ lat, lng, id: data.propertyId });
        } else {
          console.log(`   ✗ Invalid GPS format`);
          verificationResults.issues.push(`Invalid GPS: ${data.latitude}, ${data.longitude}`);
        }
      }

      // Verify status
      if (data.status) {
        console.log(`   ✓ Status: ${data.status}`);
      }

      // Check status history
      if (data.statusHistory && Array.isArray(data.statusHistory)) {
        console.log(`   ✓ Status History: ${data.statusHistory.length} entries`);
        if (data.statusHistory.length > 0) {
          const latest = data.statusHistory[data.statusHistory.length - 1];
          console.log(`      Latest: ${latest.status} (${latest.date})`);
        }
      }

      // Additional info
      console.log(`   • Location: ${data.locationAddress || 'N/A'}`);
      console.log(`   • Agent: ${data.fieldAgentName || 'N/A'}`);
      console.log(`   • Last Modified: ${data.lastModifiedDate || 'N/A'}`);
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 VERIFICATION SUMMARY\n');

    console.log(`Records Checked: ${verificationResults.checked}`);
    console.log(`Records with Poles: ${verificationResults.found}`);
    console.log(`Unique Poles: ${verificationResults.poleData.size}`);
    console.log(`Unique Drops: ${verificationResults.dropNumbers.size}`);
    console.log(`GPS Coordinates: ${verificationResults.gpsCoordinates.length}`);

    // Check for overloaded poles
    let overloadedCount = 0;
    verificationResults.poleData.forEach((drops, pole) => {
      if (drops.length > 12) {
        overloadedCount++;
        console.log(`\n⚠️  Pole ${pole} has ${drops.length} drops (exceeds limit)`);
      }
    });

    if (overloadedCount === 0) {
      console.log('\n✅ No poles exceed 12 drop limit in sample');
    }

    // Display issues
    if (verificationResults.issues.length > 0) {
      console.log(`\n❌ Issues Found: ${verificationResults.issues.length}`);
      verificationResults.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No data integrity issues found');
    }

    // Sample GPS verification
    if (verificationResults.gpsCoordinates.length > 0) {
      console.log('\n📍 GPS COORDINATE SAMPLE:');
      const sampleGPS = verificationResults.gpsCoordinates.slice(0, 3);
      sampleGPS.forEach(coord => {
        console.log(`   Property ${coord.id}: ${coord.lat}, ${coord.lng}`);
      });
    }

  } catch (error) {
    console.error('Error during verification:', error.message);
  }

  process.exit(0);
}

// Run verification
verifyLawleyImport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});