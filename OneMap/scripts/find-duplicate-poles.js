#!/usr/bin/env node

/**
 * Find and report duplicate poles in VF OneMap database
 * Duplicates are identified by having the same poleNumber but different document IDs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function findDuplicatePoles() {
  console.log('🔍 DUPLICATE POLE DETECTION REPORT');
  console.log('Database: vf-onemap-data');
  console.log('Collection: vf-onemap-processed-records');
  console.log('=' .repeat(80) + '\n');

  try {
    // Map to store pole numbers and their document IDs
    const poleMap = new Map();
    const duplicates = new Map();
    let totalRecords = 0;
    let recordsWithPoles = 0;
    let uniquePoles = 0;
    let duplicatePoles = 0;
    let affectedRecords = 0;

    console.log('📊 Scanning all records...\n');

    // Get all records from vf-onemap-processed-records
    const recordsRef = db.collection('vf-onemap-processed-records');
    const snapshot = await recordsRef.get();
    
    console.log(`Found ${snapshot.size} total records\n`);

    // Process each record
    snapshot.forEach(doc => {
      totalRecords++;
      const data = doc.data();
      const poleNumber = data.poleNumber || data['Pole Number'] || '';

      if (poleNumber && poleNumber.trim()) {
        recordsWithPoles++;
        const normalizedPole = poleNumber.trim().toUpperCase();

        if (!poleMap.has(normalizedPole)) {
          poleMap.set(normalizedPole, []);
          uniquePoles++;
        }

        poleMap.get(normalizedPole).push({
          docId: doc.id,
          propertyId: data.propertyId || data['Property ID'],
          dropNumber: data.dropNumber || data['Drop Number'],
          site: data.site || data.Site,
          locationAddress: data.locationAddress || data['Location Address'],
          status: data.statusUpdate || data['Status Update'],
          agent: data.fieldAgentNamePolePermission || data['Field Agent Name (pole permission)'],
          lastModified: data.lastModifiedDate || data['Last Modified Pole Permissions Date'],
          latitude: data.latitude || data.Latitude,
          longitude: data.longitude || data.Longitude
        });
      }
    });

    // Find duplicates
    for (const [poleNumber, docs] of poleMap.entries()) {
      if (docs.length > 1) {
        duplicatePoles++;
        affectedRecords += docs.length;
        duplicates.set(poleNumber, docs);
      }
    }

    // Display summary
    console.log('📈 SUMMARY STATISTICS:');
    console.log('-'.repeat(40));
    console.log(`Total records scanned: ${totalRecords.toLocaleString()}`);
    console.log(`Records with pole numbers: ${recordsWithPoles.toLocaleString()}`);
    console.log(`Unique pole numbers: ${uniquePoles.toLocaleString()}`);
    console.log(`\n⚠️  DUPLICATE ISSUES:`);
    console.log(`Pole numbers with duplicates: ${duplicatePoles.toLocaleString()}`);
    console.log(`Total affected records: ${affectedRecords.toLocaleString()}`);
    console.log(`Average duplicates per pole: ${duplicatePoles > 0 ? (affectedRecords / duplicatePoles).toFixed(2) : 0}`);

    // Show sample duplicates
    if (duplicates.size > 0) {
      console.log('\n\n📋 SAMPLE DUPLICATE POLES (First 10):');
      console.log('=' .repeat(80));

      let count = 0;
      for (const [poleNumber, docs] of duplicates.entries()) {
        if (count >= 10) break;
        count++;

        console.log(`\n${count}. Pole Number: ${poleNumber}`);
        console.log(`   Duplicate Count: ${docs.length} records`);
        console.log('   Documents:');
        
        docs.forEach((doc, idx) => {
          console.log(`\n   [${idx + 1}] Document ID: ${doc.docId}`);
          console.log(`       Property ID: ${doc.propertyId || 'N/A'}`);
          console.log(`       Drop Number: ${doc.dropNumber || 'N/A'}`);
          console.log(`       Site: ${doc.site || 'N/A'}`);
          console.log(`       Address: ${doc.locationAddress || 'N/A'}`);
          console.log(`       Status: ${doc.status || 'N/A'}`);
          console.log(`       Agent: ${doc.agent || 'N/A'}`);
          console.log(`       Last Modified: ${doc.lastModified || 'N/A'}`);
          console.log(`       GPS: ${doc.latitude || 'N/A'}, ${doc.longitude || 'N/A'}`);
        });
      }

      // Pattern analysis
      console.log('\n\n🔍 DUPLICATE PATTERNS:');
      console.log('-'.repeat(40));
      
      // Count by duplicate count
      const dupCountMap = new Map();
      for (const [pole, docs] of duplicates.entries()) {
        const count = docs.length;
        dupCountMap.set(count, (dupCountMap.get(count) || 0) + 1);
      }

      console.log('\nDuplicate frequency distribution:');
      const sortedCounts = Array.from(dupCountMap.entries()).sort((a, b) => a[0] - b[0]);
      for (const [dupCount, poleCount] of sortedCounts) {
        console.log(`  ${dupCount} duplicates: ${poleCount} poles`);
      }

      // Site analysis
      const siteMap = new Map();
      for (const [pole, docs] of duplicates.entries()) {
        docs.forEach(doc => {
          const site = doc.site || 'Unknown';
          siteMap.set(site, (siteMap.get(site) || 0) + 1);
        });
      }

      console.log('\nDuplicates by site:');
      const sortedSites = Array.from(siteMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [site, count] of sortedSites) {
        console.log(`  ${site}: ${count} duplicate records`);
      }

      // Export full list
      console.log('\n\n💾 EXPORTING FULL DUPLICATE LIST...');
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(__dirname, '..', 'reports', `duplicate-poles-${timestamp}.json`);
      
      // Ensure reports directory exists
      const reportsDir = path.dirname(reportPath);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const exportData = {
        summary: {
          generatedAt: new Date().toISOString(),
          database: 'vf-onemap-data',
          collection: 'vf-onemap-processed-records',
          totalRecords,
          recordsWithPoles,
          uniquePoles,
          duplicatePoles,
          affectedRecords
        },
        duplicates: Array.from(duplicates.entries()).map(([pole, docs]) => ({
          poleNumber: pole,
          duplicateCount: docs.length,
          documents: docs
        }))
      };

      fs.writeFileSync(reportPath, JSON.stringify(exportData, null, 2));
      console.log(`✅ Full report exported to: ${reportPath}`);
    }

    console.log('\n\n✅ Duplicate detection complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }

  await admin.app().delete();
}

// Run the duplicate detection
findDuplicatePoles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});