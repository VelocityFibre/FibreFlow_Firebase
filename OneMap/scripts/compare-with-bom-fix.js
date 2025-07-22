#!/usr/bin/env node

/**
 * Compare files with BOM (Byte Order Mark) handling
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

// Function to remove BOM from string
function removeBOM(str) {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

async function analyzeWithBOMFix() {
  console.log('🚀 Starting analysis with BOM fix...\n');
  
  const files = [
    { name: 'Day 1 (May 22)', path: 'downloads/Lawley May Week 3 22052025 - First Report.csv' },
    { name: 'Day 3 (May 26)', path: 'downloads/Lawley May Week 4 26052025.csv' }
  ];
  
  const datasets = [];
  
  // Load and parse files with BOM handling
  for (const file of files) {
    let content = await fs.readFile(file.path, 'utf-8');
    content = removeBOM(content); // Remove BOM if present
    
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`${file.name}: ${records.length} records loaded`);
    
    // Verify Property ID is now accessible
    const sampleRecord = records[0];
    console.log(`Sample Property ID: ${sampleRecord['Property ID']}`);
    console.log(`Sample Status: ${sampleRecord['Status']}`);
    console.log(`Sample Pole: ${sampleRecord['Pole Number']}\n`);
    
    datasets.push({
      name: file.name,
      records: records
    });
  }
  
  // Now analyze changes properly
  const day1Map = new Map(datasets[0].records.map(r => [r['Property ID'], r]));
  const day3Map = new Map(datasets[1].records.map(r => [r['Property ID'], r]));
  
  const changes = {
    newProperties: [],
    statusChanges: [],
    poleAssignments: [],
    missingResolved: [],
    completions: []
  };
  
  let totalChanges = 0;
  
  // Analyze each record in Day 3
  for (const [propertyId, day3Record] of day3Map) {
    const day1Record = day1Map.get(propertyId);
    
    if (!day1Record) {
      // New property
      changes.newProperties.push({
        propertyId,
        status: day3Record['Status'],
        poleNumber: day3Record['Pole Number']
      });
    } else {
      // Check for changes
      if (day1Record['Status'] !== day3Record['Status']) {
        totalChanges++;
        changes.statusChanges.push({
          propertyId,
          from: day1Record['Status'],
          to: day3Record['Status']
        });
        
        // Special cases
        if (day1Record['Status'] === 'Missing' && day3Record['Status'] !== 'Missing') {
          changes.missingResolved.push({
            propertyId,
            newStatus: day3Record['Status'],
            poleNumber: day3Record['Pole Number']
          });
        }
        
        if (day3Record['Status']?.includes('Installed')) {
          changes.completions.push({
            propertyId,
            status: day3Record['Status']
          });
        }
      }
      
      // Check pole assignments
      if (!day1Record['Pole Number'] && day3Record['Pole Number']) {
        changes.poleAssignments.push({
          propertyId,
          poleNumber: day3Record['Pole Number']
        });
      }
    }
  }
  
  // Generate report
  console.log('📊 CHANGE ANALYSIS RESULTS (May 22 → May 26)');
  console.log('==========================================\n');
  
  console.log(`Total records Day 1: ${datasets[0].records.length}`);
  console.log(`Total records Day 3: ${datasets[1].records.length}`);
  console.log(`Difference: +${datasets[1].records.length - datasets[0].records.length}\n`);
  
  console.log(`📈 Changes Found:`);
  console.log(`- New Properties: ${changes.newProperties.length}`);
  console.log(`- Status Changes: ${changes.statusChanges.length}`);
  console.log(`- Missing → Active: ${changes.missingResolved.length}`);
  console.log(`- New Pole Assignments: ${changes.poleAssignments.length}`);
  console.log(`- Completions: ${changes.completions.length}`);
  
  // Show samples
  if (changes.statusChanges.length > 0) {
    console.log('\n📋 Sample Status Changes:');
    changes.statusChanges.slice(0, 5).forEach(change => {
      console.log(`  Property ${change.propertyId}: ${change.from} → ${change.to}`);
    });
  }
  
  if (changes.missingResolved.length > 0) {
    console.log('\n✅ Missing Status Resolved:');
    changes.missingResolved.slice(0, 5).forEach(res => {
      console.log(`  Property ${res.propertyId}: Missing → ${res.newStatus} (Pole: ${res.poleNumber})`);
    });
  }
  
  if (changes.poleAssignments.length > 0) {
    console.log('\n🏗️ New Pole Assignments:');
    changes.poleAssignments.slice(0, 5).forEach(pole => {
      console.log(`  Property ${pole.propertyId}: ${pole.poleNumber}`);
    });
  }
  
  // Save detailed report
  const reportContent = {
    analysisDate: new Date().toISOString(),
    period: 'May 22 to May 26, 2025',
    summary: {
      day1Total: datasets[0].records.length,
      day3Total: datasets[1].records.length,
      newProperties: changes.newProperties.length,
      statusChanges: changes.statusChanges.length,
      missingResolved: changes.missingResolved.length,
      poleAssignments: changes.poleAssignments.length,
      completions: changes.completions.length
    },
    changes: changes
  };
  
  await fs.writeFile(
    'reports/fixed-change-analysis.json',
    JSON.stringify(reportContent, null, 2)
  );
  
  console.log('\n✅ Detailed report saved to: reports/fixed-change-analysis.json');
}

analyzeWithBOMFix().catch(console.error);