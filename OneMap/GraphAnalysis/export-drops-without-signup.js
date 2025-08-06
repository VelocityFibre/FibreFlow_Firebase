const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the master CSV
const fileContent = fs.readFileSync('./data/master/master_csv_latest.csv', 'utf-8');
const records = csv.parse(fileContent, { columns: true });

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

console.log(`Found ${installsWithoutSignup.length} drops without Home Sign Up`);

// Create export with focus on drop numbers
const exportData = installsWithoutSignup.map(record => {
  return {
    'Property ID': record['Property ID'] || '',
    'Drop Number': record['Drop Number'] || '',
    'Pole Number': record['Pole Number'] || '',
    'Status': record['Status'] || '',
    'Location Address': record['Location Address'] || '',
    'Field Agent': record['Field Agent'] || '',
    'Change Date': record['Change Date'] || '',
    'Flow Name Groups': record['Flow Name Groups'] || ''
  };
});

// Sort by drop number (put empty drop numbers at end)
exportData.sort((a, b) => {
  const dropA = a['Drop Number'] || 'zzz';
  const dropB = b['Drop Number'] || 'zzz';
  return dropA.localeCompare(dropB);
});

// Create CSV header
const headers = ['Property ID', 'Drop Number', 'Pole Number', 'Status', 'Location Address', 'Field Agent', 'Change Date', 'Flow Name Groups'];
const csvContent = [
  headers.join(','),
  ...exportData.map(row => 
    headers.map(h => {
      const value = row[h] || '';
      // Escape quotes and wrap in quotes if contains comma
      return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',')
  )
].join('\n');

// Save to file
fs.writeFileSync('drops_without_signup_export.csv', csvContent);

// Show summary of drop numbers
const dropsWithNumbers = exportData.filter(d => d['Drop Number']);
const dropsWithoutNumbers = exportData.filter(d => !d['Drop Number']);

console.log('\nDrop Number Summary:');
console.log(`- Records WITH drop numbers: ${dropsWithNumbers.length}`);
console.log(`- Records WITHOUT drop numbers: ${dropsWithoutNumbers.length}`);

// Show first 20 examples with drop numbers
console.log('\nExamples WITH drop numbers:');
dropsWithNumbers.slice(0, 20).forEach(d => {
  console.log(`  Drop: ${d['Drop Number'].padEnd(15)} | Pole: ${(d['Pole Number'] || 'N/A').padEnd(15)} | Property: ${d['Property ID']} | ${d['Status']}`);
});

// Show some examples without drop numbers
console.log('\nExamples WITHOUT drop numbers (but have pole numbers):');
const withPoleNoDrops = dropsWithoutNumbers.filter(d => d['Pole Number']);
withPoleNoDrops.slice(0, 10).forEach(d => {
  console.log(`  Pole: ${d['Pole Number'].padEnd(15)} | Property: ${d['Property ID']} | ${d['Status']}`);
});

console.log(`\nExport saved to: drops_without_signup_export.csv`);
console.log(`Total records exported: ${exportData.length}`);