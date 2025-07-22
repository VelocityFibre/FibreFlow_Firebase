#!/usr/bin/env node

/**
 * Debug script to understand why files appear unchanged
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

async function debugFiles() {
  console.log('🔍 Debugging file differences...\n');
  
  // Load all three files
  const files = [
    { name: 'Day 1 (May 22)', path: 'downloads/Lawley May Week 3 22052025 - First Report.csv' },
    { name: 'Day 2 (May 23)', path: 'downloads/Lawley May Week 3 23052025.csv' },
    { name: 'Day 3 (May 26)', path: 'downloads/Lawley May Week 4 26052025.csv' }
  ];
  
  const datasets = [];
  
  for (const file of files) {
    const content = await fs.readFile(file.path, 'utf-8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    datasets.push({
      name: file.name,
      records: records,
      propertyIds: new Set(records.map(r => r['Property ID']))
    });
    
    console.log(`${file.name}: ${records.length} records`);
    
    // Sample first 3 records
    console.log('Sample records:');
    records.slice(0, 3).forEach((record, i) => {
      console.log(`  ${i + 1}. Property: ${record['Property ID']}, Status: ${record['Status']}, Pole: ${record['Pole Number'] || 'None'}`);
    });
    
    // Status distribution
    const statusCounts = {};
    records.forEach(record => {
      const status = record['Status'] || 'No Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Status counts:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    console.log('');
  }
  
  // Compare property IDs between files
  console.log('📊 Property ID Comparison:\n');
  
  // Day 1 to Day 2
  const newInDay2 = [...datasets[1].propertyIds].filter(id => !datasets[0].propertyIds.has(id));
  const removedInDay2 = [...datasets[0].propertyIds].filter(id => !datasets[1].propertyIds.has(id));
  
  console.log(`Day 1 → Day 2:`);
  console.log(`  New properties: ${newInDay2.length}`);
  console.log(`  Removed properties: ${removedInDay2.length}`);
  
  // Day 1 to Day 3
  const newInDay3 = [...datasets[2].propertyIds].filter(id => !datasets[0].propertyIds.has(id));
  const removedInDay3 = [...datasets[0].propertyIds].filter(id => !datasets[2].propertyIds.has(id));
  
  console.log(`\nDay 1 → Day 3:`);
  console.log(`  New properties: ${newInDay3.length}`);
  if (newInDay3.length > 0) {
    console.log('  New property IDs:', newInDay3.slice(0, 10).join(', '));
  }
  console.log(`  Removed properties: ${removedInDay3.length}`);
  
  // Check if files are identical
  console.log('\n🔎 Checking for actual changes in common properties...\n');
  
  // Compare a few records between Day 1 and Day 3
  const day1Map = new Map(datasets[0].records.map(r => [r['Property ID'], r]));
  const day3Map = new Map(datasets[2].records.map(r => [r['Property ID'], r]));
  
  let changesFound = 0;
  const sampleChanges = [];
  
  for (const [propertyId, day1Record] of day1Map) {
    const day3Record = day3Map.get(propertyId);
    if (day3Record) {
      // Compare key fields
      const fields = ['Status', 'Pole Number', 'Field Agent - Pole Permission', 'Date Status Changed'];
      let hasChange = false;
      const changes = [];
      
      for (const field of fields) {
        if (day1Record[field] !== day3Record[field]) {
          hasChange = true;
          changes.push({
            field,
            from: day1Record[field] || 'empty',
            to: day3Record[field] || 'empty'
          });
        }
      }
      
      if (hasChange) {
        changesFound++;
        if (sampleChanges.length < 5) {
          sampleChanges.push({
            propertyId,
            changes
          });
        }
      }
    }
  }
  
  console.log(`Total properties with changes: ${changesFound}`);
  
  if (sampleChanges.length > 0) {
    console.log('\nSample changes:');
    sampleChanges.forEach(({ propertyId, changes }) => {
      console.log(`\nProperty ${propertyId}:`);
      changes.forEach(({ field, from, to }) => {
        console.log(`  ${field}: "${from}" → "${to}"`);
      });
    });
  }
  
  // Check for duplicate property IDs within each file
  console.log('\n🔍 Checking for duplicate Property IDs within files...\n');
  
  for (const dataset of datasets) {
    const idCounts = {};
    dataset.records.forEach(record => {
      const id = record['Property ID'];
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    
    const duplicates = Object.entries(idCounts).filter(([, count]) => count > 1);
    console.log(`${dataset.name}: ${duplicates.length} duplicate property IDs`);
    if (duplicates.length > 0) {
      console.log('  Duplicates:', duplicates.slice(0, 5).map(([id, count]) => `${id} (${count}x)`).join(', '));
    }
  }
}

debugFiles().catch(console.error);