#!/usr/bin/env node

/**
 * OneMap Daily Import Script with Verification
 * 
 * Purpose: Import daily OneMap CSV files with comprehensive verification
 * - Compares new CSV against staging database
 * - Performs multiple verification checks
 * - Generates detailed change reports
 * - Prevents duplicate imports
 * 
 * Usage: node import-onemap-daily.js <csv-file-path>
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');

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

// Business Logic Constraints
const CONSTRAINTS = {
  MAX_DROPS_PER_POLE: 12,
  EXPECTED_POLES_PER_DAY_MIN: 50,
  EXPECTED_POLES_PER_DAY_MAX: 500,
  LAWLEY_GPS_BOUNDS: {
    lat: { min: -26.35, max: -26.15 },
    lng: { min: 28.20, max: 28.40 }
  }
};

/**
 * Verification Results Structure
 */
class VerificationReport {
  constructor() {
    this.summary = {
      total_records: 0,
      new_records: 0,
      duplicate_property_ids: 0,
      status_changes: 0,
      pole_assignments: 0,
      drops_added: 0,
      verification_passed: true,
      // First instance tracking
      first_pole_permissions: 0,
      first_pole_planted: 0,
      first_home_signups: 0,
      first_home_installs: 0,
      total_home_signups: 0  // Count all home signups (not just first)
    };
    
    this.checks = {
      manual_spot_checks: [],
      count_verification: {},
      business_logic_checks: {
        poles_per_day: { value: 0, passed: true },
        drops_per_pole: { violations: [], passed: true },
        gps_bounds: { violations: [], passed: true },
        conflicting_statuses: { violations: [], passed: true }
      },
      red_flags: []
    };
    
    this.changes = {
      new_poles: [],
      status_changes: [],
      pole_assignments: [],
      drop_additions: [],
      agent_changes: []
    };
  }
  
  addRedFlag(flag) {
    this.red_flags.push(flag);
    this.summary.verification_passed = false;
  }
}

/**
 * Parse CSV file
 */
async function parseCSVFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    // Remove BOM if present
    const cleanContent = fileContent.replace(/^\uFEFF/, '');
    
    const records = csv.parse(cleanContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true
    });
    console.log(`✅ Parsed ${records.length} records from CSV`);
    return records;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    throw error;
  }
}

/**
 * Get best tracking identifier for a record
 */
function getTrackingIdentifier(record) {
  if (record['Pole Number'] && record['Pole Number'].trim()) {
    return { type: 'pole', value: record['Pole Number'].trim() };
  }
  if (record['Drop Number'] && record['Drop Number'].trim()) {
    return { type: 'drop', value: record['Drop Number'].trim() };
  }
  if (record['Latitude'] && record['Longitude']) {
    const lat = parseFloat(record['Latitude']);
    const lng = parseFloat(record['Longitude']);
    if (!isNaN(lat) && !isNaN(lng)) {
      // Round to ~10m accuracy
      return { type: 'gps', value: `${lat.toFixed(4)},${lng.toFixed(4)}` };
    }
  }
  if (record['Location Address'] && record['Location Address'].trim()) {
    return { type: 'address', value: record['Location Address'].trim() };
  }
  return { type: 'property_id', value: record['Property ID'] };
}

/**
 * Perform manual spot checks on random records
 */
async function performSpotChecks(records, sampleSize = 5) {
  const spotChecks = [];
  const sampleIndices = [];
  
  // Get random indices
  while (sampleIndices.length < Math.min(sampleSize, records.length)) {
    const idx = Math.floor(Math.random() * records.length);
    if (!sampleIndices.includes(idx)) {
      sampleIndices.push(idx);
    }
  }
  
  // Check each sample
  for (const idx of sampleIndices) {
    const record = records[idx];
    const propertyId = record['Property ID'];
    
    // Check if exists in staging
    const existing = await db.collection(STAGING_COLLECTION)
      .doc(propertyId)
      .get();
    
    spotChecks.push({
      property_id: propertyId,
      pole_number: record['Pole Number'] || 'N/A',
      address: record['Location Address'] || 'N/A',
      status: record['Status'] || 'N/A',
      exists_in_staging: existing.exists,
      tracking_id: getTrackingIdentifier(record)
    });
  }
  
  return spotChecks;
}

/**
 * Perform count verification
 */
function performCountVerification(records) {
  const counts = {
    total_records: records.length,
    unique_property_ids: new Set(records.map(r => r['Property ID'])).size,
    unique_poles: new Set(records.map(r => r['Pole Number']).filter(Boolean)).size,
    unique_addresses: new Set(records.map(r => r['Location Address']).filter(Boolean)).size,
    status_breakdown: {}
  };
  
  // Count by status
  records.forEach(record => {
    const status = record['Status'] || 'No Status';
    counts.status_breakdown[status] = (counts.status_breakdown[status] || 0) + 1;
  });
  
  return counts;
}

/**
 * Check business logic constraints
 */
async function checkBusinessLogic(records, report) {
  const polesPerDay = {};
  const dropsPerPole = {};
  const gpsViolations = [];
  const statusConflicts = {};
  
  // Analyze each record
  for (const record of records) {
    // Check drops per pole
    const poleNumber = record['Pole Number'];
    const dropNumber = record['Drop Number'];
    if (poleNumber && dropNumber) {
      if (!dropsPerPole[poleNumber]) {
        dropsPerPole[poleNumber] = new Set();
      }
      dropsPerPole[poleNumber].add(dropNumber);
    }
    
    // Check GPS bounds
    const lat = parseFloat(record['Latitude']);
    const lng = parseFloat(record['Longitude']);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (lat < CONSTRAINTS.LAWLEY_GPS_BOUNDS.lat.min || 
          lat > CONSTRAINTS.LAWLEY_GPS_BOUNDS.lat.max ||
          lng < CONSTRAINTS.LAWLEY_GPS_BOUNDS.lng.min || 
          lng > CONSTRAINTS.LAWLEY_GPS_BOUNDS.lng.max) {
        gpsViolations.push({
          property_id: record['Property ID'],
          pole_number: poleNumber,
          gps: `${lat},${lng}`,
          address: record['Location Address']
        });
      }
    }
    
    // Track status by pole for conflict detection
    if (poleNumber) {
      if (!statusConflicts[poleNumber]) {
        statusConflicts[poleNumber] = new Set();
      }
      statusConflicts[poleNumber].add(record['Status']);
    }
  }
  
  // Check violations
  const dropViolations = [];
  for (const [pole, drops] of Object.entries(dropsPerPole)) {
    if (drops.size > CONSTRAINTS.MAX_DROPS_PER_POLE) {
      dropViolations.push({
        pole,
        drop_count: drops.size,
        limit: CONSTRAINTS.MAX_DROPS_PER_POLE
      });
    }
  }
  
  // Check status conflicts
  const conflicts = [];
  for (const [pole, statuses] of Object.entries(statusConflicts)) {
    if (statuses.size > 1) {
      conflicts.push({
        pole,
        conflicting_statuses: Array.from(statuses)
      });
    }
  }
  
  // Update report
  report.checks.business_logic_checks.drops_per_pole.violations = dropViolations;
  report.checks.business_logic_checks.drops_per_pole.passed = dropViolations.length === 0;
  
  report.checks.business_logic_checks.gps_bounds.violations = gpsViolations;
  report.checks.business_logic_checks.gps_bounds.passed = gpsViolations.length === 0;
  
  report.checks.business_logic_checks.conflicting_statuses.violations = conflicts;
  report.checks.business_logic_checks.conflicting_statuses.passed = conflicts.length === 0;
  
  return report;
}

/**
 * Normalize status text for consistent matching
 */
function normalizeStatus(status) {
  if (!status) return '';
  return status.toLowerCase()
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/permissions/g, 'permission')  // Normalize plural
    .replace(/sign ups/g, 'sign up')
    .replace(/home sign up/g, 'home signup')  // Standardize
    .trim();
}

/**
 * Check if this is a first instance of a status for a pole
 */
async function isFirstInstanceForPole(poleNumber, normalizedStatus, statusDate) {
  if (!poleNumber) return false;
  
  // Query for all records with this pole number
  const poleRecords = await db.collection(STAGING_COLLECTION)
    .where('current_data.Pole Number', '==', poleNumber)
    .get();
  
  let earliestDate = statusDate;
  let isFirst = true;
  
  poleRecords.forEach(doc => {
    const data = doc.data();
    const recordStatus = normalizeStatus(data.current_data.Status);
    const recordDate = data.current_data.date_status_changed;
    
    // If same status found with earlier date, this is not first
    if (recordStatus === normalizedStatus && recordDate < statusDate) {
      isFirst = false;
    }
  });
  
  return isFirst;
}

