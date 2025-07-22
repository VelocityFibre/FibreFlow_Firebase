#!/usr/bin/env node

/**
 * Master CSV Creator with Validation and Better Parsing
 * 
 * Fixes corruption issues by:
 * 1. Better CSV parsing options
 * 2. Field validation before import
 * 3. Option to clean corrupted data
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream, createWriteStream } = require('fs');
const { stringify } = require('csv-stringify');

// Output directories
const MASTER_DIR = path.join(__dirname, '../data/master');
const DAILY_REPORTS_DIR = path.join(__dirname, '../reports/daily-processing');
const CHANGE_LOGS_DIR = path.join(__dirname, '../data/change-logs');
const VALIDATION_LOGS_DIR = path.join(__dirname, '../data/validation-logs');

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(MASTER_DIR, { recursive: true });
  await fs.mkdir(DAILY_REPORTS_DIR, { recursive: true });
  await fs.mkdir(CHANGE_LOGS_DIR, { recursive: true });
  await fs.mkdir(VALIDATION_LOGS_DIR, { recursive: true });
}

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

// OPTION 2: Validation Functions
function validatePoleNumber(value) {
  if (!value) return true; // Empty is OK
  
  // Pole numbers should match pattern like LAW.P.C132
  const validPattern = /^[A-Z]{2,4}\.[A-Z]\.[A-Z0-9]+$/i;
  
  // Check for obvious date patterns (corruption indicator)
  const datePattern = /\d{4}[-\/]\d{2}[-\/]\d{2}|^\d{2}:\d{2}/;
  
  if (datePattern.test(value)) {
    return false; // This is a date, not a pole number
  }
  
  // Allow valid patterns or short codes
  return validPattern.test(value) || value.length < 20;
}

function validateGPSCoordinate(value) {
  if (!value) return true; // Empty is OK
  
  // Valid GPS coordinates are numbers between -90 to 90 (lat) or -180 to 180 (lon)
  const num = parseFloat(value);
  
  if (isNaN(num)) return false;
  if (Math.abs(num) > 180) return false;
  
  // Check if it contains text (corruption indicator)
  if (value.length > 20 || /[a-zA-Z]{5,}/.test(value)) {
    return false; // Contains too much text
  }
  
  return true;
}

function validateAddress(value) {
  if (!value) return true; // Empty is OK
  
  // Address shouldn't contain GPS coordinates
  const gpsPattern = /\[?-?\d+\.\d{10,}/; // Long decimal numbers
  
  if (gpsPattern.test(value)) {
    return false; // Contains GPS coordinates
  }
  
  // Address shouldn't be too long (indicates legal text corruption)
  if (value.length > 200) {
    return false; // Too long for an address
  }
  
  return true;
}

function validateDate(value) {
  if (!value) return true; // Empty is OK
  
  // Should not contain long text
  if (value.length > 30) return false;
  
  // Should not contain legal text patterns
  if (/consent|hereby|property|company/i.test(value)) {
    return false;
  }
  
  return true;
}

// Validate entire record
function validateRecord(record) {
  const validationErrors = [];
  
  // Check key fields
  if (record['Pole Number'] && !validatePoleNumber(record['Pole Number'])) {
    validationErrors.push(`Invalid Pole Number: ${record['Pole Number']}`);
  }
  
  if (record['Location Address'] && !validateAddress(record['Location Address'])) {
    validationErrors.push(`Invalid Address: ${record['Location Address'].substring(0, 50)}...`);
  }
  
  if (record['Latitude'] && !validateGPSCoordinate(record['Latitude'])) {
    validationErrors.push(`Invalid Latitude: ${record['Latitude'].substring(0, 50)}...`);
  }
  
  if (record['Longitude'] && !validateGPSCoordinate(record['Longitude'])) {
    validationErrors.push(`Invalid Longitude: ${record['Longitude'].substring(0, 50)}...`);
  }
  
  // Check for shifted data pattern
  const suspiciousFields = [
    'Owner or Tenant',
    'Primary House of Backyard Dwelling',
    'Number of People Living in the Home'
  ];
  
  for (const field of suspiciousFields) {
    if (record[field] && (
      /^\-?\d+\.\d{10,}/.test(record[field]) || // GPS coordinates
      record[field].length > 100 // Legal text
    )) {
      validationErrors.push(`Field shift detected in ${field}`);
    }
  }
  
  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors
  };
}

// Process single CSV file with OPTION 1: Better parsing
async function extractRecordsFromCSV(csvPath, validateData = true) {
  const records = [];
  const invalidRecords = [];
  let headers = null;
  let rowNumber = 0;
  
  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csv.parse({
        // OPTION 1: Better CSV parsing options
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
        skip_records_with_error: true,
        delimiter: [',', ';'],  // Support both comma and semicolon
        quote: '"',           // Handle quoted fields properly
        escape: '"',          // Handle escaped quotes
        ltrim: true,          // Trim leading whitespace
        rtrim: true,          // Trim trailing whitespace
        max_record_size: 1000000, // Handle large records
        skip_lines_with_empty_values: false,
        // Handle multi-line fields
        relax: true,
        comment: '',
        // Better error handling
        on_record: (record, context) => {
          // Skip records that are clearly corrupted
          if (headers && record.length > headers.length * 2) {
            console.log(`Skipping row ${context.lines}: Too many columns (${record.length} vs ${headers.length})`);
            return null;
          }
          return record;
        }
      }))
      .on('data', (row) => {
        rowNumber++;
        
        if (!headers) {
          headers = row;
        } else {
          const record = {};
          
          // Map values to headers, being careful about column count
          const maxColumns = Math.min(headers.length, row.length);
          for (let i = 0; i < maxColumns; i++) {
            record[headers[i]] = row[i] || '';
          }
          
          // OPTION 2: Validate record if enabled
          if (validateData) {
            const validation = validateRecord(record);
            if (validation.isValid) {
              records.push(record);
            } else {
              invalidRecords.push({
                rowNumber,
                record,
                errors: validation.errors
              });
            }
          } else {
            records.push(record);
          }
        }
      })
      .on('error', (error) => {
        console.log(`CSV parsing error at row ${rowNumber}: ${error.message}`);
        // Continue processing other rows
      })
      .on('end', () => {
        resolve({ headers, records, invalidRecords });
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
  
  // Check first column if numeric
  const firstKey = Object.keys(record)[0];
  if (firstKey && record[firstKey] && /^\d+$/.test(record[firstKey].toString().trim())) {
    return record[firstKey].toString().trim();
  }
  
  return null;
}

// Compare two records and find changes
function compareRecords(oldRecord, newRecord, fieldsToTrack) {
  const changes = [];
  
  // Track all fields if not specified
  const fields = fieldsToTrack || Object.keys(newRecord);
  
  for (const field of fields) {
    // Skip metadata fields
    if (field.startsWith('_')) continue;
    
    const oldValue = (oldRecord[field] || '').toString().trim();
    const newValue = (newRecord[field] || '').toString().trim();
    
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue
      });
    }
  }
  
  return changes;
}

// Create validation report
async function createValidationReport(data) {
  const { date, filename, invalidRecords } = data;
  const reportPath = path.join(VALIDATION_LOGS_DIR, `validation_${date}_${filename.replace('.csv', '.md')}`);
  
  let md = `# Validation Report - ${date}\n\n`;
  md += `**File**: ${filename}\n`;
  md += `**Invalid Records**: ${invalidRecords.length}\n\n`;
  
  if (invalidRecords.length > 0) {
    md += `## Invalid Records\n\n`;
    
    invalidRecords.slice(0, 50).forEach((invalid, index) => {
      md += `### ${index + 1}. Row ${invalid.rowNumber} - Property ID: ${getPropertyId(invalid.record) || 'Unknown'}\n\n`;
      md += `**Errors**:\n`;
      invalid.errors.forEach(error => {
        md += `- ${error}\n`;
      });
      md += `\n`;
    });
    
    if (invalidRecords.length > 50) {
      md += `\n*... and ${invalidRecords.length - 50} more invalid records*\n`;
    }
  }
  
  await fs.writeFile(reportPath, md);
  return reportPath;
}

// Create daily processing report
async function createDailyReport(data) {
  const { date, filename, stats, changes, changeLog, validationLog } = data;
  const reportPath = path.join(DAILY_REPORTS_DIR, `processing_${date}_${filename.replace('.csv', '')}.md`);
  
  let md = `# Daily Processing Report - ${date}\n\n`;
  md += `**File Processed**: ${filename}\n`;
  md += `**Processing Time**: ${new Date().toISOString()}\n\n`;
  
  md += `## Summary Statistics\n\n`;
  md += `- **Total Records in File**: ${stats.totalRecords}\n`;
  md += `- **Valid Records Processed**: ${stats.validRecords}\n`;
  md += `- **Invalid Records Skipped**: ${stats.invalidRecords}\n`;
  md += `- **New Records Added**: ${stats.newRecords}\n`;
  md += `- **Existing Records Updated**: ${stats.updatedRecords}\n`;
  md += `- **Records Unchanged**: ${stats.unchangedRecords}\n`;
  md += `- **Records Without Property ID**: ${stats.noPropertyId}\n\n`;
  
  if (stats.invalidRecords > 0) {
    md += `## ⚠️ Data Quality Warning\n\n`;
    md += `This file contained ${stats.invalidRecords} invalid records that were skipped.\n`;
    md += `See validation report: ${validationLog}\n\n`;
  }
  
  if (changes.length > 0) {
    md += `## Changes Made\n\n`;
    md += `### Summary by Field\n\n`;
    
    // Count changes by field
    const fieldChangeCounts = {};
    changes.forEach(change => {
      change.changes.forEach(fieldChange => {
        fieldChangeCounts[fieldChange.field] = (fieldChangeCounts[fieldChange.field] || 0) + 1;
      });
    });
    
    md += `| Field | Changes Count |\n`;
    md += `|-------|---------------|\n`;
    Object.entries(fieldChangeCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([field, count]) => {
        md += `| ${field} | ${count} |\n`;
      });
    
    md += `\n### Detailed Changes (First 50)\n\n`;
    
    changes.slice(0, 50).forEach((change, index) => {
      md += `#### ${index + 1}. Property ID: ${change.propertyId}\n\n`;
      change.changes.forEach(fieldChange => {
        md += `- **${fieldChange.field}**:\n`;
        md += `  - Old: "${fieldChange.oldValue}"\n`;
        md += `  - New: "${fieldChange.newValue}"\n`;
      });
      md += `\n`;
    });
    
    if (changes.length > 50) {
      md += `\n*... and ${changes.length - 50} more changes*\n`;
    }
  }
  
  md += `\n## Change Log Reference\n\n`;
  md += `Full change details saved to: ${changeLog}\n`;
  
  await fs.writeFile(reportPath, md);
  return reportPath;
}

// OPTION 3: Clean corrupted data from specific date
async function cleanCorruptedData(masterRecords, corruptedDate) {
  console.log(`\n🧹 Cleaning corrupted data from ${corruptedDate}...\n`);
  
  let cleanedCount = 0;
  const cleanedRecords = new Map();
  
  for (const [propertyId, record] of masterRecords.entries()) {
    // Check if this record was last updated on the corrupted date
    if (record._last_updated_date === corruptedDate) {
      // Skip this record (don't add to cleaned records)
      cleanedCount++;
      console.log(`  Removing corrupted record: ${propertyId}`);
    } else {
      // Keep this record
      cleanedRecords.set(propertyId, record);
    }
  }
  
  console.log(`\n✅ Cleaned ${cleanedCount} corrupted records from ${corruptedDate}`);
  
  return cleanedRecords;
}

// Create master CSV with validation
async function createMasterCSVWithValidation(csvDirectory, options = {}) {
  const { validateData = true, cleanDate = null } = options;
  
  console.log('📊 Creating Master CSV with Validation\n');
  console.log(`Options: Validation=${validateData}, Clean Date=${cleanDate}\n`);
  
  try {
    await ensureDirectories();
    
    // Get all CSV files
    const files = await fs.readdir(csvDirectory);
    const csvFiles = files
      .filter(f => f.endsWith('.csv') && !f.includes('master'))
      .map(f => ({
        filename: f,
        path: path.join(csvDirectory, f),
        date: extractDateFromFilename(f)
      }))
      .filter(f => f.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (csvFiles.length === 0) {
      console.log('❌ No CSV files found with extractable dates.');
      return;
    }
    
    console.log(`Found ${csvFiles.length} CSV files to process:\n`);
    csvFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.date} - ${f.filename}`);
    });
    console.log('');
    
    // Master data storage
    const masterRecords = new Map();
    let masterHeaders = new Set();
    const allChanges = [];
    const dailyReports = [];
    
    // Process each file chronologically
    for (const [index, csvFile] of csvFiles.entries()) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing ${index + 1}/${csvFiles.length}: ${csvFile.filename}`);
      console.log(`Date: ${csvFile.date}`);
      
      const fileChanges = [];
      const stats = {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        newRecords: 0,
        updatedRecords: 0,
        unchangedRecords: 0,
        noPropertyId: 0
      };
      
      try {
        const { headers, records, invalidRecords } = await extractRecordsFromCSV(csvFile.path, validateData);
        
        // Add all headers to master set
        headers.forEach(h => masterHeaders.add(h));
        stats.totalRecords = records.length + invalidRecords.length;
        stats.validRecords = records.length;
        stats.invalidRecords = invalidRecords.length;
        
        // Create validation report if there were invalid records
        let validationLog = null;
        if (invalidRecords.length > 0) {
          validationLog = await createValidationReport({
            date: csvFile.date,
            filename: csvFile.filename,
            invalidRecords
          });
          console.log(`\n⚠️  Found ${invalidRecords.length} invalid records - see ${validationLog}`);
        }
        
        // Process valid records
        for (const record of records) {
          const propertyId = getPropertyId(record);
          
          if (!propertyId) {
            stats.noPropertyId++;
            continue;
          }
          
          // Add metadata
          record._last_updated_date = csvFile.date;
          record._last_updated_file = csvFile.filename;
          
          if (!masterRecords.has(propertyId)) {
            // New record
            record._first_seen_date = csvFile.date;
            record._first_seen_file = csvFile.filename;
            record._update_count = 1;
            masterRecords.set(propertyId, record);
            stats.newRecords++;
          } else {
            // Existing record - check for changes
            const existingRecord = masterRecords.get(propertyId);
            const changes = compareRecords(existingRecord, record);
            
            if (changes.length > 0) {
              // Update record
              const updatedRecord = {
                ...existingRecord,
                ...record,
                _first_seen_date: existingRecord._first_seen_date,
                _first_seen_file: existingRecord._first_seen_file,
                _update_count: (existingRecord._update_count || 1) + 1,
                _last_updated_date: csvFile.date,
                _last_updated_file: csvFile.filename
              };
              
              masterRecords.set(propertyId, updatedRecord);
              stats.updatedRecords++;
              
              fileChanges.push({
                propertyId,
                date: csvFile.date,
                file: csvFile.filename,
                changes
              });
              
              allChanges.push({
                propertyId,
                date: csvFile.date,
                file: csvFile.filename,
                changes
              });
            } else {
              stats.unchangedRecords++;
            }
          }
        }
        
        console.log(`\n📊 Statistics:`);
        console.log(`  - Total records: ${stats.totalRecords}`);
        console.log(`  - Valid: ${stats.validRecords}`);
        console.log(`  - Invalid: ${stats.invalidRecords}`);
        console.log(`  - New: ${stats.newRecords}`);
        console.log(`  - Updated: ${stats.updatedRecords}`);
        console.log(`  - Unchanged: ${stats.unchangedRecords}`);
        console.log(`  - No Property ID: ${stats.noPropertyId}`);
        console.log(`  - Master total: ${masterRecords.size}`);
        
        // Save change log for this file
        const changeLogPath = path.join(
          CHANGE_LOGS_DIR, 
          `changes_${csvFile.date}_${csvFile.filename.replace('.csv', '.json')}`
        );
        await fs.writeFile(changeLogPath, JSON.stringify(fileChanges, null, 2));
        
        // Create daily report
        const reportPath = await createDailyReport({
          date: csvFile.date,
          filename: csvFile.filename,
          stats,
          changes: fileChanges,
          changeLog: changeLogPath,
          validationLog
        });
        
        dailyReports.push({
          date: csvFile.date,
          filename: csvFile.filename,
          reportPath
        });
        
        console.log(`\n📄 Daily report: ${reportPath}`);
        
      } catch (error) {
        console.log(`\n❌ Error processing file: ${error.message}`);
      }
    }
    
    // OPTION 3: Clean corrupted data if requested
    let finalRecords = masterRecords;
    if (cleanDate) {
      finalRecords = await cleanCorruptedData(masterRecords, cleanDate);
    }
    
    // Add metadata headers
    masterHeaders.add('_first_seen_date');
    masterHeaders.add('_first_seen_file');
    masterHeaders.add('_last_updated_date');
    masterHeaders.add('_last_updated_file');
    masterHeaders.add('_update_count');
    
    // Write master CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const masterFilePath = path.join(MASTER_DIR, `master_csv_validated_${timestamp}.csv`);
    const masterLatestPath = path.join(MASTER_DIR, 'master_csv_latest_validated.csv');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Writing master CSV file...`);
    
    // Convert master headers Set to Array
    const headersArray = Array.from(masterHeaders);
    
    // Write CSV
    const writeStream = createWriteStream(masterFilePath);
    const stringifier = stringify({
      header: true,
      columns: headersArray
    });
    
    stringifier.pipe(writeStream);
    
    // Write all records
    for (const record of finalRecords.values()) {
      stringifier.write(record);
    }
    
    stringifier.end();
    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Create latest link
    try {
      await fs.unlink(masterLatestPath).catch(() => {});
      await fs.copyFile(masterFilePath, masterLatestPath);
    } catch (error) {
      console.log('  ⚠️  Could not create latest link:', error.message);
    }
    
    console.log('\n✅ Master CSV Creation Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Total unique records: ${finalRecords.size}`);
    console.log(`  - Total changes tracked: ${allChanges.length}`);
    console.log(`  - Files processed: ${csvFiles.length}`);
    console.log(`  - Date range: ${csvFiles[0].date} to ${csvFiles[csvFiles.length - 1].date}`);
    console.log('\n📁 Output files:');
    console.log(`  - Master CSV: ${masterFilePath}`);
    console.log(`  - Latest link: ${masterLatestPath}`);
    console.log(`  - Daily reports: ${DAILY_REPORTS_DIR}`);
    console.log(`  - Validation logs: ${VALIDATION_LOGS_DIR}`);
    console.log(`  - Change logs: ${CHANGE_LOGS_DIR}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  }
}

// Main execution
async function main() {
  const csvDirectory = process.argv[2] || path.join(__dirname, '../../downloads');
  
  // Parse command line options
  let validateData = true;
  let cleanDate = null;
  
  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === '--no-validation') {
      validateData = false;
    } else if (process.argv[i] === '--clean-date' && process.argv[i + 1]) {
      cleanDate = process.argv[i + 1];
      i++; // Skip next argument
    }
  }
  
  console.log(`📁 CSV Directory: ${csvDirectory}\n`);
  
  await createMasterCSVWithValidation(csvDirectory, { validateData, cleanDate });
}

if (require.main === module) {
  main();
}

module.exports = { createMasterCSVWithValidation };