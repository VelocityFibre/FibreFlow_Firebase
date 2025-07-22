#!/usr/bin/env node

/**
 * Test sync with just first 10 records
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

async function testSmallSync() {
  try {
    // Read CSV
    const content = await fs.readFile('OneMap/downloads/Lawley May Week 3 22052025 - First Report.csv', 'utf-8');
    
    // Parse with proper delimiter
    const allRecords = csv.parse(content, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`Total records in CSV: ${allRecords.length}`);
    
    // Take first 10 records
    const testRecords = allRecords.slice(0, 10);
    
    // Create temporary test file
    const header = Object.keys(testRecords[0]).join(';');
    const rows = testRecords.map(r => Object.values(r).join(';'));
    const testContent = [header, ...rows].join('\n');
    
    await fs.writeFile('OneMap/downloads/test-10-records.csv', testContent);
    
    console.log('Created test file with 10 records');
    console.log('Run: node OneMap/process-1map-sync.js OneMap/downloads/test-10-records.csv');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSmallSync();