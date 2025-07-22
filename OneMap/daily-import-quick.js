#!/usr/bin/env node

/**
 * Quick version of daily import - optimized for speed
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function quickImport() {
  console.log('🚀 Quick Daily Import - June 5th\n');
  
  // Parse CSV
  const fileContent = await fs.readFile('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  const records = csv.parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  console.log(`📊 June 5th CSV: ${records.length} records`);
  
  // Get unique Property IDs from CSV
  const june5Ids = new Set(records.map(r => r['Property ID']));
  console.log(`📊 Unique Property IDs: ${june5Ids.size}`);
  
  // Quick check - just get count from staging
  const countSnapshot = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  console.log(`📊 Current staging: ${countSnapshot.size} records`);
  
  // Sample check for duplicates (Firestore IN limit is 30)
  const sampleIds = [...june5Ids].slice(0, 30);
  const existingCheck = await db.collection('onemap-processing-staging')
    .where('property_id', 'in', sampleIds)
    .get();
  
  const duplicateRate = existingCheck.size / sampleIds.length;
  console.log(`📊 Sample duplicate rate: ${(duplicateRate * 100).toFixed(1)}%`);
  
  const estimatedNew = Math.round(june5Ids.size * (1 - duplicateRate));
  console.log(`📊 Estimated new records: ~${estimatedNew}`);
  
  // Quick report
  const report = `
# June 5th Import Analysis
- CSV Records: ${records.length}
- Unique Property IDs: ${june5Ids.size}
- Current Staging: ${countSnapshot.size}
- Estimated New: ~${estimatedNew}
- Duplicate Rate: ~${(duplicateRate * 100).toFixed(1)}%

## Sample Property IDs from June 5th:
${[...june5Ids].slice(0, 5).join(', ')}

## Next Step:
Run full import to add the ~${estimatedNew} new records
`;
  
  console.log(report);
  
  // Save quick analysis
  await fs.writeFile('june5-quick-analysis.txt', report);
}

quickImport().catch(console.error);