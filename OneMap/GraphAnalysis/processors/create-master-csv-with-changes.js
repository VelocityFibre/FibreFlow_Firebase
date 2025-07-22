#!/usr/bin/env node

/**
 * Master CSV Creator with Change Tracking
 * 
 * Aggregates all daily CSV files into one master file,
 * updating existing records and tracking all changes with detailed daily reports
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

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(MASTER_DIR, { recursive: true });
  await fs.mkdir(DAILY_REPORTS_DIR, { recursive: true });
  await fs.mkdir(CHANGE_LOGS_DIR, { recursive: true });
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

// Create daily processing report
async function createDailyReport(data) {
  const { date, filename, stats, changes, changeLog } = data;
  const reportPath = path.join(DAILY_REPORTS_DIR, `processing_${date}_${filename.replace('.csv', '')}.md`);
  
  let md = `# Daily Processing Report - ${date}\n\n`;
  md += `**File Processed**: ${filename}\n`;
  md += `**Processing Time**: ${new Date().toISOString()}\n\n`;
  
  md += `## Summary Statistics\n\n`;
  md += `- **Total Records in File**: ${stats.totalRecords}\n`;
  md += `- **New Records Added**: ${stats.newRecords}\n`;
  md += `- **Existing Records Updated**: ${stats.updatedRecords}\n`;
  md += `- **Records Unchanged**: ${stats.unchangedRecords}\n`;
  md += `- **Records Without Property ID**: ${stats.noPropertyId}\n\n`;
  
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

// Create master CSV with change tracking
async function createMasterCSVWithChanges(csvDirectory) {
  console.log('📊 Creating Master CSV with Change Tracking\n');
  console.log('This will aggregate all records and track changes over time.\n');
  
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
    const masterRecords = new Map(); // Property ID -> Record
    let masterHeaders = new Set();
    const allChanges = []; // Track all changes across all files
    const dailyReports = []; // Store paths to daily reports
    
    // Process each file chronologically
    for (const [index, csvFile] of csvFiles.entries()) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing ${index + 1}/${csvFiles.length}: ${csvFile.filename}`);
      console.log(`Date: ${csvFile.date}`);
      
      const fileChanges = [];
      const stats = {
        totalRecords: 0,
        newRecords: 0,
        updatedRecords: 0,
        unchangedRecords: 0,
        noPropertyId: 0
      };
      
      try {
        const { headers, records } = await extractRecordsFromCSV(csvFile.path);
        
        // Add all headers to master set
        headers.forEach(h => masterHeaders.add(h));
        stats.totalRecords = records.length;
        
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
          changeLog: changeLogPath
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
    
    // Add metadata headers
    masterHeaders.add('_first_seen_date');
    masterHeaders.add('_first_seen_file');
    masterHeaders.add('_last_updated_date');
    masterHeaders.add('_last_updated_file');
    masterHeaders.add('_update_count');
    
    // Write master CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const masterFilePath = path.join(MASTER_DIR, `master_csv_with_changes_${timestamp}.csv`);
    const masterLatestPath = path.join(MASTER_DIR, 'master_csv_latest.csv');
    
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
    for (const record of masterRecords.values()) {
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
    
    // Generate master summary report
    const summaryPath = await generateMasterSummary({
      timestamp,
      csvFiles,
      masterRecords,
      allChanges,
      dailyReports,
      masterFilePath
    });
    
    console.log('\n✅ Master CSV Creation Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Total unique records: ${masterRecords.size}`);
    console.log(`  - Total changes tracked: ${allChanges.length}`);
    console.log(`  - Files processed: ${csvFiles.length}`);
    console.log(`  - Date range: ${csvFiles[0].date} to ${csvFiles[csvFiles.length - 1].date}`);
    console.log('\n📁 Output files:');
    console.log(`  - Master CSV: ${masterFilePath}`);
    console.log(`  - Latest link: ${masterLatestPath}`);
    console.log(`  - Master summary: ${summaryPath}`);
    console.log(`  - Daily reports: ${DAILY_REPORTS_DIR}`);
    console.log(`  - Change logs: ${CHANGE_LOGS_DIR}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  }
}

// Generate master summary report
async function generateMasterSummary(data) {
  const { timestamp, csvFiles, masterRecords, allChanges, dailyReports, masterFilePath } = data;
  const summaryPath = path.join(MASTER_DIR, `master_summary_${timestamp}.md`);
  
  let md = `# Master CSV Summary Report with Change Tracking\n\n`;
  md += `**Generated**: ${new Date().toISOString()}\n`;
  md += `**Master CSV**: ${path.basename(masterFilePath)}\n\n`;
  
  md += `## Overview\n\n`;
  md += `- **Total Unique Records**: ${masterRecords.size}\n`;
  md += `- **Total Changes Tracked**: ${allChanges.length}\n`;
  md += `- **Files Processed**: ${csvFiles.length}\n`;
  md += `- **Date Range**: ${csvFiles[0].date} to ${csvFiles[csvFiles.length - 1].date}\n\n`;
  
  // Count records by update frequency
  let updateCounts = { 1: 0, 2: 0, 3: 0, '4+': 0 };
  for (const record of masterRecords.values()) {
    const count = record._update_count || 1;
    if (count === 1) updateCounts[1]++;
    else if (count === 2) updateCounts[2]++;
    else if (count === 3) updateCounts[3]++;
    else updateCounts['4+']++;
  }
  
  md += `## Update Frequency Analysis\n\n`;
  md += `| Updates | Record Count | Percentage |\n`;
  md += `|---------|--------------|------------|\n`;
  md += `| 1 (new only) | ${updateCounts[1]} | ${((updateCounts[1] / masterRecords.size) * 100).toFixed(1)}% |\n`;
  md += `| 2 | ${updateCounts[2]} | ${((updateCounts[2] / masterRecords.size) * 100).toFixed(1)}% |\n`;
  md += `| 3 | ${updateCounts[3]} | ${((updateCounts[3] / masterRecords.size) * 100).toFixed(1)}% |\n`;
  md += `| 4+ | ${updateCounts['4+']} | ${((updateCounts['4+'] / masterRecords.size) * 100).toFixed(1)}% |\n`;
  
  md += `\n## Daily Processing Reports\n\n`;
  md += `| Date | File | Report |\n`;
  md += `|------|------|--------|\n`;
  
  dailyReports.forEach(report => {
    const reportLink = path.relative(path.dirname(summaryPath), report.reportPath);
    md += `| ${report.date} | ${report.filename} | [View Report](${reportLink}) |\n`;
  });
  
  md += `\n## Most Frequently Changed Fields\n\n`;
  
  // Count changes by field
  const fieldChangeCounts = {};
  allChanges.forEach(change => {
    change.changes.forEach(fieldChange => {
      fieldChangeCounts[fieldChange.field] = (fieldChangeCounts[fieldChange.field] || 0) + 1;
    });
  });
  
  md += `| Field | Total Changes |\n`;
  md += `|-------|---------------|\n`;
  Object.entries(fieldChangeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([field, count]) => {
      md += `| ${field} | ${count} |\n`;
    });
  
  md += `\n## Usage Instructions\n\n`;
  md += `### Master CSV Contains:\n`;
  md += `- All unique records from all processed files\n`;
  md += `- Latest values for all fields\n`;
  md += `- Metadata tracking:\n`;
  md += `  - **_first_seen_date**: When record first appeared\n`;
  md += `  - **_first_seen_file**: File where first seen\n`;
  md += `  - **_last_updated_date**: Last time record changed\n`;
  md += `  - **_last_updated_file**: Last file with changes\n`;
  md += `  - **_update_count**: Total times record was updated\n\n`;
  
  md += `### Daily Reports Show:\n`;
  md += `- What changed in each file\n`;
  md += `- Field-by-field change tracking\n`;
  md += `- Statistics for each processing run\n\n`;
  
  md += `### Change Logs Contain:\n`;
  md += `- Complete JSON records of all changes\n`;
  md += `- Useful for programmatic analysis\n`;
  
  await fs.writeFile(summaryPath, md);
  
  return summaryPath;
}

// Main execution
async function main() {
  const csvDirectory = process.argv[2] || path.join(__dirname, '../../downloads');
  
  console.log(`📁 CSV Directory: ${csvDirectory}\n`);
  
  await createMasterCSVWithChanges(csvDirectory);
}

if (require.main === module) {
  main();
}

module.exports = { createMasterCSVWithChanges };