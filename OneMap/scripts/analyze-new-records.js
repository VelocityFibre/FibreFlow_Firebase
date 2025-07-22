#!/usr/bin/env node

/**
 * Detailed analysis of the 6 new records added between Day 1 and Day 3
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

function removeBOM(str) {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

async function analyzeNewRecords() {
  console.log('🔍 Analyzing the 6 new records added between May 22 and May 26...\n');
  
  // Load both files
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
  
  console.log(`Day 1 total: ${day1Records.length} records`);
  console.log(`Day 3 total: ${day3Records.length} records`);
  console.log(`Difference: +${day3Records.length - day1Records.length} records\n`);
  
  // Create sets of Property IDs
  const day1Ids = new Set(day1Records.map(r => r['Property ID']));
  const day3Ids = new Set(day3Records.map(r => r['Property ID']));
  
  // Find new Property IDs
  const newIds = [];
  for (const id of day3Ids) {
    if (!day1Ids.has(id)) {
      newIds.push(id);
    }
  }
  
  // Also check for removed IDs
  const removedIds = [];
  for (const id of day1Ids) {
    if (!day3Ids.has(id)) {
      removedIds.push(id);
    }
  }
  
  console.log(`📊 Property ID Analysis:`);
  console.log(`- New Property IDs in Day 3: ${newIds.length}`);
  console.log(`- Property IDs removed from Day 1: ${removedIds.length}`);
  console.log(`- Net change: +${newIds.length - removedIds.length}\n`);
  
  // Get details of new records
  if (newIds.length > 0) {
    console.log('🆕 NEW RECORDS ADDED:');
    console.log('===================\n');
    
    const day3Map = new Map(day3Records.map(r => [r['Property ID'], r]));
    
    newIds.forEach((id, index) => {
      const record = day3Map.get(id);
      console.log(`${index + 1}. Property ID: ${id}`);
      console.log(`   Status: ${record['Status'] || 'Blank'}`);
      console.log(`   Address: ${record['Location Address']}`);
      console.log(`   Pole Number: ${record['Pole Number'] || 'None'}`);
      console.log(`   Field Agent: ${record['Field Agent Name (pole permission)'] || 'None'}`);
      console.log(`   Date Modified: ${record['lst_mod_dt'] || 'Unknown'}`);
      console.log(`   GPS: ${record['Latitude'] || 'No Lat'}, ${record['Longitude'] || 'No Lng'}`);
      console.log('');
    });
  }
  
  // Check if removed records exist
  if (removedIds.length > 0) {
    console.log('❌ RECORDS REMOVED:');
    console.log('==================\n');
    
    const day1Map = new Map(day1Records.map(r => [r['Property ID'], r]));
    
    removedIds.slice(0, 5).forEach((id, index) => {
      const record = day1Map.get(id);
      console.log(`${index + 1}. Property ID: ${id}`);
      console.log(`   Status: ${record['Status'] || 'Blank'}`);
      console.log(`   Address: ${record['Location Address']}`);
      console.log('');
    });
    
    if (removedIds.length > 5) {
      console.log(`... and ${removedIds.length - 5} more removed records\n`);
    }
  }
  
  // Analyze patterns in new records
  if (newIds.length > 0) {
    console.log('📊 PATTERN ANALYSIS OF NEW RECORDS:');
    console.log('==================================\n');
    
    const statusCounts = {};
    const agentCounts = {};
    let withPoles = 0;
    let withGPS = 0;
    
    const day3Map = new Map(day3Records.map(r => [r['Property ID'], r]));
    
    newIds.forEach(id => {
      const record = day3Map.get(id);
      
      // Count statuses
      const status = record['Status'] || 'Blank';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Count agents
      const agent = record['Field Agent Name (pole permission)'] || 'None';
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
      
      // Count poles
      if (record['Pole Number']) withPoles++;
      
      // Count GPS
      if (record['Latitude'] && record['Longitude']) withGPS++;
    });
    
    console.log('Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\nField Agent Distribution:');
    Object.entries(agentCounts).forEach(([agent, count]) => {
      console.log(`  ${agent}: ${count}`);
    });
    
    console.log('\nData Completeness:');
    console.log(`  With Pole Numbers: ${withPoles}/${newIds.length}`);
    console.log(`  With GPS Coordinates: ${withGPS}/${newIds.length}`);
  }
  
  // Check for duplicate Property IDs
  console.log('\n🔍 Checking for duplicate Property IDs...\n');
  
  const day3IdCounts = {};
  day3Records.forEach(r => {
    const id = r['Property ID'];
    day3IdCounts[id] = (day3IdCounts[id] || 0) + 1;
  });
  
  const duplicates = Object.entries(day3IdCounts).filter(([id, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate Property IDs:`);
    duplicates.forEach(([id, count]) => {
      console.log(`  ${id}: appears ${count} times`);
    });
  } else {
    console.log('No duplicate Property IDs found.');
  }
}

analyzeNewRecords().catch(console.error);