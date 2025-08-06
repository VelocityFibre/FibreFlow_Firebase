#!/usr/bin/env node

/**
 * Generate sample OneMap-like data for testing
 * Creates a realistic Excel file with pole/drop data
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configuration
const NUM_RECORDS = 5000;
const OUTPUT_FILE = path.join(__dirname, '../data/excel/sample_onemap_data.xlsx');

// Sample data generators
const zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
const feeders = ['Feeder 1', 'Feeder 2', 'Feeder 3', 'Feeder 4'];
const agents = ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams', 'Chris Brown'];
const statuses = [
  'Pole Permission: Approved',
  'Pole Permission: Pending',
  'Drop Installation: Complete',
  'Drop Installation: In Progress',
  'Survey: Complete',
  'Survey: Pending'
];

function generatePoleNumber(index) {
  const prefix = ['LAW', 'MOH', 'BEN', 'SAN'][Math.floor(index / 1000) % 4];
  const letter = String.fromCharCode(65 + (Math.floor(index / 100) % 26));
  const number = (index % 100) + 100;
  return `${prefix}.P.${letter}${number}`;
}

function generateDropNumber(poleNumber, dropIndex) {
  return `${poleNumber}.${String(dropIndex + 1).padStart(2, '0')}`;
}

function generateDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0];
}

function generateRecords() {
  const records = [];
  const usedPoles = new Set();
  
  for (let i = 0; i < NUM_RECORDS; i++) {
    const poleIndex = Math.floor(Math.random() * 1000);
    const poleNumber = generatePoleNumber(poleIndex);
    const dropIndex = usedPoles.has(poleNumber) ? Math.floor(Math.random() * 12) : 0;
    usedPoles.add(poleNumber);
    
    const record = {
      'Property ID': 100000 + i,
      'Pole Number': poleNumber,
      'Drop Number': generateDropNumber(poleNumber, dropIndex),
      'Status': statuses[Math.floor(Math.random() * statuses.length)],
      'Date Changed': generateDate(Math.floor(Math.random() * 90)),
      'Agent': agents[Math.floor(Math.random() * agents.length)],
      'Address': `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Market', 'Church', 'Park'][Math.floor(Math.random() * 4)]} Street`,
      'Zone': zones[Math.floor(Math.random() * zones.length)],
      'Feeder': feeders[Math.floor(Math.random() * feeders.length)],
      'Latitude': -26 + (Math.random() * 2),
      'Longitude': 28 + (Math.random() * 2),
      'PON': `PON-${Math.floor(Math.random() * 100) + 1}`,
      'Distribution': `DIST-${Math.floor(Math.random() * 50) + 1}`,
      'Project': 'Lawley Fibre Rollout',
      'Contractor': ['ABC Contractors', 'XYZ Installations', 'Quick Fibre'][Math.floor(Math.random() * 3)]
    };
    
    records.push(record);
  }
  
  // Sort by date
  records.sort((a, b) => new Date(a['Date Changed']) - new Date(b['Date Changed']));
  
  return records;
}

console.log('Generating sample OneMap data...');
console.log(`Creating ${NUM_RECORDS} records`);

// Generate data
const data = generateRecords();

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Add to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Status Changes');

// Ensure directory exists
const dir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Write file
XLSX.writeFile(wb, OUTPUT_FILE);

console.log(`✓ Sample data generated: ${OUTPUT_FILE}`);
console.log(`  Records: ${data.length}`);
console.log(`  Unique poles: ${new Set(data.map(r => r['Pole Number'])).size}`);
console.log(`  Date range: ${data[0]['Date Changed']} to ${data[data.length - 1]['Date Changed']}`);
console.log('');
console.log('To import this sample data:');
console.log('npm run import ../data/excel/sample_onemap_data.xlsx');