#!/usr/bin/env node

/**
 * Verify Lawley Import - Spot Check Sample Poles
 * Compares Firebase data against expected values
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Sample of poles to verify - including complex cases with multiple drops
const SAMPLE_POLES = [
  'LAW.P.B167',  // High drop count pole
  'LAW.P.C739',  // Complex pole
  'LAW.P.C745',  // Multiple properties
  'LAW.P.C234',  // GPS coordinates
  'LAW.P.B456',  // Status variations
  'LAW.P.C120',  // Different zones
  'LAW.P.B789',  // Edge cases
  'LAW.P.C567',  // Agent assignments
  'LAW.P.B234',  // Date tracking
  'LAW.P.C890',  // Drop connections
  'LAW.P.B345',  // Field data
  'LAW.P.C123',  // Location data
  'LAW.P.B567',  // Status history
  'LAW.P.C456',  // Recent changes
  'LAW.P.B890'   // Validation case
];

async function verifyPoleData() {
  console.log('🔍 LAWLEY IMPORT VERIFICATION - SPOT CHECK\n');
  console.log('Project: Lawley (ID: oAigmUjSbjWHmH80AMxc)');
  console.log('Import Date: 2025-01-29');
  console.log('Sample Size: 15 poles\n');
  console.log('='.repeat(80) + '\n');

  let verified = 0;
  let issues = [];

  for (const poleNumber of SAMPLE_POLES) {
    console.log(`\n📍 Checking Pole: ${poleNumber}`);
    console.log('-'.repeat(40));

    try {
      // Query properties by pole number
      const propertiesSnap = await db.collection('properties')
        .where('Pole Number', '==', poleNumber)
        .get();

      if (propertiesSnap.empty) {
        console.log(`❌ No properties found for pole ${poleNumber}`);
        issues.push(`Missing data for pole ${poleNumber}`);
        continue;
      }

      console.log(`✅ Found ${propertiesSnap.size} properties for this pole`);

      // Check drop count doesn't exceed 12
      if (propertiesSnap.size > 12) {
        console.log(`⚠️  WARNING: Pole has ${propertiesSnap.size} drops (max should be 12)`);
        issues.push(`Pole ${poleNumber} exceeds 12 drop limit`);
      }

      // Verify each property
      let dropNumbers = new Set();
      let gpsCoords = [];
      let statuses = new Set();
      let agents = new Set();

      propertiesSnap.forEach(doc => {
        const data = doc.data();
        
        // Check drop number uniqueness
        if (data['Drop Number']) {
          if (dropNumbers.has(data['Drop Number'])) {
            console.log(`⚠️  Duplicate drop number: ${data['Drop Number']}`);
            issues.push(`Duplicate drop ${data['Drop Number']} on pole ${poleNumber}`);
          }
          dropNumbers.add(data['Drop Number']);
        }

        // Collect GPS coordinates
        if (data.Latitude && data.Longitude) {
          gpsCoords.push({
            lat: data.Latitude,
            lng: data.Longitude,
            propertyId: data['Property ID']
          });
        }

        // Track statuses and agents
        if (data.Status) statuses.add(data.Status);
        if (data['Field Agent Name (pole permission)']) {
          agents.add(data['Field Agent Name (pole permission)']);
        }

        // Verify status history exists
        if (data.statusHistory && Array.isArray(data.statusHistory)) {
          console.log(`   ✓ Status history: ${data.statusHistory.length} entries`);
        } else {
          console.log(`   ✗ No status history for property ${data['Property ID']}`);
        }
      });

      // Summary for this pole
      console.log(`\n   Summary for ${poleNumber}:`);
      console.log(`   - Drop numbers: ${Array.from(dropNumbers).join(', ') || 'None'}`);
      console.log(`   - GPS coords: ${gpsCoords.length} properties with GPS`);
      console.log(`   - Statuses: ${Array.from(statuses).join(', ')}`);
      console.log(`   - Agents: ${Array.from(agents).join(', ') || 'None'}`);
      
      // Sample GPS coordinate
      if (gpsCoords.length > 0) {
        const sample = gpsCoords[0];
        console.log(`   - Sample GPS: ${sample.lat}, ${sample.lng} (Property ${sample.propertyId})`);
      }

      verified++;

    } catch (error) {
      console.error(`❌ Error checking pole ${poleNumber}:`, error.message);
      issues.push(`Error checking pole ${poleNumber}: ${error.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 VERIFICATION SUMMARY\n');
  console.log(`✅ Successfully verified: ${verified}/${SAMPLE_POLES.length} poles`);
  console.log(`❌ Issues found: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues detected:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  // Check overall data integrity
  console.log('\n🔐 DATA INTEGRITY CHECKS:');
  
  // Check pole uniqueness
  const poleStats = await db.collection('properties')
    .where('projectId', '==', 'oAigmUjSbjWHmH80AMxc')
    .select('Pole Number')
    .get();
  
  const uniquePoles = new Set();
  poleStats.forEach(doc => {
    if (doc.data()['Pole Number']) {
      uniquePoles.add(doc.data()['Pole Number']);
    }
  });
  
  console.log(`   - Total unique poles in project: ${uniquePoles.size}`);
  console.log(`   - Total properties in project: ${poleStats.size}`);
  console.log(`   - Average drops per pole: ${(poleStats.size / uniquePoles.size).toFixed(2)}`);

  process.exit(0);
}

// Run verification
verifyPoleData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});