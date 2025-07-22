#!/usr/bin/env node

/**
 * Compare and combine CSVs locally BEFORE Firebase import
 * Much faster and more efficient!
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

async function parseCSV(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return csv.parse(content.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
}

async function compareCSVs() {
  console.log('🔍 Comparing June 3 vs June 5 CSVs Locally\n');
  
  // Parse both files
  console.log('Reading CSV files...');
  const june3Records = await parseCSV('downloads/Lawley Raw Stats/Lawley June Week 1 03062025.csv');
  const june5Records = await parseCSV('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv');
  
  console.log(`June 3: ${june3Records.length} records`);
  console.log(`June 5: ${june5Records.length} records\n`);
  
  // Create maps by Property ID for fast lookup
  const june3Map = new Map();
  const june5Map = new Map();
  
  june3Records.forEach(record => {
    june3Map.set(record['Property ID'], record);
  });
  
  june5Records.forEach(record => {
    june5Map.set(record['Property ID'], record);
  });
  
  // Analyze differences
  const newInJune5 = [];
  const changedRecords = [];
  const unchangedRecords = [];
  const missingInJune5 = [];
  
  // Check what's new or changed in June 5
  june5Map.forEach((record, propertyId) => {
    if (!june3Map.has(propertyId)) {
      newInJune5.push(record);
    } else {
      const june3Record = june3Map.get(propertyId);
      // Compare key fields
      if (june3Record['Status'] !== record['Status'] ||
          june3Record['Flow Name Groups'] !== record['Flow Name Groups'] ||
          june3Record['Pole Number'] !== record['Pole Number']) {
        changedRecords.push({
          property_id: propertyId,
          june3: june3Record,
          june5: record,
          changes: {
            status: june3Record['Status'] !== record['Status'] ? 
              `${june3Record['Status']} → ${record['Status']}` : null,
            pole: june3Record['Pole Number'] !== record['Pole Number'] ? 
              `${june3Record['Pole Number']} → ${record['Pole Number']}` : null,
            workflow: june3Record['Flow Name Groups'] !== record['Flow Name Groups']
          }
        });
      } else {
        unchangedRecords.push(propertyId);
      }
    }
  });
  
  // Check what's missing in June 5
  june3Map.forEach((record, propertyId) => {
    if (!june5Map.has(propertyId)) {
      missingInJune5.push(record);
    }
  });
  
  // Generate summary
  console.log('📊 Comparison Results:');
  console.log(`- New in June 5: ${newInJune5.length}`);
  console.log(`- Changed: ${changedRecords.length}`);
  console.log(`- Unchanged: ${unchangedRecords.length}`);
  console.log(`- Missing in June 5: ${missingInJune5.length}\n`);
  
  // Save results to files for easy review
  console.log('💾 Saving analysis files...');
  
  // 1. New records only
  if (newInJune5.length > 0) {
    const newRecordsCSV = [
      Object.keys(newInJune5[0]).join(';'),
      ...newInJune5.map(r => Object.values(r).join(';'))
    ].join('\n');
    await fs.writeFile('reports/june5_new_records.csv', newRecordsCSV);
    console.log(`✅ Saved ${newInJune5.length} new records to june5_new_records.csv`);
  }
  
  // 2. Changed records summary
  if (changedRecords.length > 0) {
    const changesReport = changedRecords.map(c => ({
      'Property ID': c.property_id,
      'Old Status': c.june3.Status,
      'New Status': c.june5.Status,
      'Status Changed': c.changes.status || 'No',
      'Pole Changed': c.changes.pole || 'No',
      'Workflow Changed': c.changes.workflow ? 'Yes' : 'No',
      'Location': c.june5['Location Address']
    }));
    
    const changesCSV = [
      Object.keys(changesReport[0]).join(';'),
      ...changesReport.map(r => Object.values(r).join(';'))
    ].join('\n');
    
    await fs.writeFile('reports/june3_to_june5_changes.csv', changesCSV);
    console.log(`✅ Saved ${changedRecords.length} changed records summary`);
  }
  
  // 3. Combined unique records (for clean import)
  const combinedMap = new Map();
  
  // Start with all June 5 records (latest data)
  june5Map.forEach((record, propertyId) => {
    combinedMap.set(propertyId, {
      ...record,
      _source: 'June 5',
      _status: newInJune5.find(r => r['Property ID'] === propertyId) ? 'new' : 
               changedRecords.find(r => r.property_id === propertyId) ? 'changed' : 'unchanged'
    });
  });
  
  // Add June 3 records that are missing in June 5
  missingInJune5.forEach(record => {
    combinedMap.set(record['Property ID'], {
      ...record,
      _source: 'June 3 only',
      _status: 'missing_in_june5'
    });
  });
  
  console.log(`\n📊 Combined Dataset:`);
  console.log(`Total unique Property IDs: ${combinedMap.size}`);
  
  // Save combined data
  const combinedRecords = Array.from(combinedMap.values());
  const combinedCSV = [
    Object.keys(combinedRecords[0]).join(';'),
    ...combinedRecords.map(r => Object.values(r).join(';'))
  ].join('\n');
  
  await fs.writeFile('reports/combined_june3_june5.csv', combinedCSV);
  console.log(`✅ Saved combined dataset with ${combinedMap.size} unique records`);
  
  // Generate detailed report
  const report = `
# CSV Comparison Report - June 3 vs June 5

## Summary
- June 3 unique records: ${june3Map.size}
- June 5 unique records: ${june5Map.size}
- Combined unique records: ${combinedMap.size}

## Changes
- New in June 5: ${newInJune5.length}
- Changed between dates: ${changedRecords.length}
- Unchanged: ${unchangedRecords.length}
- Missing in June 5: ${missingInJune5.length}

## Files Generated
1. **june5_new_records.csv** - Only new records to import
2. **june3_to_june5_changes.csv** - Summary of what changed
3. **combined_june3_june5.csv** - All unique records with metadata

## Recommended Import Strategy
1. Import combined_june3_june5.csv once (all unique records)
2. Use _source and _status fields to track origin
3. No need to compare with database during import!

## Benefits of This Approach
✅ All comparison done locally (fast!)
✅ No database queries during comparison
✅ Single clean import to Firebase
✅ Preserves full history in CSV metadata
✅ Can review changes before importing

Generated: ${new Date().toISOString()}
`;
  
  console.log(report);
  await fs.writeFile('reports/csv_comparison_report.md', report);
  
  return {
    combined: combinedMap.size,
    new: newInJune5.length,
    changed: changedRecords.length,
    missing: missingInJune5.length
  };
}

compareCSVs().catch(console.error);