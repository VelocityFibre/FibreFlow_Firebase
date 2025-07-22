const fs = require('fs').promises;
const csv = require('csv-parse/sync');

async function analyzeSkippedRecords() {
  console.log('🔍 Analyzing why records were skipped...\n');
  
  try {
    // Read the CSV file
    const fileContent = await fs.readFile('OneMap/downloads/Lawley May Week 3 22052025 - First Report.csv', 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`Total records in CSV: ${records.length}`);
    
    // Analyze property IDs
    const propertyIds = new Set();
    const duplicatePropertyIds = new Set();
    let emptyPropertyIds = 0;
    
    records.forEach(record => {
      const propertyId = record['Property ID'] || record['﻿Property ID'] || '';
      
      if (!propertyId || propertyId.trim() === '') {
        emptyPropertyIds++;
      } else if (propertyIds.has(propertyId)) {
        duplicatePropertyIds.add(propertyId);
      } else {
        propertyIds.add(propertyId);
      }
    });
    
    console.log(`\n📊 Property ID Analysis:`);
    console.log(`- Unique Property IDs: ${propertyIds.size}`);
    console.log(`- Empty Property IDs: ${emptyPropertyIds}`);
    console.log(`- Duplicate Property IDs: ${duplicatePropertyIds.size}`);
    
    // Calculate expected imports
    const expectedImports = propertyIds.size; // Only unique property IDs can be imported
    console.log(`\n🎯 Expected imports: ${expectedImports} (using PROP_{propertyId} as doc ID)`);
    console.log(`❌ Skipped: ${records.length - expectedImports} records`);
    
    // Show some duplicate examples
    if (duplicatePropertyIds.size > 0) {
      console.log(`\n📋 Sample duplicate Property IDs:`);
      const sampleDupes = Array.from(duplicatePropertyIds).slice(0, 10);
      
      for (const propId of sampleDupes) {
        const dupeCount = records.filter(r => 
          (r['Property ID'] || r['﻿Property ID']) === propId
        ).length;
        console.log(`- Property ${propId}: appears ${dupeCount} times`);
      }
    }
    
    // Analyze records by status
    const statusCounts = {};
    records.forEach(record => {
      const status = record['Status'] || 'No Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log(`\n📊 Records by Status:`);
    Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`- ${status}: ${count}`);
      });
    
    // Check if existing doc logic affected imports
    console.log(`\n💡 Import Logic Analysis:`);
    console.log(`The script uses doc ID: PROP_{propertyId}`);
    console.log(`This means:`);
    console.log(`- First occurrence of each Property ID → Imported`);
    console.log(`- Subsequent occurrences → Marked as "unchanged" (not new)`);
    console.log(`\nActual staging count should be close to: ${expectedImports}`);
    
  } catch (error) {
    console.error('Error analyzing:', error);
  }
}

analyzeSkippedRecords();