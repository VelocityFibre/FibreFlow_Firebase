#!/usr/bin/env node

/**
 * Optimized OneMap Import with Pre-loading
 * 
 * This version pre-loads all existing data for fast in-memory lookups
 * instead of making thousands of database queries during processing.
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collections
const STAGING_COLLECTION = 'onemap-processing-staging';
const IMPORT_BATCHES_COLLECTION = 'onemap-processing-imports';
const CHANGE_HISTORY_COLLECTION = 'onemap-change-history';
const IMPORT_REPORTS_COLLECTION = 'onemap-import-reports';

/**
 * Normalize status text for consistent matching
 */
function normalizeStatus(status) {
  if (!status) return '';
  return status.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/permissions/g, 'permission')
    .replace(/sign ups/g, 'sign up')
    .replace(/home sign up/g, 'home signup')
    .trim();
}

/**
 * Parse CSV file
 */
async function parseCSVFile(filePath) {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const cleanContent = fileContent.replace(/^\uFEFF/, '');
  
  const records = csv.parse(cleanContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    relax_column_count: true
  });
  
  console.log(`✅ Parsed ${records.length} records from CSV`);
  return records;
}

/**
 * Get tracking key based on available identifiers
 */
function getTrackingKey(record) {
  // Hierarchy: pole → drop → address → property
  if (record['Pole Number'] && record['Pole Number'].trim()) {
    return { type: 'pole', key: record['Pole Number'].trim() };
  }
  if (record['Drop Number'] && record['Drop Number'].trim()) {
    return { type: 'drop', key: record['Drop Number'].trim() };
  }
  if (record['Location Address'] && record['Location Address'].trim()) {
    return { type: 'address', key: record['Location Address'].trim() };
  }
  // Last resort - use property ID
  return { type: 'property', key: record['Property ID'] };
}

/**
 * Pre-load all existing data for fast lookups
 */