/**
 * Process record and detect changes
 */
async function processRecord(record, report, batchId, firstInstanceTracking) {
  const propertyId = record['Property ID'];
  
  // Check if already exists
  const existingDoc = await db.collection(STAGING_COLLECTION).doc(propertyId).get();
  
  if (existingDoc.exists) {
    report.summary.duplicate_property_ids++;
    return; // Skip duplicates
  }
  
  // New record - check for changes to same pole/address
  const trackingId = getTrackingIdentifier(record);
  report.summary.new_records++;
  
  // Import the new record
  const stagingRecord = {
    property_id: propertyId,
    tracking_key: `${trackingId.type}:${trackingId.value}`,
    current_data: record,
    import_batch_id: batchId,
    first_seen_date: admin.firestore.FieldValue.serverTimestamp(),
    last_updated_date: admin.firestore.FieldValue.serverTimestamp(),
    version: 1,
    is_active: true
  };
  
  // Save to staging
  await db.collection(STAGING_COLLECTION).doc(propertyId).set(stagingRecord);
  
  // Track first instances for poles
  const poleNumber = record['Pole Number'];
  const status = record['Status'];
  const statusDate = record['date_status_changed'];
  const normalizedStatus = normalizeStatus(status);
  let isFirst = false;
  
  if (poleNumber && status && statusDate) {
    // Check if this is first instance of this status for this pole
    isFirst = await isFirstInstanceForPole(poleNumber, normalizedStatus, statusDate);
    
    if (isFirst) {
      // Track in first instance report
      if (!firstInstanceTracking[poleNumber]) {
        firstInstanceTracking[poleNumber] = {};
      }
      
      if (!firstInstanceTracking[poleNumber][normalizedStatus]) {
        firstInstanceTracking[poleNumber][normalizedStatus] = {
          date: statusDate,
          property_id: propertyId,
          original_status: status
        };
        
        // Count specific milestones
        if (normalizedStatus.includes('pole permission') && normalizedStatus.includes('approved')) {
          report.summary.first_pole_permissions++;
        } else if (normalizedStatus.includes('pole planted') || normalizedStatus.includes('installed')) {
          report.summary.first_pole_planted++;
        } else if (normalizedStatus.includes('home signup')) {
          report.summary.first_home_signups++;
        } else if (normalizedStatus.includes('home install')) {
          report.summary.first_home_installs++;
        }
      }
    }
  }
  
  // Track home sign-ups separately (count each home)
  if (normalizedStatus.includes('home signup') && record['Drop Number']) {
    report.summary.total_home_signups++;
  }
  
  // Track specific changes
  if (record['Pole Number'] && !existingDoc.exists) {
    report.changes.new_poles.push({
      pole: record['Pole Number'],
      address: record['Location Address'],
      status: record['Status'],
      is_first_instance: isFirst
    });
  }
  
  // Log to change history
  await db.collection(CHANGE_HISTORY_COLLECTION).add({
    property_id: propertyId,
    batch_id: batchId,
    change_type: 'new',
    change_date: admin.firestore.FieldValue.serverTimestamp(),
    record_snapshot: record,
    is_first_instance: isFirst || false
  });
}

/**
 * Generate and save reports
 */
