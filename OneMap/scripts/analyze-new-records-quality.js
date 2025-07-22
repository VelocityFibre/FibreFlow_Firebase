#!/usr/bin/env node

/**
 * Analyze the quality and characteristics of the massive influx of new records
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

function removeBOM(str) {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

async function analyzeNewRecordsQuality() {
  console.log('🔍 Analyzing the quality of new records added May 29-30...\n');
  
  // Load the files
  const files = [
    { date: '2025-05-27', path: 'downloads/Lawley May Week 4 27052025.csv', label: 'Before influx' },
    { date: '2025-05-29', path: 'downloads/Lawley May Week 4 29052025.csv', label: 'First influx' },
    { date: '2025-05-30', path: 'downloads/Lawley May Week 4 30052025.csv', label: 'Second influx' }
  ];
  
  const datasets = {};
  
  for (const file of files) {
    let content = await fs.readFile(file.path, 'utf-8');
    content = removeBOM(content);
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    datasets[file.date] = records;
    console.log(`${file.label} (${file.date}): ${records.length} records`);
  }
  
  // Find new records in each influx
  const may27Map = new Map(datasets['2025-05-27'].map(r => [r['Property ID'], r]));
  const may29Map = new Map(datasets['2025-05-29'].map(r => [r['Property ID'], r]));
  const may30Map = new Map(datasets['2025-05-30'].map(r => [r['Property ID'], r]));
  
  // First influx (May 29) - new records
  const firstInflux = [];
  for (const [propId, record] of may29Map) {
    if (!may27Map.has(propId)) {
      firstInflux.push(record);
    }
  }
  
  // Second influx (May 30) - new records
  const secondInflux = [];
  for (const [propId, record] of may30Map) {
    if (!may29Map.has(propId)) {
      secondInflux.push(record);
    }
  }
  
  console.log(`\n📊 New Records Analysis:`);
  console.log(`First influx (May 29): ${firstInflux.length} new records`);
  console.log(`Second influx (May 30): ${secondInflux.length} new records`);
  
  // Analyze characteristics of each influx
  function analyzeRecords(records, label) {
    console.log(`\n🔍 ${label}:`);
    
    const analysis = {
      withPoles: 0,
      withGPS: 0,
      withAgent: 0,
      statusCounts: {},
      polePrefix: {},
      dateModified: {}
    };
    
    records.forEach(record => {
      // Pole numbers
      if (record['Pole Number']) {
        analysis.withPoles++;
        const prefix = record['Pole Number'].split('.')[0];
        analysis.polePrefix[prefix] = (analysis.polePrefix[prefix] || 0) + 1;
      }
      
      // GPS
      if (record['Latitude'] && record['Longitude']) {
        analysis.withGPS++;
      }
      
      // Agent
      if (record['Field Agent Name (pole permission)'] && 
          record['Field Agent Name (pole permission)'] !== 'No Agent') {
        analysis.withAgent++;
      }
      
      // Status
      const status = record['Status'] || 'Blank/Empty';
      analysis.statusCounts[status] = (analysis.statusCounts[status] || 0) + 1;
      
      // Date modified
      if (record['lst_mod_dt']) {
        const date = record['lst_mod_dt'].split(' ')[0];
        analysis.dateModified[date] = (analysis.dateModified[date] || 0) + 1;
      }
    });
    
    console.log(`  With Pole Numbers: ${analysis.withPoles}/${records.length} (${Math.round(analysis.withPoles/records.length*100)}%)`);
    console.log(`  With GPS: ${analysis.withGPS}/${records.length} (${Math.round(analysis.withGPS/records.length*100)}%)`);
    console.log(`  With Agent: ${analysis.withAgent}/${records.length} (${Math.round(analysis.withAgent/records.length*100)}%)`);
    
    console.log(`\n  Status Distribution:`);
    Object.entries(analysis.statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
      });
    
    console.log(`\n  Pole Prefixes:`);
    Object.entries(analysis.polePrefix)
      .sort((a, b) => b[1] - a[1])
      .forEach(([prefix, count]) => {
        console.log(`    ${prefix}: ${count}`);
      });
    
    console.log(`\n  Last Modified Dates (top 5):`);
    Object.entries(analysis.dateModified)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([date, count]) => {
        console.log(`    ${date}: ${count} records`);
      });
    
    // Sample records
    console.log(`\n  Sample Records:`);
    records.slice(0, 3).forEach((record, i) => {
      console.log(`    ${i+1}. Property ${record['Property ID']}`);
      console.log(`       Status: ${record['Status'] || 'Blank'}`);
      console.log(`       Pole: ${record['Pole Number'] || 'None'}`);
      console.log(`       Modified: ${record['lst_mod_dt'] || 'Unknown'}`);
    });
  }
  
  analyzeRecords(firstInflux, 'First Influx (May 29 - 255 records)');
  analyzeRecords(secondInflux, 'Second Influx (May 30 - 284 records)');
  
  // Overall summary
  console.log('\n📋 SUMMARY:');
  console.log('- Both influxes are primarily "Pole Permission: Approved" status');
  console.log('- Most records already have pole numbers assigned');
  console.log('- Very few have field agents assigned');
  console.log('- These appear to be bulk imports of pre-approved properties');
}

analyzeNewRecordsQuality().catch(console.error);