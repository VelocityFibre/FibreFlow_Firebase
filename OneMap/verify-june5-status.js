#!/usr/bin/env node

/**
 * Verify if June 5th data is already imported
 */

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function verifyStatus() {
  console.log('🔍 Verifying June 5th Import Status\n');
  
  // Parse June 5th CSV
  const fileContent = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const june5Records = csv.parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  // Check different samples across the file
  const checkPoints = [0, 1000, 2000, 3000, 4000, 5000];
  let foundCount = 0;
  let notFoundCount = 0;
  
  console.log('Checking samples from June 5th CSV:');
  
  for (const idx of checkPoints) {
    if (idx < june5Records.length) {
      const record = june5Records[idx];
      const propertyId = record['Property ID'];
      
      const doc = await db.collection('onemap-processing-staging')
        .doc(propertyId)
        .get();
      
      if (doc.exists) {
        foundCount++;
        console.log(`✅ Row ${idx}: Property ${propertyId} - FOUND in staging`);
      } else {
        notFoundCount++;
        console.log(`❌ Row ${idx}: Property ${propertyId} - NOT FOUND in staging`);
      }
    }
  }
  
  // Check a few specific Property IDs
  console.log('\nChecking specific Property IDs:');
  const specificIds = ['249111', '251184', '253456', '254000', '254500'];
  
  for (const id of specificIds) {
    const doc = await db.collection('onemap-processing-staging').doc(id).get();
    console.log(`Property ${id}: ${doc.exists ? 'EXISTS' : 'NOT FOUND'}`);
  }
  
  // Get import batch info
  console.log('\nRecent import batches:');
  const batches = await db.collection('onemap-processing-imports')
    .orderBy('importDate', 'desc')
    .limit(10)
    .get();
  
  batches.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.importId || doc.id}: ${data.recordsProcessed || 0} records, Status: ${data.status}`);
  });
  
  console.log(`
Summary:
- Samples checked: ${foundCount + notFoundCount}
- Found in staging: ${foundCount}
- Not found: ${notFoundCount}
- Conclusion: ${foundCount === checkPoints.length ? 'June 5th data appears to be already imported' : 'June 5th data is partially or not imported'}
`);
}

verifyStatus().catch(console.error);