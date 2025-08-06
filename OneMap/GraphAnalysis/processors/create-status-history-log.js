#!/usr/bin/env node

/**
 * Status History Log Generator
 * 
 * Creates a separate CSV file containing ONLY status changes
 * Memory efficient - streams directly to file
 * Complements the main master CSV
 * 
 * Date: 2025-08-05
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream, createWriteStream } = require('fs');
const { stringify } = require('csv-stringify/sync');

// Output directory
const MASTER_DIR = path.join(__dirname, '../data/master');

// Status history columns
const HISTORY_COLUMNS = [
  'Property ID',
  'Change Date',
  'Previous Status',
  'New Status',
  'Source File',
  'Pole Number',
  'Location Address',
  'Field Agent'
];

// Extract date from filename
function extractDateFromFilename(filename) {
  const patterns = [
    { regex: /june\s*(\d+)/i, transform: (m) => `2025-06-${m[1].padStart(2, '0')}` },
    { regex: /july.*?(\d{2})072025/i, transform: (m) => `2025-07-${m[1]}` },
    { regex: /may.*?(\d{2})052025/i, transform: (m) => `2025-05-${m[1]}` },
    { regex: /(\d{4})-(\d{2})-(\d{2})/, transform: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { regex: /(\d{2})(\d{2})(\d{4})/, transform: (m) => `${m[3]}-${m[2]}-${m[1]}` }
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern.regex);
    if (match) {
      return pattern.transform(match);
    }
  }
  return null;
}

// Process single CSV file and extract records
async function extractRecordsFromCSV(csvPath) {
  const records = [];
  let headers = null;
  
  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csv.parse({
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
        skip_records_with_error: true,
        delimiter: [',', ';']
      }))
      .on('data', (row) => {
        if (!headers) {
          headers = row;
        } else {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = row[index] || '';
          });
          records.push(record);
        }
      })
      .on('error', reject)
      .on('end', () => {
        resolve({ headers, records });
      });
  });
}

// Get Property ID from record
function getPropertyId(record) {
  const possibleKeys = [
    'Property ID',
    'property_id',
    'PropertyID',
    'propertyId',
    'Property_ID',
    'PROPERTY_ID'
  ];
  
  for (const key of possibleKeys) {
    if (record[key] && record[key].toString().trim()) {
      return record[key].toString().trim();
    }
  }
  
  return null;
}

// Extract key fields from record
function getKeyFields(record) {
  return {
    status: record['Status'] || '',
    poleNumber: record['Pole Number'] || '',
    locationAddress: (record['Location Address'] || '').substring(0, 50),
    fieldAgent: record['Field Agent Name (pole permission)'] || 
                record['Field Agent Name (Home Sign Ups)'] || 
                record['Field Agent Name & Surname(sales)'] || ''
  };
}

// Create status history log
async function createStatusHistoryLog(csvDirectory) {
  console.log('📊 Creating Status History Log\n');
  console.log('This extracts ONLY status changes for efficient tracking\n');
  
  try {
    await fs.mkdir(MASTER_DIR, { recursive: true });
    
    // Scan for CSV files
    const sourceDir = csvDirectory || path.join(__dirname, '../downloads');
    const files = await fs.readdir(sourceDir);
    const csvFiles = files
      .filter(f => f.toLowerCase().endsWith('.csv'))
      .map(f => ({
        filename: f,
        path: path.join(sourceDir, f),
        date: extractDateFromFilename(f)
      }))
      .filter(f => f.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (csvFiles.length === 0) {
      console.log('❌ No CSV files found');
      return;
    }
    
    console.log(`📋 Found ${csvFiles.length} CSV files to process\n`);
    
    // Setup output file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputPath = path.join(MASTER_DIR, `status_history_log_${timestamp}.csv`);
    const latestPath = path.join(MASTER_DIR, 'status_history_log_latest.csv');
    
    // Create write stream with headers
    const writeStream = createWriteStream(outputPath);
    writeStream.write(stringify([HISTORY_COLUMNS]));
    
    // Track last status per property
    const propertyStatusMap = new Map();
    let totalChanges = 0;
    let recordsProcessed = 0;
    
    // Process each file
    for (const [index, csvFile] of csvFiles.entries()) {
      console.log(`Processing ${index + 1}/${csvFiles.length}: ${csvFile.filename}`);
      
      let fileChanges = 0;
      
      try {
        const { records } = await extractRecordsFromCSV(csvFile.path);
        
        for (const record of records) {
          const propertyId = getPropertyId(record);
          if (!propertyId) continue;
          
          recordsProcessed++;
          
          const fields = getKeyFields(record);
          const currentStatus = fields.status;
          
          if (!currentStatus) continue;
          
          const lastStatus = propertyStatusMap.get(propertyId);
          
          // First time seeing this property
          if (!lastStatus) {
            propertyStatusMap.set(propertyId, {
              status: currentStatus,
              ...fields
            });
            
            // Log initial status
            const historyRecord = [
              propertyId,
              csvFile.date,
              '', // No previous status
              currentStatus,
              csvFile.filename,
              fields.poleNumber,
              fields.locationAddress,
              fields.fieldAgent
            ];
            
            writeStream.write(stringify([historyRecord]));
            fileChanges++;
            
          } else if (lastStatus.status !== currentStatus) {
            // Status changed!
            const historyRecord = [
              propertyId,
              csvFile.date,
              lastStatus.status,
              currentStatus,
              csvFile.filename,
              fields.poleNumber,
              fields.locationAddress,
              fields.fieldAgent
            ];
            
            writeStream.write(stringify([historyRecord]));
            fileChanges++;
            
            // Update tracked status
            propertyStatusMap.set(propertyId, {
              status: currentStatus,
              ...fields
            });
          }
          
          // Show progress every 10000 records
          if (recordsProcessed % 10000 === 0) {
            process.stdout.write(`\r  Processed ${recordsProcessed.toLocaleString()} records...`);
          }
        }
        
        totalChanges += fileChanges;
        console.log(`\n  ✅ Found ${fileChanges} status changes`);
        
      } catch (error) {
        console.log(`\n  ❌ Error: ${error.message}`);
      }
    }
    
    // Close write stream
    await new Promise((resolve) => writeStream.end(resolve));
    
    // Copy to latest
    await fs.copyFile(outputPath, latestPath);
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Status History Log Complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`   • Total records processed: ${recordsProcessed.toLocaleString()}`);
    console.log(`   • Unique properties tracked: ${propertyStatusMap.size.toLocaleString()}`);
    console.log(`   • Status changes logged: ${totalChanges.toLocaleString()}`);
    console.log(`   • Files processed: ${csvFiles.length}`);
    console.log(`\n📁 Output files:`);
    console.log(`   • History log: ${outputPath}`);
    console.log(`   • Latest: ${latestPath}`);
    console.log(`\n💡 This file contains ONLY status changes,`);
    console.log(`   keeping file size small while preserving full history!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const csvDirectory = process.argv[2];
  createStatusHistoryLog(csvDirectory)
    .then(() => {
      console.log('\n✅ Status history log completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { createStatusHistoryLog };