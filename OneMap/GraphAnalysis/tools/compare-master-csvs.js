#!/usr/bin/env node

/**
 * Compare Original vs Validated Master CSVs
 * Shows what records were removed/changed by validation
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream } = require('fs');

async function loadCSV(filePath) {
  const records = new Map();
  let headers = null;
  
  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv.parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (record) => {
        const propertyId = record['Property ID'] || record['property_id'] || Object.values(record)[0];
        if (propertyId) {
          records.set(propertyId.toString(), record);
        }
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function compareMasterCSVs() {
  const masterDir = path.join(__dirname, '../data/master');
  
  // Find the files
  const originalPath = path.join(masterDir, 'master_csv_latest.csv');
  const validatedPath = path.join(masterDir, 'master_csv_latest_validated.csv');
  
  console.log('📊 Comparing Master CSV Files\n');
  console.log('Original:', originalPath);
  console.log('Validated:', validatedPath);
  console.log('\nLoading files...\n');
  
  try {
    const original = await loadCSV(originalPath);
    const validated = await loadCSV(validatedPath);
    
    console.log('📈 Summary:');
    console.log(`  - Original records: ${original.size}`);
    console.log(`  - Validated records: ${validated.size}`);
    console.log(`  - Difference: ${original.size - validated.size} records\n`);
    
    // Find removed records
    const removed = [];
    for (const [propertyId, record] of original) {
      if (!validated.has(propertyId)) {
        removed.push({ propertyId, record });
      }
    }
    
    if (removed.length > 0) {
      console.log(`🚫 Removed Records (${removed.length}):\n`);
      
      // Group by last update date
      const byDate = {};
      removed.forEach(({ propertyId, record }) => {
        const date = record._last_updated_date || 'Unknown';
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(propertyId);
      });
      
      Object.entries(byDate).forEach(([date, ids]) => {
        console.log(`  ${date}: ${ids.length} records`);
        if (ids.length <= 10) {
          ids.forEach(id => console.log(`    - ${id}`));
        } else {
          ids.slice(0, 5).forEach(id => console.log(`    - ${id}`));
          console.log(`    ... and ${ids.length - 5} more`);
        }
      });
    }
    
    // Find records with different field counts (possible corruption)
    console.log('\n🔍 Checking for field corruption patterns...\n');
    
    let corruptionPatterns = {
      poleWithDate: 0,
      addressWithGPS: 0,
      longText: 0,
      shifted: 0
    };
    
    for (const [propertyId, record] of validated) {
      const original = original.get(propertyId);
      if (!original) continue;
      
      // Check for corruption patterns
      if (record['Pole Number'] && record['Pole Number'].includes('/')) {
        corruptionPatterns.poleWithDate++;
      }
      if (record['Location Address'] && record['Location Address'].includes('[')) {
        corruptionPatterns.addressWithGPS++;
      }
      if (Object.values(record).some(v => v && v.length > 500)) {
        corruptionPatterns.longText++;
      }
    }
    
    console.log('⚠️  Potential Issues Found:');
    console.log(`  - Pole numbers with dates: ${corruptionPatterns.poleWithDate}`);
    console.log(`  - Addresses with GPS coords: ${corruptionPatterns.addressWithGPS}`);
    console.log(`  - Fields with very long text: ${corruptionPatterns.longText}`);
    
    // Save detailed comparison report
    const reportPath = path.join(__dirname, '../reports/master-csv-comparison.md');
    let report = '# Master CSV Comparison Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += '## Summary\n\n';
    report += `- Original CSV: ${original.size} records\n`;
    report += `- Validated CSV: ${validated.size} records\n`;
    report += `- Records removed: ${removed.length}\n\n`;
    
    if (removed.length > 0) {
      report += '## Removed Records by Date\n\n';
      Object.entries(byDate).forEach(([date, ids]) => {
        report += `### ${date} (${ids.length} records)\n\n`;
        ids.forEach(id => {
          const record = original.get(id);
          report += `- **${id}**: ${record['Location Address'] || 'No address'}\n`;
        });
        report += '\n';
      });
    }
    
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ENOENT') {
      console.log('\nMake sure you have run both:');
      console.log('1. ./CREATE_MASTER_CSV.sh (original)');
      console.log('2. ./CREATE_MASTER_CSV_VALIDATED.sh (with validation)');
    }
  }
}

compareMasterCSVs();