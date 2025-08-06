const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const augustPath = path.join(__dirname, '../downloads/august-2025');
const augustFiles = [
  '1754294879962_Lawley August Week 1 01082025.csv',
  '1754294986426_Lawley August Week 1 02082025.csv',
  '1754295169323_Lawley August Week 1 03082025.csv',
  '1754374822777_Lawley August Week 1 04082025.csv'
];

async function analyzeStatuses() {
  console.log('🔍 Analyzing all statuses in August 2025 files...\n');
  
  for (const filename of augustFiles) {
    const filePath = path.join(augustPath, filename);
    const fileDate = filename.match(/(\d{2})082025/)?.[1] || 'Unknown';
    
    console.log(`\n📄 ${filename} (August ${fileDate}, 2025):`);
    console.log('='.repeat(60));
    
    const statusCount = new Map();
    const sampleRows = [];
    let rowCount = 0;
    let headers = null;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList;
          console.log(`Headers: ${headerList.join(', ')}\n`);
        })
        .on('data', (row) => {
          rowCount++;
          
          // Collect sample rows
          if (rowCount <= 5) {
            sampleRows.push(row);
          }
          
          // Count statuses
          const status = row['Status'] || 'EMPTY_STATUS';
          statusCount.set(status, (statusCount.get(status) || 0) + 1);
        })
        .on('end', () => {
          // Show sample rows
          console.log('Sample rows:');
          sampleRows.forEach((row, idx) => {
            console.log(`\nRow ${idx + 1}:`);
            Object.entries(row).forEach(([key, value]) => {
              if (value) console.log(`  ${key}: ${value}`);
            });
          });
          
          // Show status distribution
          console.log('\nStatus Distribution:');
          const sortedStatuses = Array.from(statusCount.entries())
            .sort((a, b) => b[1] - a[1]);
          
          sortedStatuses.forEach(([status, count]) => {
            const percentage = ((count / rowCount) * 100).toFixed(1);
            console.log(`  - ${status}: ${count.toLocaleString()} (${percentage}%)`);
          });
          
          console.log(`\nTotal rows: ${rowCount.toLocaleString()}`);
          resolve();
        })
        .on('error', reject);
    });
  }
}

// Run analysis
analyzeStatuses().catch(console.error);