async function preloadExistingData() {
  console.log('📊 Pre-loading existing data from staging...');
  const startTime = Date.now();
  
  const existingData = {
    propertyIds: new Set(),
    // Changed from poleStatuses to trackingStatuses - tracks by any identifier
    trackingStatuses: new Map(), // Format: "type:key" → { statuses }
    poleDropCounts: new Map(),
    totalRecords: 0
  };
  
  // Query in batches to avoid memory issues
  let lastDoc = null;
  let batchCount = 0;
  
  while (true) {
    let query = db.collection(STAGING_COLLECTION)
      .select('property_id', 'current_data.Pole Number', 
              'current_data.Status', 'current_data.date_status_changed',
              'current_data.Drop Number')
      .limit(1000);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      break;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      existingData.propertyIds.add(data.property_id);
      existingData.totalRecords++;
      
      // Get tracking key for this record
      const trackingInfo = getTrackingKey(data.current_data || {});
      const trackingKey = `${trackingInfo.type}:${trackingInfo.key}`;
      
      // Initialize tracking data if needed
      if (!existingData.trackingStatuses.has(trackingKey)) {
        existingData.trackingStatuses.set(trackingKey, {});
      }
      
      // Track status history
      const status = normalizeStatus(data.current_data?.Status);
      const date = data.current_data?.date_status_changed;
      
      if (status && date) {
        const trackingData = existingData.trackingStatuses.get(trackingKey);
        // Keep only earliest date for each status
        if (!trackingData[status] || date < trackingData[status].date) {
          trackingData[status] = { 
            date, 
            propertyId: data.property_id,
            originalStatus: data.current_data?.Status,
            trackingType: trackingInfo.type
          };
        }
      }
      
      // Still track drops per pole for validation
      const poleNumber = data.current_data?.['Pole Number'];
      if (poleNumber) {
        if (!existingData.poleDropCounts.has(poleNumber)) {
          existingData.poleDropCounts.set(poleNumber, 0);
        }
        
        if (data.current_data?.['Drop Number']) {
          existingData.poleDropCounts.set(
            poleNumber, 
            existingData.poleDropCounts.get(poleNumber) + 1
          );
        }
      }
    });
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    batchCount++;
    console.log(`  Loaded batch ${batchCount} (${existingData.totalRecords} records so far)...`);
  }
  
  const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Pre-loaded ${existingData.totalRecords} records in ${loadTime}s`);
  console.log(`   - Tracking ${existingData.trackingStatuses.size} unique entities (poles/drops/addresses)`);
  
  // Break down by type
  let typeCount = { pole: 0, drop: 0, address: 0, property: 0 };
  existingData.trackingStatuses.forEach((_, key) => {
    const type = key.split(':')[0];
    typeCount[type]++;
  });
  console.log(`   - By type: ${typeCount.pole} poles, ${typeCount.drop} drops, ${typeCount.address} addresses`);
  
  return existingData;
}

/**
 * Process records with pre-loaded data
 */
async function processRecordsOptimized(records, existingData, batchId) {
  const report = {
    total_records: records.length,
    new_records: 0,
    duplicate_property_ids: 0,
    first_pole_permissions: 0,
    first_pole_planted: 0,
    first_home_signups: 0,
    first_home_installs: 0,
    total_home_signups: 0,
    validation_issues: []
  };
  
  let batch = db.batch();
  let batchOperations = 0;
  const MAX_BATCH_SIZE = 400; // Firestore limit is 500
  
  console.log('\n💾 Processing records...');
  const startTime = Date.now();
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const propertyId = record['Property ID'];
    
    // Skip if duplicate
    if (existingData.propertyIds.has(propertyId)) {
      report.duplicate_property_ids++;
      continue;
    }
    
    // New record
    report.new_records++;
    
    // Check first instances using broader tracking
    const status = record['Status'];
    const statusDate = record['date_status_changed'];
    const normalizedStatus = normalizeStatus(status);
    const dropNumber = record['Drop Number'];
    
    // Get tracking key for this record
    const trackingInfo = getTrackingKey(record);
    const trackingKey = `${trackingInfo.type}:${trackingInfo.key}`;
    
    let isFirstInstance = false;
    
    if (status && statusDate) {
      const trackingData = existingData.trackingStatuses.get(trackingKey) || {};
      
      // Check if this is first instance of this status for this tracking key
      if (!trackingData[normalizedStatus] || statusDate < trackingData[normalizedStatus].date) {
        isFirstInstance = true;
        
        // Count specific milestones
        if (normalizedStatus.includes('pole permission') && normalizedStatus.includes('approved')) {
          report.first_pole_permissions++;
        } else if (normalizedStatus.includes('pole planted') || normalizedStatus.includes('installed')) {
          report.first_pole_planted++;
        } else if (normalizedStatus.includes('home signup')) {
          report.first_home_signups++;
        } else if (normalizedStatus.includes('home install')) {
          report.first_home_installs++;
        }
        
        // Update our tracking (for subsequent records in this batch)
        if (!trackingData[normalizedStatus]) {
          trackingData[normalizedStatus] = { date: statusDate, propertyId };
          existingData.trackingStatuses.set(trackingKey, trackingData);
        }
      }
    }
    
    // Count all home signups (not just first)
    if (normalizedStatus.includes('home signup') && dropNumber) {
      report.total_home_signups++;
    }
    
    // Check drops per pole limit (only if we have a pole number)
    const poleNumber = record['Pole Number'];
    if (poleNumber && dropNumber) {
      const currentDrops = existingData.poleDropCounts.get(poleNumber) || 0;
      if (currentDrops >= 12) {
        report.validation_issues.push({
          type: 'drops_exceeded',
          pole: poleNumber,
          count: currentDrops + 1
        });
      }
      existingData.poleDropCounts.set(poleNumber, currentDrops + 1);
    }
    
    // Add to batch
    const docRef = db.collection(STAGING_COLLECTION).doc(propertyId);
    batch.set(docRef, {
      property_id: propertyId,
      current_data: record,
      import_batch_id: batchId,
      first_seen_date: admin.firestore.FieldValue.serverTimestamp(),
      last_updated_date: admin.firestore.FieldValue.serverTimestamp(),
      is_first_instance: isFirstInstance
    });
    
    // Add to change history
    const changeRef = db.collection(CHANGE_HISTORY_COLLECTION).doc();
    batch.set(changeRef, {
      property_id: propertyId,
      batch_id: batchId,
      change_type: 'new',
      change_date: admin.firestore.FieldValue.serverTimestamp(),
      record_snapshot: record,
      is_first_instance: isFirstInstance
    });
    
    batchOperations += 2; // One for staging, one for history
    
    // Commit batch when near limit
    if (batchOperations >= MAX_BATCH_SIZE) {
      await batch.commit();
      batch = db.batch(); // Create new batch
      batchOperations = 0;
      console.log(`  Processed ${i + 1}/${records.length} records...`);
    }
    
    // Show progress every 500 records
    if ((i + 1) % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Processed ${i + 1}/${records.length} records (${elapsed}s)...`);
    }
  }
  
  // Final batch commit
  if (batchOperations > 0) {
    await batch.commit();
  }
  
  const processTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Processed all records in ${processTime}s`);
  
  return report;
}

/**
 * Generate and save report
 */
async function generateReport(report, batchId, fileName) {
  const reportText = `
