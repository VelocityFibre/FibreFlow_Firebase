#!/usr/bin/env node

/**
 * Test script for vf-onemap-data import function
 * Tests the CSV to database import with duplicate detection and change tracking
 */

const fs = require('fs');
const path = require('path');

// Simulate CSV parsing (using existing OneMap parsing logic)
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  // Column mapping (from existing OneMapService)
  const columnMapping = {
    'Property ID': 'propertyId',
    '1map NAD ID': 'oneMapNadId',
    'Pole Number': 'poleNumber',
    'Drop Number': 'dropNumber',
    'Status': 'status',
    'Flow Name Groups': 'flowNameGroups',
    'Sections': 'sections',
    'PONs': 'pons',
    'Location': 'location',
    'Address': 'address',
    'Field Agent Name (Home Sign Ups)': 'fieldAgentName',
    'Last Modified Home Sign Ups By': 'lastModifiedBy',
    'Last Modified Home Sign Ups Date': 'lastModifiedDate',
  };

  // Create column index mapping
  const columnIndices = {};
  headers.forEach((header, index) => {
    Object.keys(columnMapping).forEach((key) => {
      if (header.includes(key)) {
        columnIndices[columnMapping[key]] = index;
      }
    });
  });

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCsvLine(lines[i]);

    const record = {
      propertyId: values[columnIndices['propertyId']] || '',
      oneMapNadId: values[columnIndices['oneMapNadId']] || '',
      poleNumber: values[columnIndices['poleNumber']] || '',
      dropNumber: values[columnIndices['dropNumber']] || '',
      status: values[columnIndices['status']] || '',
      flowNameGroups: values[columnIndices['flowNameGroups']] || '',
      sections: values[columnIndices['sections']] || '',
      pons: values[columnIndices['pons']] || '',
      location: values[columnIndices['location']] || '',
      address: values[columnIndices['address']] || '',
      fieldAgentName: values[columnIndices['fieldAgentName']] || '',
      lastModifiedBy: values[columnIndices['lastModifiedBy']] || '',
      lastModifiedDate: values[columnIndices['lastModifiedDate']] || '',
    };

    records.push(record);
  }

  return records;
}

// Parse CSV line with quote handling (from existing OneMapService)
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Simulate import process
function simulateImport(csvRecords) {
  console.log('🚀 Starting vf-onemap-data Import Process');
  console.log('=====================================');
  
  // Simulate existing database (empty first time)
  const existingRecords = new Map(); // propertyId -> record
  
  const results = {
    newRecords: [],
    changedRecords: [],
    unchangedRecords: [],
    totalRecords: csvRecords.length
  };
  
  console.log(`📊 Processing ${csvRecords.length} CSV records...`);
  
  csvRecords.forEach((record, index) => {
    if (!record.propertyId) {
      console.log(`⚠️  Row ${index + 1}: Skipping record without Property ID`);
      return;
    }
    
    const existing = existingRecords.get(record.propertyId);
    
    if (!existing) {
      // New record
      results.newRecords.push(record);
      existingRecords.set(record.propertyId, record);
      console.log(`✅ New record: ${record.propertyId} (Pole: ${record.poleNumber}, Drop: ${record.dropNumber})`);
    } else {
      // Check for changes
      const changes = [];
      const fieldsToCheck = ['poleNumber', 'dropNumber', 'status', 'fieldAgentName', 'lastModifiedDate'];
      
      fieldsToCheck.forEach(field => {
        if (record[field] !== existing[field]) {
          changes.push(`${field}: ${existing[field]} → ${record[field]}`);
        }
      });
      
      if (changes.length > 0) {
        results.changedRecords.push({ record, changes });
        existingRecords.set(record.propertyId, record);
        console.log(`🔄 Changed record: ${record.propertyId} - ${changes.join(', ')}`);
      } else {
        results.unchangedRecords.push(record);
        console.log(`⏸️  Unchanged: ${record.propertyId}`);
      }
    }
  });
  
  return results;
}

// Generate import report (using tested report logic pattern)
function generateImportReport(results) {
  console.log('\n📋 Import Summary Report');
  console.log('========================');
  console.log(`Total Records Processed: ${results.totalRecords}`);
  console.log(`New Records Added: ${results.newRecords.length}`);
  console.log(`Records Changed: ${results.changedRecords.length}`);
  console.log(`Records Unchanged: ${results.unchangedRecords.length}`);
  
  if (results.newRecords.length > 0) {
    console.log('\n🆕 New Records:');
    results.newRecords.slice(0, 5).forEach(record => {
      console.log(`  - ${record.propertyId}: Pole ${record.poleNumber}, Drop ${record.dropNumber}`);
    });
    if (results.newRecords.length > 5) {
      console.log(`  ... and ${results.newRecords.length - 5} more`);
    }
  }
  
  if (results.changedRecords.length > 0) {
    console.log('\n🔄 Changed Records:');
    results.changedRecords.slice(0, 5).forEach(({ record, changes }) => {
      console.log(`  - ${record.propertyId}: ${changes.join(', ')}`);
    });
    if (results.changedRecords.length > 5) {
      console.log(`  ... and ${results.changedRecords.length - 5} more`);
    }
  }
  
  // Calculate quality metrics
  const duplicateRate = (results.totalRecords - results.newRecords.length) / results.totalRecords;
  const changeRate = results.changedRecords.length / Math.max(1, results.totalRecords - results.newRecords.length);
  
  console.log('\n📊 Data Quality Metrics:');
  console.log(`Duplicate Rate: ${(duplicateRate * 100).toFixed(1)}%`);
  console.log(`Change Rate: ${(changeRate * 100).toFixed(1)}%`);
  console.log(`New Data Rate: ${((1 - duplicateRate) * 100).toFixed(1)}%`);
}

// Main test function
async function testImport() {
  try {
    // Look for test CSV file
    const testCsvPath = path.join(__dirname, '../OneMap/downloads');
    const csvFiles = fs.readdirSync(testCsvPath).filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.log('❌ No CSV files found in OneMap/downloads/ directory');
      console.log('💡 Please add a test CSV file to test the import function');
      return;
    }
    
    const csvFile = csvFiles[0];
    console.log(`📁 Using test file: ${csvFile}`);
    
    // Read and parse CSV
    const csvContent = fs.readFileSync(path.join(testCsvPath, csvFile), 'utf-8');
    const csvRecords = parseCSV(csvContent);
    
    if (csvRecords.length === 0) {
      console.log('❌ No valid records found in CSV file');
      return;
    }
    
    // Simulate import process
    const results = simulateImport(csvRecords);
    
    // Generate report
    generateImportReport(results);
    
    console.log('\n✅ Import test completed successfully!');
    console.log('💡 This demonstrates the duplicate detection and change tracking logic');
    console.log('📝 Next step: Connect to actual vf-onemap-data Firebase database');
    
  } catch (error) {
    console.error('❌ Import test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testImport();
}

module.exports = { testImport, parseCSV, simulateImport, generateImportReport };