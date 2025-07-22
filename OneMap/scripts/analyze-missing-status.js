const fs = require('fs');
const csv = require('csv-parse/sync');

const content = fs.readFileSync('exports/missing-status/missing-status-2025-07-21.csv', 'utf8');
const records = csv.parse(content, {
  columns: true,
  skip_empty_lines: true
});

console.log('📊 Missing Status Records Analysis');
console.log('=================================\n');

console.log(`Total Records: ${records.length}`);

// Analyze GPS availability
let withGPS = 0;
let withoutGPS = 0;
let hasAgent = 0;

records.forEach(record => {
  if (record['GPS Latitude'] && record['GPS Longitude']) {
    withGPS++;
  } else {
    withoutGPS++;
  }
  
  if (record['Field Agent'] !== 'No Agent') {
    hasAgent++;
  }
});

console.log(`\nGPS Data:`);
console.log(`- With GPS coordinates: ${withGPS} (${Math.round(withGPS/records.length*100)}%)`);
console.log(`- Without GPS coordinates: ${withoutGPS} (${Math.round(withoutGPS/records.length*100)}%)`);

console.log(`\nField Agent:`);
console.log(`- With assigned agent: ${hasAgent}`);
console.log(`- Without agent: ${records.length - hasAgent}`);

// Sample addresses
console.log('\nSample Addresses (first 5):');
records.slice(0, 5).forEach((record, i) => {
  console.log(`${i + 1}. ${record['Location Address']}`);
});

console.log('\n✅ Export Details:');
console.log('- File: exports/missing-status/missing-status-2025-07-21.csv');
console.log('- Format: CSV with headers');
console.log('- Purpose: Field team to obtain pole numbers for these properties');
console.log('\n📋 Next Steps:');
console.log('1. Distribute to field teams for pole number assignment');
console.log('2. Update records once pole numbers are obtained');
console.log('3. Re-sync to production with complete data');