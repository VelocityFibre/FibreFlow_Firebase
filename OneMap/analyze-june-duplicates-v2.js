const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// File paths
const june3File = '/home/ldp/VF/Apps/FibreFlow/OneMap/downloads/Lawley Raw Stats/Lawley June Week 1 03062025.csv';
const june5File = '/home/ldp/VF/Apps/FibreFlow/OneMap/downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv';

// Data structures
const june3Data = [];
const june5Data = [];

// Helper function to read CSV
async function readCSV(filePath, dataArray) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))  // Use semicolon as delimiter
      .on('data', (row) => {
        dataArray.push(row);
      })
      .on('end', () => {
        resolve();
      })
      .on('error', reject);
  });
}

// Helper function to find duplicates in an array
function findDuplicates(arr, key) {
  const seen = new Map();
  const duplicates = [];
  
  arr.forEach((item, index) => {
    const value = item[key];
    if (value) {
      if (seen.has(value)) {
        // Add both the first occurrence and current occurrence to duplicates
        if (!duplicates.find(d => d.value === value)) {
          duplicates.push({
            value: value,
            occurrences: [seen.get(value), item],
            indices: [seen.get(value).index, index]
          });
        } else {
          // Add to existing duplicate entry
          const dupEntry = duplicates.find(d => d.value === value);
          dupEntry.occurrences.push(item);
          dupEntry.indices.push(index);
        }
      } else {
        seen.set(value, { ...item, index });
      }
    }
  });
  
  return duplicates;
}

// Helper to get the Property ID key (handles BOM)
function getPropertyIdKey(data) {
  if (!data || data.length === 0) return 'Property ID';
  return Object.keys(data[0]).find(key => key.includes('Property ID')) || 'Property ID';
}

