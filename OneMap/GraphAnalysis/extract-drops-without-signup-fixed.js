const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the master CSV
const fileContent = fs.readFileSync('./data/master/master_csv_latest.csv', 'utf-8');
const records = csv.parse(fileContent, { 
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

console.log(`Total records in master CSV: ${records.length}`);

// Find all Home Installations without Home Sign Up
const installsWithoutSignup = records.filter(record => {
  const status = record['Status'] || '';
  const flowGroups = record['Flow Name Groups'] || '';
  
  // Check if it's a Home Installation (In Progress or Installed)
  const isHomeInstall = status.includes('Home Installation: In Progress') || 
                       status.includes('Home Installation: Installed');
  
  // Check if Home Sign Up is NOT in the workflow
  const hasNoSignUp = !flowGroups.includes('Home Sign Up');
  
  return isHomeInstall && hasNoSignUp;
});

console.log(`Found ${installsWithoutSignup.length} Home Installations without Home Sign Up`);

// Create export focusing on actual drop numbers
const exportData = [];
let recordsWithDrops = 0;
let recordsWithPoles = 0;
let recordsWithBoth = 0;

installsWithoutSignup.forEach(record => {
  const dropNumber = record['Drop Number'] || '';
  const poleNumber = record['Pole Number'] || '';
  
  // Check if drop number looks like an actual drop number (not a date or email)
  const hasRealDropNumber = dropNumber && 
                           !dropNumber.includes('@') && 
                           !dropNumber.includes('2025-') &&
                           !dropNumber.includes('2025/') &&
                           dropNumber.trim() !== '';
  
  // Check if pole number looks like an actual pole number
  const hasRealPoleNumber = poleNumber && 
                           poleNumber.includes('LAW.P.') &&
                           !poleNumber.includes('@');
  
  if (hasRealDropNumber) recordsWithDrops++;
  if (hasRealPoleNumber) recordsWithPoles++;
  if (hasRealDropNumber && hasRealPoleNumber) recordsWithBoth++;
  
  exportData.push({
    'Property ID': record['Property ID'] || '',
    'Drop Number': dropNumber,
    'Pole Number': poleNumber,
    'Status': record['Status'] || '',
    'Location Address': record['Location Address'] || '',
    'Field Agent': record['Field Agent'] || '',
    'Change Date': record['Change Date'] || '',
    'Has Real Drop': hasRealDropNumber ? 'YES' : 'NO',
    'Has Real Pole': hasRealPoleNumber ? 'YES' : 'NO'
  });
});

// Sort to put records with real drop numbers first
exportData.sort((a, b) => {
  // First sort by having real drop numbers
  if (a['Has Real Drop'] !== b['Has Real Drop']) {
    return a['Has Real Drop'] === 'YES' ? -1 : 1;
  }
  // Then by drop number
  return (a['Drop Number'] || '').localeCompare(b['Drop Number'] || '');
});

// Create CSV content
const headers = ['Property ID', 'Drop Number', 'Pole Number', 'Status', 'Location Address', 'Field Agent', 'Change Date', 'Has Real Drop', 'Has Real Pole'];
let csvContent = headers.join(',') + '\n';

exportData.forEach(row => {
  const values = headers.map(h => {
    const value = row[h] || '';
    // Escape quotes and wrap in quotes if contains comma or newline
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  });
  csvContent += values.join(',') + '\n';
});

// Save main export
fs.writeFileSync('drops_without_signup_full_export.csv', csvContent);

// Create a filtered export with only records that have real drop numbers
const dropsOnlyData = exportData.filter(d => d['Has Real Drop'] === 'YES');
let dropsOnlyCsv = 'Property ID,Drop Number,Pole Number,Status,Location Address\n';

dropsOnlyData.forEach(row => {
  const values = [
    row['Property ID'],
    row['Drop Number'],
    row['Pole Number'],
    row['Status'],
    row['Location Address']
  ].map(v => {
    const value = v || '';
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  });
  dropsOnlyCsv += values.join(',') + '\n';
});

fs.writeFileSync('drops_with_numbers_only.csv', dropsOnlyCsv);

// Summary report
console.log('\n=== SUMMARY ===');
console.log(`Total Home Installations without Sign Up: ${installsWithoutSignup.length}`);
console.log(`Records with real drop numbers: ${recordsWithDrops}`);
console.log(`Records with real pole numbers: ${recordsWithPoles}`);
console.log(`Records with both drop and pole: ${recordsWithBoth}`);
console.log(`Records with neither: ${installsWithoutSignup.length - recordsWithDrops - recordsWithPoles + recordsWithBoth}`);

// Show examples
console.log('\n=== EXAMPLES WITH REAL DROP NUMBERS ===');
dropsOnlyData.slice(0, 10).forEach(d => {
  console.log(`Property: ${d['Property ID']} | Drop: ${d['Drop Number']} | Pole: ${d['Pole Number']}`);
});

console.log('\n=== FILES CREATED ===');
console.log('1. drops_without_signup_full_export.csv - All 526 records');
console.log('2. drops_with_numbers_only.csv - Only records with real drop numbers');

// Additional analysis - find pattern in drop numbers
console.log('\n=== DROP NUMBER PATTERNS ===');
const dropPatterns = {};
dropsOnlyData.forEach(d => {
  const drop = d['Drop Number'];
  if (drop) {
    // Extract pattern (first few characters or format)
    const pattern = drop.substring(0, 5);
    dropPatterns[pattern] = (dropPatterns[pattern] || 0) + 1;
  }
});

console.log('Common drop number prefixes:');
Object.entries(dropPatterns)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([pattern, count]) => {
    console.log(`  "${pattern}..." : ${count} occurrences`);
  });