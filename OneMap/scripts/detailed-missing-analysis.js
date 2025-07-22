#!/usr/bin/env node

/**
 * Detailed analysis of "Missing" status changes
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

function removeBOM(str) {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

async function analyzeMissingStatus() {
  console.log('🔍 Analyzing "Missing" status changes in detail...\n');
  
  // Load Day 1 file
  let content1 = await fs.readFile('downloads/Lawley May Week 3 22052025 - First Report.csv', 'utf-8');
  content1 = removeBOM(content1);
  const day1Records = csv.parse(content1, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
    relax_quotes: true,
    relax_column_count: true
  });
  
  // Load Day 3 file
  let content3 = await fs.readFile('downloads/Lawley May Week 4 26052025.csv', 'utf-8');
  content3 = removeBOM(content3);
  const day3Records = csv.parse(content3, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
    relax_quotes: true,
    relax_column_count: true
  });
  
  // Create maps
  const day1Map = new Map(day1Records.map(r => [r['Property ID'], r]));
  const day3Map = new Map(day3Records.map(r => [r['Property ID'], r]));
  
  // Find all "Missing" records from Day 1
  const missingRecords = [];
  for (const [propertyId, record] of day1Map) {
    if (record['Status'] === 'Missing') {
      missingRecords.push({
        propertyId,
        day1: record,
        day3: day3Map.get(propertyId)
      });
    }
  }
  
  console.log(`Found ${missingRecords.length} records with "Missing" status on Day 1\n`);
  
  // Analyze what happened to them
  const outcomes = {
    stillMissing: 0,
    becameBlank: 0,
    gotNewStatus: 0,
    notFoundInDay3: 0,
    gotPoleNumber: 0
  };
  
  const samples = {
    becameBlank: [],
    gotNewStatus: [],
    gotPoleNumber: []
  };
  
  missingRecords.forEach(({ propertyId, day1, day3 }) => {
    if (!day3) {
      outcomes.notFoundInDay3++;
    } else {
      if (day3['Status'] === 'Missing') {
        outcomes.stillMissing++;
      } else if (!day3['Status'] || day3['Status'].trim() === '') {
        outcomes.becameBlank++;
        if (samples.becameBlank.length < 5) {
          samples.becameBlank.push({
            propertyId,
            address: day3['Location Address'],
            pole: day3['Pole Number']
          });
        }
      } else {
        outcomes.gotNewStatus++;
        if (samples.gotNewStatus.length < 5) {
          samples.gotNewStatus.push({
            propertyId,
            newStatus: day3['Status'],
            address: day3['Location Address']
          });
        }
      }
      
      if (day3['Pole Number'] && !day1['Pole Number']) {
        outcomes.gotPoleNumber++;
        if (samples.gotPoleNumber.length < 5) {
          samples.gotPoleNumber.push({
            propertyId,
            poleNumber: day3['Pole Number'],
            status: day3['Status']
          });
        }
      }
    }
  });
  
  // Display results
  console.log('📊 What happened to "Missing" status records:');
  console.log(`- Still Missing: ${outcomes.stillMissing}`);
  console.log(`- Became Blank/Empty: ${outcomes.becameBlank}`);
  console.log(`- Got New Status: ${outcomes.gotNewStatus}`);
  console.log(`- Not found in Day 3: ${outcomes.notFoundInDay3}`);
  console.log(`- Got Pole Numbers: ${outcomes.gotPoleNumber}`);
  
  if (samples.becameBlank.length > 0) {
    console.log('\n📋 Sample records that became blank:');
    samples.becameBlank.forEach(s => {
      console.log(`  Property ${s.propertyId}: ${s.address.substring(0, 50)}...`);
      console.log(`    Pole: ${s.pole || 'Still no pole'}`);
    });
  }
  
  if (samples.gotNewStatus.length > 0) {
    console.log('\n✅ Sample records with new status:');
    samples.gotNewStatus.forEach(s => {
      console.log(`  Property ${s.propertyId}: ${s.newStatus}`);
    });
  }
  
  // Status distribution analysis
  console.log('\n📊 Overall Status Distribution:');
  const statusCounts = { day1: {}, day3: {} };
  
  day1Records.forEach(r => {
    const status = r['Status'] || 'Blank/Empty';
    statusCounts.day1[status] = (statusCounts.day1[status] || 0) + 1;
  });
  
  day3Records.forEach(r => {
    const status = r['Status'] || 'Blank/Empty';
    statusCounts.day3[status] = (statusCounts.day3[status] || 0) + 1;
  });
  
  console.log('\nDay 1 Status Counts:');
  Object.entries(statusCounts.day1)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  console.log('\nDay 3 Status Counts:');
  Object.entries(statusCounts.day3)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
}

analyzeMissingStatus().catch(console.error);