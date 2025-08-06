const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the FIXED master CSV
const fileContent = fs.readFileSync('./data/master/master_csv_semicolon_fixed_latest.csv', 'utf-8');
const records = csv.parse(fileContent, { 
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

console.log(`Total records in FIXED master CSV: ${records.length}`);

// Find all Home Installations without Home Sign Up
const installsWithoutSignup = records.filter(record => {
  const status = record['Status'] || '';
  const flowGroups = record['Flow Name Groups'] || '';
  
  const isHomeInstall = status.includes('Home Installation: In Progress') || 
                       status.includes('Home Installation: Installed');
  const hasNoSignUp = !flowGroups.includes('Home Sign Up');
  
  return isHomeInstall && hasNoSignUp;
});

console.log(`\nFound ${installsWithoutSignup.length} Home Installations without Home Sign Up`);

// Analyze drop numbers
let realDropNumbers = 0;
let noDropAllocated = 0;
let emptyDropField = 0;
let invalidDropNumbers = 0;

const dropStats = {
  withRealDrops: [],
  noDropAllocated: [],
  empty: [],
  invalid: []
};

installsWithoutSignup.forEach(record => {
  const dropNumber = record['Drop Number'] || '';
  const propertyId = record['Property ID'];
  const poleNumber = record['Pole Number'] || '';
  const status = record['Status'];
  
  if (dropNumber.startsWith('DR') && dropNumber.match(/^DR\d{7}$/)) {
    realDropNumbers++;
    dropStats.withRealDrops.push({ propertyId, dropNumber, poleNumber, status });
  } else if (dropNumber.toLowerCase().includes('no drop')) {
    noDropAllocated++;
    dropStats.noDropAllocated.push({ propertyId, dropNumber, poleNumber, status });
  } else if (dropNumber.trim() === '') {
    emptyDropField++;
    dropStats.empty.push({ propertyId, poleNumber, status });
  } else {
    invalidDropNumbers++;
    dropStats.invalid.push({ propertyId, dropNumber, poleNumber, status });
  }
});

// Summary report
console.log('\n=== DROP NUMBER ANALYSIS (FIXED DATA) ===');
console.log(`Real drop numbers (DRxxxxxxx): ${realDropNumbers} (${(realDropNumbers/installsWithoutSignup.length*100).toFixed(1)}%)`);
console.log(`"No drop allocated": ${noDropAllocated} (${(noDropAllocated/installsWithoutSignup.length*100).toFixed(1)}%)`);
console.log(`Empty drop field: ${emptyDropField} (${(emptyDropField/installsWithoutSignup.length*100).toFixed(1)}%)`);
console.log(`Invalid/other: ${invalidDropNumbers} (${(invalidDropNumbers/installsWithoutSignup.length*100).toFixed(1)}%)`);

// Show examples
console.log('\n=== EXAMPLES WITH REAL DROP NUMBERS ===');
dropStats.withRealDrops.slice(0, 10).forEach(r => {
  console.log(`Property: ${r.propertyId} | Drop: ${r.dropNumber} | Pole: ${r.poleNumber} | ${r.status}`);
});

// Export improved results
const exportHeaders = ['Property ID', 'Drop Number', 'Pole Number', 'Status', 'Drop Category'];
let csvContent = exportHeaders.join(',') + '\n';

// Add all records with categorization
installsWithoutSignup.forEach(record => {
  const dropNumber = record['Drop Number'] || '';
  let category = '';
  
  if (dropNumber.startsWith('DR') && dropNumber.match(/^DR\d{7}$/)) {
    category = 'Valid Drop';
  } else if (dropNumber.toLowerCase().includes('no drop')) {
    category = 'No Drop Allocated';
  } else if (dropNumber.trim() === '') {
    category = 'Empty';
  } else {
    category = 'Invalid';
  }
  
  const row = [
    record['Property ID'],
    dropNumber,
    record['Pole Number'] || '',
    record['Status'],
    category
  ].map(v => {
    const value = v || '';
    if (value.includes(',') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  });
  
  csvContent += row.join(',') + '\n';
});

fs.writeFileSync('home_installs_without_signup_IMPROVED.csv', csvContent);

// Create detailed report
const report = `# Home Installations Without Sign Up - Improved Analysis
**Date**: 2025-08-05
**Data Source**: Fixed master CSV with proper semicolon parsing

## Summary
- **Total Home Installations without Sign Up**: ${installsWithoutSignup.length}
- **With valid drop numbers**: ${realDropNumbers} (${(realDropNumbers/installsWithoutSignup.length*100).toFixed(1)}%)
- **"No drop allocated"**: ${noDropAllocated} (${(noDropAllocated/installsWithoutSignup.length*100).toFixed(1)}%)
- **Empty drop field**: ${emptyDropField} (${(emptyDropField/installsWithoutSignup.length*100).toFixed(1)}%)
- **Invalid entries**: ${invalidDropNumbers} (${(invalidDropNumbers/installsWithoutSignup.length*100).toFixed(1)}%)

## Improvement from Fix
- **Before fix**: Only 21 drop numbers found (4%)
- **After fix**: ${realDropNumbers} drop numbers found (${(realDropNumbers/installsWithoutSignup.length*100).toFixed(1)}%)
- **Improvement**: ${realDropNumbers - 21} additional drops recovered

## Export File
- **Filename**: home_installs_without_signup_IMPROVED.csv
- **Contains**: All ${installsWithoutSignup.length} records with drop categorization

## Next Steps
1. Audit the ${realDropNumbers} properties with valid drops for consent
2. Investigate why ${noDropAllocated} show "no drop allocated" status
3. Field verify the ${emptyDropField} records with empty drop fields
`;

fs.writeFileSync('HOME_INSTALLS_ANALYSIS_IMPROVED.md', report);

console.log('\n=== FILES CREATED ===');
console.log('1. home_installs_without_signup_IMPROVED.csv');
console.log('2. HOME_INSTALLS_ANALYSIS_IMPROVED.md');
console.log(`\nTotal improvement: ${realDropNumbers - 21} additional drop numbers found!`);