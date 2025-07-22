const fs = require('fs');
const csv = require('csv-parse/sync');
const path = require('path');

// File paths
const june3File = path.join(__dirname, 'downloads/Lawley Raw Stats/Lawley June Week 1 03062025.csv');
const june5File = path.join(__dirname, 'downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv');

// Read and parse CSV files
console.log('Reading CSV files...');
const june3Data = fs.readFileSync(june3File, 'utf-8');
const june5Data = fs.readFileSync(june5File, 'utf-8');

const june3Records = csv.parse(june3Data, { 
  columns: true, 
  delimiter: ';',
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

const june5Records = csv.parse(june5Data, { 
  columns: true, 
  delimiter: ';',
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

console.log(`\nFile Statistics:`);
console.log(`June 3rd: ${june3Records.length} records`);
console.log(`June 5th: ${june5Records.length} records`);
console.log(`Difference: +${june5Records.length - june3Records.length} records\n`);

// Create tracking maps based on our hierarchy
// Priority: pole > drop > gps > address
function createTrackingKey(record) {
  const poleNumber = record['Pole Number']?.trim();
  const dropNumber = record['Drop Number']?.trim();
  const latitude = record['Latitude']?.trim();
  const longitude = record['Longitude']?.trim();
  const address = record['Location Address']?.trim();
  
  if (poleNumber) return { type: 'pole', key: poleNumber, value: poleNumber };
  if (dropNumber) return { type: 'drop', key: dropNumber, value: dropNumber };
  if (latitude && longitude) return { type: 'gps', key: `${latitude},${longitude}`, value: `GPS: ${latitude},${longitude}` };
  if (address) return { type: 'address', key: address.toLowerCase(), value: address };
  
  return { type: 'none', key: null, value: 'No identifier' };
}

// Build tracking map for June 3rd
const june3Map = new Map();
const june3ByPropertyId = new Map();

june3Records.forEach(record => {
  const propertyId = record['﻿Property ID'] || record['Property ID'];
  const tracking = createTrackingKey(record);
  
  // Store by property ID
  june3ByPropertyId.set(propertyId, record);
  
  // Store by tracking key
  if (tracking.key) {
    if (!june3Map.has(tracking.key)) {
      june3Map.set(tracking.key, []);
    }
    june3Map.get(tracking.key).push(record);
  }
});

// Analyze June 5th records
const newRecords = [];
const existingRecords = [];
const statusChanges = [];
const fieldChanges = [];
const ambiguousMatches = [];

june5Records.forEach(record => {
  const propertyId = record['﻿Property ID'] || record['Property ID'];
  const tracking = createTrackingKey(record);
  
  // Check if this is a completely new property ID
  if (!june3ByPropertyId.has(propertyId)) {
    newRecords.push({ record, tracking });
    return;
  }
  
  // Property ID exists, check for changes
  const oldRecord = june3ByPropertyId.get(propertyId);
  existingRecords.push({ record, tracking });
  
  // Check for status changes
  const oldStatus = oldRecord['Status'];
  const newStatus = record['Status'];
  if (oldStatus !== newStatus) {
    statusChanges.push({
      propertyId,
      oldStatus,
      newStatus,
      tracking,
      address: record['Location Address']
    });
  }
  
  // Check for significant field changes
  const significantFields = [
    'Pole Number',
    'Drop Number',
    'Field Agent Name (pole permission)',
    'date_status_changed',
    'Owner or Tenant'
  ];
  
  const changes = [];
  significantFields.forEach(field => {
    if (oldRecord[field] !== record[field]) {
      changes.push({
        field,
        oldValue: oldRecord[field] || '(empty)',
        newValue: record[field] || '(empty)'
      });
    }
  });
  
  if (changes.length > 0) {
    fieldChanges.push({
      propertyId,
      tracking,
      address: record['Location Address'],
      changes
    });
  }
  
  // Check for ambiguous matches (same tracking key, different property IDs)
  if (tracking.key && june3Map.has(tracking.key)) {
    const matchingRecords = june3Map.get(tracking.key);
    if (matchingRecords.length > 1 || (matchingRecords.length === 1 && matchingRecords[0]['﻿Property ID'] !== propertyId)) {
      ambiguousMatches.push({
        propertyId,
        tracking,
        matchCount: matchingRecords.length,
        matchingPropertyIds: matchingRecords.map(r => r['﻿Property ID'] || r['Property ID'])
      });
    }
  }
});

// Generate report
console.log('=== CHANGE ANALYSIS REPORT ===\n');

console.log(`1. NEW RECORDS: ${newRecords.length}`);
console.log('   Records with new Property IDs not present in June 3rd\n');

// Group new records by tracking type
const newByType = {
  pole: newRecords.filter(r => r.tracking.type === 'pole'),
  drop: newRecords.filter(r => r.tracking.type === 'drop'),
  gps: newRecords.filter(r => r.tracking.type === 'gps'),
  address: newRecords.filter(r => r.tracking.type === 'address'),
  none: newRecords.filter(r => r.tracking.type === 'none')
};

Object.entries(newByType).forEach(([type, records]) => {
  if (records.length > 0) {
    console.log(`   ${type.toUpperCase()}: ${records.length} records`);
    // Show first 3 examples
    records.slice(0, 3).forEach(r => {
      console.log(`     - Property ${r.record['﻿Property ID'] || r.record['Property ID']}: ${r.tracking.value} (${r.record['Status']})`);
    });
    if (records.length > 3) console.log(`     ... and ${records.length - 3} more`);
  }
});

console.log(`\n2. STATUS CHANGES: ${statusChanges.length}`);
if (statusChanges.length > 0) {
  // Group by status change type
  const changeTypes = {};
  statusChanges.forEach(change => {
    const key = `${change.oldStatus || 'null'} → ${change.newStatus || 'null'}`;
    if (!changeTypes[key]) changeTypes[key] = [];
    changeTypes[key].push(change);
  });
  
  Object.entries(changeTypes).forEach(([changeType, changes]) => {
    console.log(`\n   ${changeType}: ${changes.length} records`);
    changes.slice(0, 3).forEach(change => {
      console.log(`     - Property ${change.propertyId}: ${change.tracking.value}`);
      console.log(`       Address: ${change.address}`);
    });
    if (changes.length > 3) console.log(`     ... and ${changes.length - 3} more`);
  });
}

console.log(`\n3. FIELD CHANGES: ${fieldChanges.length} records with changes`);
if (fieldChanges.length > 0) {
  // Show most common field changes
  const fieldChangeCount = {};
  fieldChanges.forEach(fc => {
    fc.changes.forEach(change => {
      fieldChangeCount[change.field] = (fieldChangeCount[change.field] || 0) + 1;
    });
  });
  
  console.log('\n   Most changed fields:');
  Object.entries(fieldChangeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      console.log(`     - ${field}: ${count} changes`);
    });
  
  // Show examples
  console.log('\n   Examples:');
  fieldChanges.slice(0, 3).forEach(fc => {
    console.log(`\n   Property ${fc.propertyId} (${fc.tracking.value}):`);
    fc.changes.forEach(change => {
      console.log(`     ${change.field}: "${change.oldValue}" → "${change.newValue}"`);
    });
  });
}

console.log(`\n4. AMBIGUOUS MATCHES: ${ambiguousMatches.length}`);
if (ambiguousMatches.length > 0) {
  console.log('   Records where tracking identifier matches multiple property IDs');
  ambiguousMatches.slice(0, 5).forEach(am => {
    console.log(`\n   Property ${am.propertyId} (${am.tracking.value}):`);
    console.log(`     Matches ${am.matchCount} other properties: ${am.matchingPropertyIds.join(', ')}`);
  });
}

// Summary statistics
console.log('\n=== SUMMARY ===');
console.log(`Total records June 3rd: ${june3Records.length}`);
console.log(`Total records June 5th: ${june5Records.length}`);
console.log(`Net increase: ${june5Records.length - june3Records.length}`);
console.log(`New property IDs: ${newRecords.length}`);
console.log(`Existing property IDs: ${existingRecords.length}`);
console.log(`Records with status changes: ${statusChanges.length}`);
console.log(`Records with field changes: ${fieldChanges.length}`);

// Status distribution
const june5StatusCount = {};
june5Records.forEach(record => {
  const status = record['Status'] || 'No Status';
  june5StatusCount[status] = (june5StatusCount[status] || 0) + 1;
});

console.log('\nJune 5th Status Distribution:');
Object.entries(june5StatusCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });