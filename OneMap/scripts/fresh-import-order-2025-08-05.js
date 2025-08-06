/**
 * FRESH IMPORT ORDER - Created 2025-08-05
 * Purpose: Import all CSV files in chronological order with fixed script
 * This ensures clean status progression tracking from the beginning
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of files in chronological order
const importOrder = [
  // May 2025
  { file: 'Lawley May Week 3 22052025 - First Report.csv', date: '2025-05-22', records: 746 },
  { file: 'Lawley May Week 3 23052025.csv', date: '2025-05-23', records: 745 },
  { file: 'Lawley May Week 4 26052025.csv', date: '2025-05-26', records: 746 },
  { file: 'Lawley May Week 4 27052025.csv', date: '2025-05-27', records: 746 },
  { file: 'Lawley May Week 4 29052025.csv', date: '2025-05-29', records: 1066 },
  { file: 'Lawley May Week 4 30052025.csv', date: '2025-05-30', records: 1476 },
  
  // June 2025
  { file: 'Lawley June Week 1 02062025.csv', date: '2025-06-02', records: 2644 },
  { file: 'Lawley June Week 1 03062025.csv', date: '2025-06-03', records: 3357 },
  { file: 'Lawley June  Week 1 05062025.csv', date: '2025-06-05', records: 4751 },
  { file: 'Lawley June Week 1 06062025.csv', date: '2025-06-06', records: 4751 },
  { file: 'Lawley June Week 2 09062025.csv', date: '2025-06-09', records: 4895 },
  { file: 'Lawley June Week 2 10062025.csv', date: '2025-06-10', records: 5047 },
  { file: 'Lawley June Week 2 11062025.csv', date: '2025-06-11', records: 5448 },
  { file: 'Lawley June Week 2 12062025.csv', date: '2025-06-12', records: 5691 },
  { file: 'Lawley June Week 2 13062025.csv', date: '2025-06-13', records: 5827 },
  { file: 'Lawley June Week 3 16062025.csv', date: '2025-06-16', records: 5827 },
  { file: 'Lawley June Week 3 17062025.csv', date: '2025-06-17', records: 5827 },
  { file: 'Lawley June Week 3 18062025.csv', date: '2025-06-18', records: 5944 },
  { file: 'Lawley June Week 3 19062025.csv', date: '2025-06-19', records: 5951 },
  { file: 'Lawley June Week 3 20062025.csv', date: '2025-06-20', records: 6041 },
  { file: 'Lawley June Week 3 22062025.csv', date: '2025-06-22', records: 6448 },
  { file: 'Lawley June Week 4 23062025.csv', date: '2025-06-23', records: 6785 },
  { file: 'Lawley June Week 4 26062025.csv', date: '2025-06-26', records: 7971 },
  { file: 'Lawley June Week 4 27062025.csv', date: '2025-06-27', records: 8126 },
  { file: 'Lawley June Week 4 30062025.csv', date: '2025-06-30', records: 6761 },
  
  // July 2025
  { file: 'Lawley July Week 1 01072025.csv', date: '2025-07-01', records: 7413 },
  { file: 'Lawley July Week 1 02072025.csv', date: '2025-07-02', records: 7878 },
  { file: 'Lawley July Week 1 03072025.csv', date: '2025-07-03', records: 8431 },
  { file: 'Lawley July Week 1 04072025.csv', date: '2025-07-04', records: 8468 },
  { file: 'Lawley July Week 2 07072025.csv', date: '2025-07-07', records: 9379 },
  { file: 'Lawley July Week 2 08072025.csv', date: '2025-07-08', records: 9704 },
  // Skip July 11 - incompatible format
  { file: 'Lawley July Week 3 14072025.csv', date: '2025-07-14', records: 10021 },
  { file: 'Lawley July Week 3 15072025.csv', date: '2025-07-15', records: 10030 },
  { file: 'Lawley July Week 3 16072025.csv', date: '2025-07-16', records: 10047 },
  { file: 'Lawley July Week 3 17072025.csv', date: '2025-07-17', records: 10467 },
  { file: 'Lawley July Week 3 18072025.csv', date: '2025-07-18', records: 10479 }
];

console.log('📋 FRESH IMPORT ORDER - 2025-08-05');
console.log('==================================\n');
console.log(`Total files to import: ${importOrder.length}`);
console.log(`Date range: ${importOrder[0].date} to ${importOrder[importOrder.length - 1].date}`);
console.log(`\nThis script will import all files using bulk-import-fixed-2025-08-05.js\n`);

// Display import plan
console.log('Import Order:');
importOrder.forEach((item, index) => {
  console.log(`${index + 1}. [${item.date}] ${item.file} (${item.records.toLocaleString()} records)`);
});

console.log('\n📌 Note: This is just the import order reference');
console.log('📌 To execute imports, run the import-all script or import individually');
console.log('\n💡 Individual import command:');
console.log('node bulk-import-fixed-2025-08-05.js "filename.csv"');

// Export for use by other scripts
module.exports = { importOrder };