// Main analysis function
async function analyzeFiles() {
  console.log('=== CSV Duplicate Analysis Report ===\n');
  
  // Read both CSV files
  console.log('Reading CSV files...');
  await readCSV(june3File, june3Data);
  await readCSV(june5File, june5Data);
  
  // Get the actual property ID key (handles BOM)
  const propertyIdKey = getPropertyIdKey(june3Data);
  console.log(`Using Property ID key: "${propertyIdKey}"`);
  
  console.log('\n=== 1. JUNE 3RD CSV ANALYSIS ===');
  console.log(`Total rows: ${june3Data.length}`);
  
  // Get unique Property IDs for June 3
  const june3PropertyIds = june3Data.map(row => row[propertyIdKey]).filter(id => id);
  const uniqueJune3PropertyIds = new Set(june3PropertyIds);
  console.log(`Unique Property IDs: ${uniqueJune3PropertyIds.size}`);
  console.log(`Duplicate Property IDs: ${june3PropertyIds.length - uniqueJune3PropertyIds.size}`);
  
  // Find duplicate Property IDs in June 3
  const june3PropDuplicates = findDuplicates(june3Data, propertyIdKey);
  if (june3PropDuplicates.length > 0) {
    console.log('\nDuplicate Property IDs found:');
    june3PropDuplicates.slice(0, 5).forEach(dup => {
      console.log(`\n  Property ID: ${dup.value} (appears ${dup.occurrences.length} times)`);
      dup.occurrences.forEach((occ, idx) => {
        console.log(`    ${idx + 1}. Row ${dup.indices[idx] + 2}: ${occ['Location Address'] || 'No address'}, Pole: ${occ['Pole Number'] || 'No pole'}`);
      });
    });
    if (june3PropDuplicates.length > 5) {
      console.log(`  ... and ${june3PropDuplicates.length - 5} more duplicate Property IDs`);
    }
  } else {
    console.log('\nNo duplicate Property IDs found in June 3rd file');
  }
  
  console.log('\n=== 2. JUNE 5TH CSV ANALYSIS ===');
  console.log(`Total rows: ${june5Data.length}`);
  
  // Get unique Property IDs for June 5
  const june5PropertyIds = june5Data.map(row => row[propertyIdKey]).filter(id => id);
  const uniqueJune5PropertyIds = new Set(june5PropertyIds);
  console.log(`Unique Property IDs: ${uniqueJune5PropertyIds.size}`);
  console.log(`Duplicate Property IDs: ${june5PropertyIds.length - uniqueJune5PropertyIds.size}`);
  
  // Find duplicate Property IDs in June 5
  const june5PropDuplicates = findDuplicates(june5Data, propertyIdKey);
  if (june5PropDuplicates.length > 0) {
    console.log('\nDuplicate Property IDs found:');
    june5PropDuplicates.slice(0, 5).forEach(dup => {
      console.log(`\n  Property ID: ${dup.value} (appears ${dup.occurrences.length} times)`);
      dup.occurrences.forEach((occ, idx) => {
        console.log(`    ${idx + 1}. Row ${dup.indices[idx] + 2}: ${occ['Location Address'] || 'No address'}, Pole: ${occ['Pole Number'] || 'No pole'}`);
      });
    });
    if (june5PropDuplicates.length > 5) {
      console.log(`  ... and ${june5PropDuplicates.length - 5} more duplicate Property IDs`);
    }
  } else {
    console.log('\nNo duplicate Property IDs found in June 5th file');
  }
  
  console.log('\n=== 3. PROPERTY ID OVERLAP BETWEEN FILES ===');
  
  // Find overlapping Property IDs
  const overlappingIds = [];
  uniqueJune3PropertyIds.forEach(id => {
    if (uniqueJune5PropertyIds.has(id)) {
      overlappingIds.push(id);
    }
  });
  
  console.log(`Property IDs appearing in BOTH files: ${overlappingIds.length}`);
  
  if (overlappingIds.length > 0) {
    console.log('\nExamples of overlapping Property IDs:');
    overlappingIds.slice(0, 10).forEach(id => {
      const june3Record = june3Data.find(row => row[propertyIdKey] === id);
      const june5Record = june5Data.find(row => row[propertyIdKey] === id);
      console.log(`\n  Property ID: ${id}`);
      console.log(`    June 3: ${june3Record['Location Address'] || 'No address'}, Pole: ${june3Record['Pole Number'] || 'No pole'}`);
      console.log(`    June 5: ${june5Record['Location Address'] || 'No address'}, Pole: ${june5Record['Pole Number'] || 'No pole'}`);
    });
    if (overlappingIds.length > 10) {
      console.log(`  ... and ${overlappingIds.length - 10} more overlapping Property IDs`);
    }
  }
  
  console.log('\n=== 4. OTHER DUPLICATE ANALYSIS ===');
  
  // Check for same Pole+Address combinations with different Property IDs
  console.log('\nChecking for Pole+Address combinations with different Property IDs...');
  
  // Combine both datasets for this check
  const allData = [...june3Data.map(r => ({...r, source: 'June 3'})), 
                   ...june5Data.map(r => ({...r, source: 'June 5'}))];
  
  // Create map of pole+address combinations
  const poleAddressMap = new Map();
  allData.forEach((row, index) => {
    const pole = row['Pole Number'];
    const address = row['Location Address'];
    const propId = row[propertyIdKey];
    
    if (pole && address && propId) {
      const key = `${pole}|${address}`;
      if (!poleAddressMap.has(key)) {
        poleAddressMap.set(key, []);
      }
      poleAddressMap.get(key).push({
        propertyId: propId,
        source: row.source,
        row: row
      });
    }
  });
  
  // Find pole+address combinations with different property IDs
  const problematicCombos = [];
  poleAddressMap.forEach((entries, key) => {
    const uniquePropIds = new Set(entries.map(e => e.propertyId));
    if (uniquePropIds.size > 1) {
      problematicCombos.push({
        key: key,
        entries: entries
      });
    }
  });
  
  if (problematicCombos.length > 0) {
    console.log(`\nFound ${problematicCombos.length} Pole+Address combinations with DIFFERENT Property IDs:`);
    problematicCombos.slice(0, 5).forEach(combo => {
      const [pole, address] = combo.key.split('|');
      console.log(`\n  Pole: ${pole}, Address: ${address}`);
      const propIds = new Set();
      combo.entries.forEach(entry => {
        propIds.add(entry.propertyId);
      });
      propIds.forEach(id => {
        const sources = combo.entries.filter(e => e.propertyId === id).map(e => e.source);
        console.log(`    Property ID: ${id} (from ${sources.join(', ')})`);
      });
    });
    if (problematicCombos.length > 5) {
      console.log(`  ... and ${problematicCombos.length - 5} more problematic combinations`);
    }
  } else {
    console.log('\nNo Pole+Address combinations found with different Property IDs');
  }
  
  // Additional analysis: Check Pole Number duplicates across files
  console.log('\n=== 5. POLE NUMBER ANALYSIS ===');
  
  const june3Poles = june3Data.map(row => row['Pole Number']).filter(p => p);
  const june5Poles = june5Data.map(row => row['Pole Number']).filter(p => p);
  const uniqueJune3Poles = new Set(june3Poles);
  const uniqueJune5Poles = new Set(june5Poles);
  
  console.log(`\nJune 3rd: ${uniqueJune3Poles.size} unique pole numbers`);
  console.log(`June 5th: ${uniqueJune5Poles.size} unique pole numbers`);
  
  // Count how many times each pole appears
  const poleCountJune3 = new Map();
  june3Poles.forEach(pole => {
    poleCountJune3.set(pole, (poleCountJune3.get(pole) || 0) + 1);
  });
  
  const poleCountJune5 = new Map();
  june5Poles.forEach(pole => {
    poleCountJune5.set(pole, (poleCountJune5.get(pole) || 0) + 1);
  });
  
  // Show most frequent poles
  const june3PoleCounts = Array.from(poleCountJune3.entries()).sort((a, b) => b[1] - a[1]);
  const june5PoleCounts = Array.from(poleCountJune5.entries()).sort((a, b) => b[1] - a[1]);
  
  console.log('\nMost frequent poles in June 3rd:');
  june3PoleCounts.slice(0, 5).forEach(([pole, count]) => {
    console.log(`  ${pole}: appears ${count} times`);
  });
  
  console.log('\nMost frequent poles in June 5th:');
  june5PoleCounts.slice(0, 5).forEach(([pole, count]) => {
    console.log(`  ${pole}: appears ${count} times`);
  });
  
  // Summary statistics
  console.log('\n=== SUMMARY ===');
  console.log(`June 3rd: ${june3Data.length} rows, ${uniqueJune3PropertyIds.size} unique Property IDs`);
  console.log(`June 5th: ${june5Data.length} rows, ${uniqueJune5PropertyIds.size} unique Property IDs`);
  console.log(`Overlapping Property IDs: ${overlappingIds.length}`);
  console.log(`Total unique Property IDs across both files: ${new Set([...uniqueJune3PropertyIds, ...uniqueJune5PropertyIds]).size}`);
  
  // Export detailed results
  const results = {
    june3: {
      totalRows: june3Data.length,
      uniquePropertyIds: uniqueJune3PropertyIds.size,
      duplicatePropertyIds: june3PropDuplicates.length,
      uniquePoles: uniqueJune3Poles.size
    },
    june5: {
      totalRows: june5Data.length,
      uniquePropertyIds: uniqueJune5PropertyIds.size,
      duplicatePropertyIds: june5PropDuplicates.length,
      uniquePoles: uniqueJune5Poles.size
    },
    overlap: {
      propertyIds: overlappingIds.length,
      propertyIdList: overlappingIds
    },
    problematicCombinations: problematicCombos.length
  };
  
  const outputPath = '/home/ldp/VF/Apps/FibreFlow/OneMap/june-duplicate-analysis-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results exported to: ${outputPath}`);
}

// Run the analysis
analyzeFiles().catch(console.error);