async function generateReports(report, batchId, csvFileName) {
  // Generate text report
  const textReport = `
# OneMap Import Report
## Batch ID: ${batchId}
## File: ${csvFileName}
## Date: ${new Date().toISOString()}

### Summary
- Total Records Processed: ${report.summary.total_records}
- New Records Imported: ${report.summary.new_records}
- Duplicate Property IDs Skipped: ${report.summary.duplicate_property_ids}
- Verification Status: ${report.summary.verification_passed ? '✅ PASSED' : '❌ FAILED'}

### First Instance Tracking (Avoiding Duplicates)
- First Pole Permissions: ${report.summary.first_pole_permissions}
- First Poles Planted: ${report.summary.first_pole_planted}
- First Home Sign-ups: ${report.summary.first_home_signups}
- First Home Installs: ${report.summary.first_home_installs}
- Total Home Sign-ups (all homes): ${report.summary.total_home_signups}

### Verification Checks

#### 1. Manual Spot Checks (${report.checks.manual_spot_checks.length} samples)
${report.checks.manual_spot_checks.map(check => 
  `- Property ${check.property_id}: ${check.exists_in_staging ? 'Already exists' : 'New record'} | Pole: ${check.pole_number}`
).join('\n')}

#### 2. Count Verification
- Unique Property IDs: ${report.checks.count_verification.unique_property_ids}
- Unique Poles: ${report.checks.count_verification.unique_poles}
- Unique Addresses: ${report.checks.count_verification.unique_addresses}

Status Breakdown:
${Object.entries(report.checks.count_verification.status_breakdown || {})
  .map(([status, count]) => `- ${status}: ${count}`)
  .join('\n')}

#### 3. Business Logic Checks
- Drops per Pole: ${report.checks.business_logic_checks.drops_per_pole.passed ? '✅ PASSED' : '❌ FAILED'}
  ${report.checks.business_logic_checks.drops_per_pole.violations.length > 0 ? 
    'Violations: ' + report.checks.business_logic_checks.drops_per_pole.violations
      .map(v => `Pole ${v.pole} has ${v.drop_count} drops (limit: ${v.limit})`)
      .join(', ') : ''}
      
- GPS Bounds: ${report.checks.business_logic_checks.gps_bounds.passed ? '✅ PASSED' : '❌ FAILED'}
  ${report.checks.business_logic_checks.gps_bounds.violations.length > 0 ?
    `Found ${report.checks.business_logic_checks.gps_bounds.violations.length} records outside Lawley area` : ''}
    
- Status Conflicts: ${report.checks.business_logic_checks.conflicting_statuses.passed ? '✅ PASSED' : '❌ FAILED'}
  ${report.checks.business_logic_checks.conflicting_statuses.violations.length > 0 ?
    `Found ${report.checks.business_logic_checks.conflicting_statuses.violations.length} poles with conflicting statuses` : ''}

### Changes Detected
- New Poles: ${report.changes.new_poles.length}
- Status Changes: ${report.changes.status_changes.length}
- Pole Assignments: ${report.changes.pole_assignments.length}
- Drop Additions: ${report.changes.drop_additions.length}

${report.checks.red_flags && report.checks.red_flags.length > 0 ? `
### ⚠️ Red Flags
${report.checks.red_flags.join('\n')}
` : ''}
  `;
  
  // Save text report to file
  const reportPath = path.join(__dirname, 'reports', `import_report_${batchId}.txt`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, textReport);
  
  // Save to Firestore
  await db.collection(IMPORT_REPORTS_COLLECTION).add({
    batch_id: batchId,
    report_type: 'import_with_verification',
    report_data: report,
    created_date: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  return textReport;
}

/**
 * Main import function
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node import-onemap-daily.js <csv-file-path>');
    process.exit(1);
  }
  
  const csvPath = args[0];
  const batchId = `IMP_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  
  console.log(`🚀 Starting OneMap Daily Import`);
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
    
    // Parse CSV
    const records = await parseCSVFile(csvPath);
    const report = new VerificationReport();
    report.summary.total_records = records.length;
    
    // Step 1: Manual Spot Checks
    console.log('\n🔍 Performing manual spot checks...');
    report.checks.manual_spot_checks = await performSpotChecks(records);
    
    // Step 2: Count Verification
    console.log('📊 Performing count verification...');
    report.checks.count_verification = performCountVerification(records);
    
    // Step 3: Business Logic Checks
    console.log('🏗️  Checking business logic constraints...');
    await checkBusinessLogic(records, report);
    
    // Step 4: Process Records
    console.log('\n💾 Processing records...');
    let processed = 0;
    const firstInstanceTracking = {}; // Track first instances across all records
    
    for (const record of records) {
      await processRecord(record, report, batchId, firstInstanceTracking);
      processed++;
      
      if (processed % 100 === 0) {
        console.log(`  Processed ${processed}/${records.length} records...`);
      }
    }
    
    // Update batch status
    await db.collection(IMPORT_BATCHES_COLLECTION).doc(batchId).update({
      status: 'completed',
      total_rows_processed: report.summary.total_records,
      new_records_count: report.summary.new_records,
      duplicate_count: report.summary.duplicate_property_ids,
      verification_passed: report.summary.verification_passed
    });
    
    // Generate reports
    console.log('\n📝 Generating reports...');
    const textReport = await generateReports(report, batchId, path.basename(csvPath));
    
    // Display summary
    console.log('\n' + textReport);
    
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

module.exports = { parseCSVFile, processRecord, performSpotChecks };