#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function verifyComplete() {
  console.log('🔍 Verifying June 5th Import Completion\n');
  
  // Parse CSV to get all Property IDs
  const fileContent = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const records = csv.parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  const june5PropertyIds = new Set(records.map(r => r['Property ID']));
  console.log(`📊 June 5th CSV contains: ${june5PropertyIds.size} unique Property IDs`);
  
  // Check random samples across the file
  const sampleSize = 50;
  const sampleIds = [...june5PropertyIds];
  const randomSamples = [];
  
  // Get samples from different parts of the file
  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor((i / sampleSize) * sampleIds.length);
    randomSamples.push(sampleIds[index]);
  }
  
  // Check if samples exist in staging
  let foundCount = 0;
  const missingIds = [];
  
  for (const id of randomSamples) {
    const doc = await db.collection('onemap-processing-staging').doc(id).get();
    if (doc.exists) {
      foundCount++;
    } else {
      missingIds.push(id);
    }
  }
  
  const completionRate = (foundCount / sampleSize) * 100;
  
  // Get total staging count
  const stagingCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  // Generate report
  const report = `
# June 5th Import Verification Report

## Sample Analysis
- Samples checked: ${sampleSize}
- Found in staging: ${foundCount}
- Missing: ${missingIds.length}
- Completion rate: ${completionRate.toFixed(1)}%

## Database Status
- Total staging records: ${stagingCount.size}
- Expected June 5 records: ${june5PropertyIds.size}

## Missing Sample IDs:
${missingIds.slice(0, 10).join(', ')}

## Conclusion:
${completionRate >= 95 ? '✅ Import appears to be complete!' : '⚠️  Import may be incomplete. Consider running one more batch.'}

## Estimated Missing Records:
~${Math.round(june5PropertyIds.size * (1 - completionRate / 100))} records
`;

  console.log(report);
  
  // Save verification report
  fs.writeFileSync('reports/june5_verification.txt', report);
  console.log('\n📄 Report saved to: reports/june5_verification.txt');
  
  return { completionRate, stagingCount: stagingCount.size };
}

verifyComplete().catch(console.error);