// Calculate total records from all CSV files

const files = [
  // May 2025
  { file: 'Lawley May Week 3 22052025 - First Report.csv', records: 746 },
  { file: 'Lawley May Week 3 23052025.csv', records: 745 },
  { file: 'Lawley May Week 4 26052025.csv', records: 746 },
  { file: 'Lawley May Week 4 27052025.csv', records: 746 },
  { file: 'Lawley May Week 4 29052025.csv', records: 1066 },
  { file: 'Lawley May Week 4 30052025.csv', records: 1476 },
  
  // June 2025
  { file: 'Lawley June Week 1 02062025.csv', records: 2644 },
  { file: 'Lawley June Week 1 03062025.csv', records: 3357 },
  { file: 'Lawley June  Week 1 05062025.csv', records: 4751 },
  { file: 'Lawley June Week 1 06062025.csv', records: 4751 },
  { file: 'Lawley June Week 2 09062025.csv', records: 4895 },
  { file: 'Lawley June Week 2 10062025.csv', records: 5047 },
  { file: 'Lawley June Week 2 11062025.csv', records: 5448 },
  { file: 'Lawley June Week 2 12062025.csv', records: 5691 },
  { file: 'Lawley June Week 2 13062025.csv', records: 5827 },
  { file: 'Lawley June Week 3 16062025.csv', records: 5827 },
  { file: 'Lawley June Week 3 17062025.csv', records: 5827 },
  { file: 'Lawley June Week 3 18062025.csv', records: 5944 },
  { file: 'Lawley June Week 3 19062025.csv', records: 5951 },
  { file: 'Lawley June Week 3 20062025.csv', records: 6041 },
  { file: 'Lawley June Week 3 22062025.csv', records: 6448 },
  { file: 'Lawley June Week 4 23062025.csv', records: 6785 },
  { file: 'Lawley June Week 4 26062025.csv', records: 7971 },
  { file: 'Lawley June Week 4 27062025.csv', records: 8126 },
  { file: 'Lawley June Week 4 30062025.csv', records: 6761 },
  
  // July 2025
  { file: 'Lawley July Week 1 01072025.csv', records: 7413 },
  { file: 'Lawley July Week 1 02072025.csv', records: 7878 },
  { file: 'Lawley July Week 1 03072025.csv', records: 8431 },
  { file: 'Lawley July Week 1 04072025.csv', records: 8468 },
  { file: 'Lawley July Week 2 07072025.csv', records: 9379 },
  { file: 'Lawley July Week 2 08072025.csv', records: 9704 },
  // Skip July 11
  { file: 'Lawley July Week 3 14072025.csv', records: 10021 },
  { file: 'Lawley July Week 3 15072025.csv', records: 10030 },
  { file: 'Lawley July Week 3 16072025.csv', records: 10047 },
  { file: 'Lawley July Week 3 17072025.csv', records: 10467 },
  { file: 'Lawley July Week 3 18072025.csv', records: 10479 }
];

console.log('📊 TOTAL RECORDS CALCULATION');
console.log('===========================\n');

// Calculate by month
const mayTotal = files.slice(0, 6).reduce((sum, f) => sum + f.records, 0);
const juneTotal = files.slice(6, 25).reduce((sum, f) => sum + f.records, 0);
const julyTotal = files.slice(25).reduce((sum, f) => sum + f.records, 0);

console.log('May 2025:');
console.log(`  Files: 6`);
console.log(`  Records: ${mayTotal.toLocaleString()}`);

console.log('\nJune 2025:');
console.log(`  Files: 19`);
console.log(`  Records: ${juneTotal.toLocaleString()}`);

console.log('\nJuly 2025:');
console.log(`  Files: 11`);
console.log(`  Records: ${julyTotal.toLocaleString()}`);

const grandTotal = mayTotal + juneTotal + julyTotal;

console.log('\n📊 GRAND TOTAL:');
console.log(`  Files: ${files.length}`);
console.log(`  Records: ${grandTotal.toLocaleString()}`);

console.log('\n⚠️  IMPORTANT NOTE:');
console.log('These are cumulative totals - many records appear in multiple files');
console.log('as they track the same properties over time.');
console.log('\nActual unique properties: ~10,000-15,000 (estimated)');