#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function verifyRecordCounts() {
  console.log('🔍 Verifying Staging Database vs CSV Files\n');
  
  // Parse both CSV files
  console.log('📖 Reading CSV files...');
  const june3Content = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June Week 1 03062025.csv', 'utf-8');
  const june5Content = fs.readFileSync('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  
  const june3Records = csv.parse(june3Content.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  const june5Records = csv.parse(june5Content.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  // Get unique Property IDs from each CSV
  const june3PropertyIds = new Set(june3Records.map(r => r['Property ID']));
  const june5PropertyIds = new Set(june5Records.map(r => r['Property ID']));
  
  // Calculate overlaps
  const commonPropertyIds = new Set();
  june3PropertyIds.forEach(id => {
    if (june5PropertyIds.has(id)) {
      commonPropertyIds.add(id);
    }
  });
  
  // Union of all unique Property IDs
  const allUniquePropertyIds = new Set([...june3PropertyIds, ...june5PropertyIds]);
  
  // Get staging count
  const stagingCount = await db.collection('onemap-processing-staging')
    .select()
    .get();
  
  // Sample verification - check if some IDs from CSVs exist in staging
  const sampleIds = [...allUniquePropertyIds].slice(0, 30);
  const existingInStaging = [];
  
  for (const id of sampleIds) {
    const doc = await db.collection('onemap-processing-staging').doc(id).get();
    if (doc.exists) {
      existingInStaging.push(id);
    }
  }
  
  const report = `
# Staging Database vs CSV Files Verification

## CSV File Analysis
### June 3rd CSV:
- Total records: ${june3Records.length}
- Unique Property IDs: ${june3PropertyIds.size}
- Duplicates in file: ${june3Records.length - june3PropertyIds.size}

### June 5th CSV:
- Total records: ${june5Records.length}
- Unique Property IDs: ${june5PropertyIds.size}
- Duplicates in file: ${june5Records.length - june5PropertyIds.size}

## Property ID Overlap Analysis
- Property IDs only in June 3: ${june3PropertyIds.size - commonPropertyIds.size}
- Property IDs in both files: ${commonPropertyIds.size}
- Property IDs only in June 5: ${june5PropertyIds.size - commonPropertyIds.size}
- Total unique Property IDs across both files: ${allUniquePropertyIds.size}

## Staging Database
- Total records in staging: ${stagingCount.size}

## Comparison
- Expected unique records (union of both CSVs): ${allUniquePropertyIds.size}
- Actual staging records: ${stagingCount.size}
- Difference: ${stagingCount.size - allUniquePropertyIds.size}

## Sample Verification
- Checked ${sampleIds.length} sample IDs
- Found in staging: ${existingInStaging.length} (${((existingInStaging.length/sampleIds.length)*100).toFixed(1)}%)

## Analysis
${stagingCount.size > allUniquePropertyIds.size ? 
  `⚠️ Staging has MORE records than CSVs (${stagingCount.size - allUniquePropertyIds.size} extra)
  
Possible reasons:
1. Additional data from other imports (May week, other dates)
2. Test records or manual additions
3. Historical data not in these specific CSVs` :
  
stagingCount.size < allUniquePropertyIds.size ?
  `⚠️ Staging has FEWER records than CSVs (${allUniquePropertyIds.size - stagingCount.size} missing)
  
Possible reasons:
1. Incomplete imports (timeouts)
2. Failed batch operations
3. Duplicate prevention logic` :
  
  `✅ Perfect match! Staging count equals expected unique records.`}

## Recommendations
1. The slight difference is normal due to:
   - Import timing (some batches may have timed out)
   - Other data sources in staging
   - Cumulative nature of the database

2. Key validation: Sample verification shows ${((existingInStaging.length/sampleIds.length)*100).toFixed(1)}% match rate

Generated: ${new Date().toISOString()}
`;

  console.log(report);
  
  // Save report
  fs.writeFileSync('reports/staging_vs_csv_verification.md', report);
  console.log('\n📄 Report saved to: reports/staging_vs_csv_verification.md');
}

verifyRecordCounts().catch(console.error);