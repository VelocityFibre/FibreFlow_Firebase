#!/usr/bin/env node

/**
 * PROCESS 1: Simple Daily Import & Change Detection
 * 
 * Purpose: 
 * - Import new records (by Property ID)
 * - Detect missing records (were there yesterday, gone today)
 * - Generate simple daily change report
 * 
 * NO complex first-instance tracking - just simple changes
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const STAGING_COLLECTION = 'onemap-processing-staging';
const IMPORT_BATCHES_COLLECTION = 'onemap-processing-imports';

async function parseCSVFile(filePath) {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const cleanContent = fileContent.replace(/^\uFEFF/, '');
  
  const records = csv.parse(cleanContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true
  });
  
  console.log(`✅ Parsed ${records.length} records from CSV`);
  return records;
}

async function detectChanges(csvRecords) {
  console.log('🔍 Detecting changes from yesterday...\n');
  
  // Get all Property IDs from CSV
  const todayPropertyIds = new Set(csvRecords.map(r => r['Property ID']));
  console.log(`📊 Today's CSV has ${todayPropertyIds.size} unique Property IDs`);
  
  // Get all Property IDs from staging (yesterday's data)
  console.log('📊 Loading yesterday\'s data from staging...');
  const yesterdayPropertyIds = new Set();
  
  let lastDoc = null;
  while (true) {
    let query = db.collection(STAGING_COLLECTION)
      .select('property_id')
      .limit(1000);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) break;
    
    snapshot.forEach(doc => {
      yesterdayPropertyIds.add(doc.id);
    });
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  
  console.log(`📊 Yesterday's staging has ${yesterdayPropertyIds.size} unique Property IDs\n`);
  
  // Calculate changes
  const newRecords = [...todayPropertyIds].filter(id => !yesterdayPropertyIds.has(id));
  const missingRecords = [...yesterdayPropertyIds].filter(id => !todayPropertyIds.has(id));
  const existingRecords = [...todayPropertyIds].filter(id => yesterdayPropertyIds.has(id));
  
  return {
    newRecords,
    missingRecords,
    existingRecords,
    todayTotal: todayPropertyIds.size,
    yesterdayTotal: yesterdayPropertyIds.size
  };
}

async function importNewRecords(csvRecords, newPropertyIds, batchId) {
  console.log(`\n💾 Importing ${newPropertyIds.length} new records...`);
  
  const newRecordsData = csvRecords.filter(r => newPropertyIds.includes(r['Property ID']));
  let batch = db.batch();
  let count = 0;
  
  for (const record of newRecordsData) {
    const docRef = db.collection(STAGING_COLLECTION).doc(record['Property ID']);
    batch.set(docRef, {
      property_id: record['Property ID'],
      current_data: record,
      import_batch_id: batchId,
      first_seen_date: admin.firestore.FieldValue.serverTimestamp()
    });
    
    count++;
    
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  Imported ${count}/${newPropertyIds.length}...`);
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Imported all ${count} new records`);
}

async function generateReport(changes, batchId, fileName) {
  const report = `
# Daily Import Report - Simple Change Detection
## Date: ${new Date().toISOString()}
## File: ${fileName}
## Batch: ${batchId}

## Summary
- Yesterday's Total Records: ${changes.yesterdayTotal}
- Today's Total Records: ${changes.todayTotal}
- Net Change: ${changes.todayTotal - changes.yesterdayTotal}

## Changes Detected
### 🆕 NEW Records (Not in yesterday's data): ${changes.newRecords.length}
${changes.newRecords.slice(0, 10).map(id => `- Property ID: ${id}`).join('\n')}
${changes.newRecords.length > 10 ? `... and ${changes.newRecords.length - 10} more` : ''}

### ❌ MISSING Records (In yesterday but not today): ${changes.missingRecords.length}
${changes.missingRecords.slice(0, 10).map(id => `- Property ID: ${id}`).join('\n')}
${changes.missingRecords.length > 10 ? `... and ${changes.missingRecords.length - 10} more` : ''}

### ✅ EXISTING Records (In both): ${changes.existingRecords.length}

## Data Quality Check
- Missing records could indicate:
  - Data was removed from OneMap
  - Data quality cleanup
  - System issues
  ${changes.missingRecords.length > 100 ? '⚠️ WARNING: Large number of missing records!' : ''}

---
Note: This is a simple Property ID comparison. 
For detailed status tracking, use the first-instance analysis process.
`;

  // Save report
  const reportPath = path.join(__dirname, 'reports', `daily_change_report_${batchId}.md`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, report);
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(report);
  
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node daily-import-simple.js <csv-file-path>');
    process.exit(1);
  }
  
  const csvPath = args[0];
  const batchId = `SIMPLE_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  
  console.log(`🚀 Starting Simple Daily Import & Change Detection`);
  console.log(`📁 CSV File: ${csvPath}`);
  console.log(`🏷️  Batch ID: ${batchId}\n`);
  
  try {
    // Parse CSV
    const records = await parseCSVFile(csvPath);
    
    // Detect changes
    const changes = await detectChanges(records);
    
    // Import only new records
    if (changes.newRecords.length > 0) {
      await importNewRecords(records, changes.newRecords, batchId);
    } else {
      console.log('✅ No new records to import');
    }
    
    // Generate report
    await generateReport(changes, batchId, path.basename(csvPath));
    
    // Save batch info
    await db.collection(IMPORT_BATCHES_COLLECTION).doc(batchId).set({
      batch_id: batchId,
      type: 'daily_simple',
      import_date: admin.firestore.FieldValue.serverTimestamp(),
      file_name: path.basename(csvPath),
      new_records: changes.newRecords.length,
      missing_records: changes.missingRecords.length,
      existing_records: changes.existingRecords.length,
      status: 'completed'
    });
    
    console.log('\n✅ Daily import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}