# OneMap Import Report (Optimized)
## Batch ID: ${batchId}
## File: ${fileName}
## Date: ${new Date().toISOString()}

### Summary
- Total Records Processed: ${report.total_records}
- New Records Imported: ${report.new_records}
- Duplicate Property IDs Skipped: ${report.duplicate_property_ids}

### First Instance Tracking (Avoiding Duplicates)
**Note: Tracking by pole → drop → address → property hierarchy**
- First Pole Permissions: ${report.first_pole_permissions}
- First Poles Planted: ${report.first_pole_planted}
- First Home Sign-ups: ${report.first_home_signups}
- First Home Installs: ${report.first_home_installs}
- Total Home Sign-ups (all homes): ${report.total_home_signups}

This includes records without pole numbers that are tracked by drop number or address.

### Validation Issues
- Total Issues: ${report.validation_issues.length}
${report.validation_issues.slice(0, 10).map(issue => 
  `- ${issue.type}: Pole ${issue.pole} (${issue.count} drops)`
).join('\n')}

### Performance
- Pre-loading and processing completed efficiently using in-memory lookups
- No database queries during record processing
`;

  // Save to file
  const reportPath = path.join(__dirname, 'reports', `import_report_${batchId}.txt`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, reportText);
  
  // Save to Firestore
  await db.collection(IMPORT_REPORTS_COLLECTION).add({
    batch_id: batchId,
    report_type: 'optimized_import',
    report_data: report,
    created_date: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(reportText);
}

/**
 * Main import function
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node import-onemap-optimized.js <csv-file-path>');
    process.exit(1);
  }
  
  const csvPath = args[0];
  const batchId = `IMP_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  
  console.log(`🚀 Starting Optimized OneMap Import`);
  console.log(`📁 CSV File: ${csvPath}`);
  console.log(`🏷️  Batch ID: ${batchId}`);
  
  try {
    // Create import batch record
    await db.collection(IMPORT_BATCHES_COLLECTION).doc(batchId).set({
      batch_id: batchId,
      import_date: admin.firestore.FieldValue.serverTimestamp(),
      file_name: path.basename(csvPath),
      status: 'processing'
    });
    
    // Step 1: Pre-load existing data
    const existingData = await preloadExistingData();
    
    // Step 2: Parse CSV
    const records = await parseCSVFile(csvPath);
    
    // Step 3: Process records with optimized lookups
    const report = await processRecordsOptimized(records, existingData, batchId);
    
    // Step 4: Update batch status
    await db.collection(IMPORT_BATCHES_COLLECTION).doc(batchId).update({
      status: 'completed',
      total_rows_processed: report.total_records,
      new_records_count: report.new_records,
      duplicate_count: report.duplicate_property_ids,
      first_pole_permissions: report.first_pole_permissions,
      first_poles_planted: report.first_pole_planted,
      first_home_signups: report.first_home_signups,
      first_home_installs: report.first_home_installs,
      total_home_signups: report.total_home_signups
    });
    
    // Step 5: Generate report
    await generateReport(report, batchId, path.basename(csvPath));
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    
    // Update batch status to failed
    await db.collection(IMPORT_BATCHES_COLLECTION).doc(batchId).update({
      status: 'failed',
      error_message: error.message
    });
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parseCSVFile, preloadExistingData, processRecordsOptimized };