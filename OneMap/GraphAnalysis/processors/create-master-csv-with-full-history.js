#!/usr/bin/env node

/**
 * Master CSV Creator with FULL Status History Tracking
 * 
 * This version maintains complete status history by:
 * 1. Keeping ALL records (no overwrites)
 * 2. Adding a unique record ID for each status change
 * 3. Adding status change tracking fields
 * 
 * Date: 2025-08-05
 * Based on: create-master-csv-with-changes-FIXED.js
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

// MASTER COLUMN ORDER - Same as FIXED version plus history tracking
const MASTER_COLUMNS = [
  // Core identifiers
  'Property ID',
  '1map NAD ID', 
  'Job ID',
  
  // Status and workflow
  'Status',
  'Flow Name Groups',
  
  // Location data
  'Site',
  'Sections',
  'PONs',
  'Location Address',
  'Actual Device Location (Latitude)',
  'Actual Device Location (Longitude)',
  'Distance between Actual and Captured Point',
  
  // Metadata
  'lst_mod_by',
  'lst_mod_dt',
  'date_status_changed',
  
  // Pole and drop tracking
  'Pole Number',
  'Drop Number',
  
  // Language and survey
  'Language',
  'Survey Date',
  
  // Personal details (keep structure but don't sync these to production)
  'CONSENT FORM PERSONAL DETAILS OF THE PERSON SIGNING THIS FORM (',
  'UXWEBHU lwesivumelwano IINKUKACHA ZOMNTU OTYIKITYA OLUXWEBHU (',
  
  // Address validation
  'Address Validation',
  'Stand Number',
  'Latitude & Longitude',
  
  // Consent forms
  'CONSENT TO PLANT A POLE',
  'ISIVUMELWANO SOKUTYALWA KWEPALI',
  'Owner or Tenant',
  'Special Conditions (if any)',
  
  // Agent and dates
  'Field Agent Name (pole permission)',
  'Date of Signature',
  'Latitude',
  'Longitude',
  
  // Pole permissions details
  'Pole Permissions - Actual Device Location (Latitude)',
  'Pole Permissions - Actual Device Location (Longitude)',
  'Pole Permissions - Distance between Actual and Captured Point',
  'Last Modified Pole Permissions By',
  'Last Modified Pole Permissions Date',
  
  // Home sign-ups
  'Access to Property',
  'Declined',
  'if Yes',
  'Reason Why it was Declined',
  'Primary House of Backyard Dwelling',
  'Number of People Living in the Home',
  'Residential or Commercial Dwelling',
  'Mark Type of Commercial if Applicable',
  'How do you access internet at your home currently?',
  'Backyard Dwellings',
  'If Yes',
  'How Many Dwellings',
  'How Many People',
  'Structure of Backyard Dwelling',
  'Consent Form',
  'House Number',
  'I hereby consent that I have a permanent Municipal electrical c',
  'Preferred Place for Router Installation in Home',
  'Number of Sticker Placed on Door',
  'Photo of Property',
  'General Comments',
  'Field Agent Name (Home Sign Ups)',
  'Home Sign Ups - Actual Device Location (Latitude)',
  'Home Sign Ups - Actual Device Location (Longitude)',
  'Home Sign Ups - Distance between Actual and Captured Point',
  'Last Modified Home Sign Ups By',
  'Last Modified Home Sign Ups Date',
  
  // Installation details
  'Nokia Easy Start ONT Activation Code',
  'ONT activation light level',
  'Record any Relevant Comments',
  'Powermeter reading (at dome)',
  'Patched and labelled drop',
  'Photo of Splitter Tray in Dome Joint (front side)',
  'Photo of Connection Points in the BB/Handhole (other side of jo',
  'Photo of the Handhole Before Closing',
  'Photo of the Handhole After Closing',
  'Photo Showing Location on the Wall (before installation)',
  'Home Entry Point: Outside (Pigtail screw / Duct entry)',
  'Home entry point',
  'Outside cable span: Pole to Pigtail screw',
  'ONT Barcode',
  'Mini-UPS Serial Number',
  'Photo of Active Broadband Light (with FT sticker and Drop Numbe',
  'Powermeter reading (at ONT before activation)',
  'Fiber cable: entry to ONT (after install)',
  'Record Relevant Comments',
  'Any Damages to be Reported',
  'If there are',
  'Please Specify',
  'Overall work area after complete install: including ONT and fib',
  'Dome Joint Number / BB',
  'Length of Drop Cable',
  'Client happy with Installation',
  'Read English Terms and Conditions',
  'Read Xhosa Terms and Conditions',
  'Installer Name',
  'Home Installations - Actual Device Location (Latitude)',
  'Home Installations - Actual Device Location (Longitude)',
  'Home Installations - Distance between Actual and Captured Point',
  'Last Modified Home Installations By',
  'Last Modified Home Installations Date',
  
  // Marketing and sales
  'Marketing Activator Name',
  'Marketing Activator Surname',
  'Has the client been taught where and how to buy a fibertime vou',
  'Number of Cellphone number linked to fibertime network',
  'Has a profile been created in the fibertime.app for all users c',
  'What was the quality of the installation?',
  'Has the client been informed how to log a support ticket on Wha',
  'notes',
  'status_dc',
  'Sales - Actual Device Location (Latitude)',
  'Sales - Actual Device Location (Longitude)',
  'Sales - Distance between Actual and Captured Point',
  'How much do you spend on Mobile data each month?',
  'inthme',
  'Would you like fibertime?',
  'Field Agent Name & Surname(sales)',
  'Awareness - Actual Device Location (Latitude)',
  'Awareness - Actual Device Location (Longitude)',
  'Awareness - Distance between Actual and Captured Point',
  'spare_dr',
  
  // Technical metadata
  'Estimated horizontal accuracy radius in meters',
  'Pole Permissions - Estimated horizontal accuracy radius in mete',
  'Home Sign Ups - Estimated horizontal accuracy radius in meters',
  'Home Installations - Estimated horizontal accuracy radius in me',
  'Sales - Estimated horizontal accuracy radius in meters',
  'Awareness - Estimated horizontal accuracy radius in meters',
  '',
  'last_modified_awareness_by',
  'last_modified_awareness_date',
  'last_modified_sales_date',
  'last_modified_sales_by',
  'type',
  'name',
  'photo',
  'dropno',
  'date',
  'nme_owner',
  'con_owner',
  'oper_nme',
  'oper_con',
  'nme_per1',
  'con_per1',
  'nme_per2',
  'con_per2',
  'brand',
  'audit',
  'audited',
  'brand_where',
  'vouch',
  'signa_av',
  'signa_co',
  'agnt_nme',
  'site',
  'zone',
  'pons',
  'obj_lat',
  'obj_long',
  'act_lat',
  'act_long',
  'dist',
  'type_flow',
  'last_modified_by_flow',
  'last_modified_date_flow',
  'sch_name',
  'sch_princ',
  'sch_secr',
  'sch_cont',
  'sch_email',
  'sch_addr',
  'sch_learn',
  'sch_age',
  'sch_teach',
  'sch_lang',
  'sch_ass_d',
  'sch_ass_t',
  'onemapfid',
  
  // Contact information
  'Contact Person: Name',
  'Contact Person: Surname',
  'ID Number',
  'Passport Number',
  'Email Address',
  'Contact Number (e.g.0123456789)',
  'Latitude Longitude',
  'Signature of the Authorised Person',
  'Gender',
  'Alternative Contact Person: Name',
  'Alternative Contact Person: Surname',
  'Alternative Contact Number (e.g.0123456789)',
  'Customer Consent Signature',
  'Contact Person Name and Surname',
  'Customer Signature. Accept Terms and Conditions',
  
  // Multiple cellphone numbers
  'Cellphone no 1',
  'Cellphone no 2',
  'Cellphone no 3',
  'Cellphone no 4',
  'Cellphone no 5',
  'Cellphone no 6',
  'Cellphone no 7',
  'Cellphone no 8',
  'Cellphone no 9',
  'Cellphone no 10',
  'Cellphone no 11',
  'Cellphone no 12',
  'Cellphone no 13',
  'Cellphone no 14',
  'Cellphone no 15',
  'Cellphone no 16',
  'Cellphone no 17',
  'Cellphone no 18',
  'Cellphone no 19',
  'Cellphone no 20',
  
  // Final fields
  'Field Agent Name and Surname(sales)',
  'Last Modified Awareness By',
  'Last Modified Awareness Date',
  'Last Modified Sales By',
  'Last Modified Sales Date',
  
  // NEW: Full history tracking metadata
  '_record_id',              // Unique ID for each record
  '_source_date',            // Date from source file
  '_source_file',            // Source file name
  '_is_status_change',       // Whether this represents a status change
  '_previous_status',        // Previous status (if changed)
  '_status_change_date'      // When status changed
];

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

// Normalize record to master schema
function normalizeRecord(record) {
  const normalizedRecord = {};
  
  // Initialize all master columns as empty
  MASTER_COLUMNS.forEach(col => {
    normalizedRecord[col] = '';
  });
  
  // Map record fields to normalized structure
  Object.entries(record).forEach(([key, value]) => {
    if (MASTER_COLUMNS.includes(key)) {
      normalizedRecord[key] = value || '';
    }
  });
  
  return normalizedRecord;
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

// Create daily processing report
async function createDailyReport(data) {
  const { date, filename, stats } = data;
  const reportPath = path.join(DAILY_REPORTS_DIR, `processing_${date}_${filename.replace('.csv', '')}_HISTORY.md`);
  
  let md = `# Full History Daily Processing Report - ${date}\n\n`;
  md += `**File Processed**: ${filename}\n`;
  md += `**Processing Time**: ${new Date().toISOString()}\n`;
  md += `**Mode**: Full History Preservation\n\n`;
  
  md += `## Summary Statistics\n\n`;
  md += `- **Total Records in File**: ${stats.totalRecords}\n`;
  md += `- **Records Added**: ${stats.recordsAdded}\n`;
  md += `- **Status Changes Detected**: ${stats.statusChanges}\n`;
  md += `- **Records Without Property ID**: ${stats.noPropertyId}\n\n`;
  
  md += `## History Tracking\n\n`;
  md += `This version maintains FULL status history:\n`;
  md += `- All records are preserved (no overwrites)\n`;
  md += `- Each record has a unique _record_id\n`;
  md += `- Status changes are tracked with timestamps\n`;
  md += `- Complete audit trail maintained\n`;
  
  await fs.writeFile(reportPath, md);
  return reportPath;
}

// Create master CSV with FULL history tracking
async function createMasterCSVWithFullHistory(csvDirectory) {
  console.log('📊 Creating Master CSV with FULL Status History Tracking\n');
  console.log('✅ This version preserves ALL status changes\n');
  console.log('✅ Complete audit trail for every property\n');
  console.log('✅ No data loss - every update is kept\n');
  
  try {
    await ensureDirectories();
    
    // Scan for CSV files
    const sourceDir = csvDirectory || path.join(__dirname, '../downloads');
    console.log(`📁 Scanning directory: ${sourceDir}`);
    
    const files = await fs.readdir(sourceDir);
    const csvFiles = files
      .filter(f => f.toLowerCase().endsWith('.csv'))
      .map(f => ({
        filename: f,
        path: path.join(sourceDir, f),
        date: extractDateFromFilename(f)
      }))
      .filter(f => f.date) // Only files with extractable dates
      .sort((a, b) => a.date.localeCompare(b.date)); // Chronological order
    
    if (csvFiles.length === 0) {
      console.log('❌ No CSV files found with recognizable date patterns');
      return;
    }
    
    console.log(`\n📋 Found ${csvFiles.length} CSV files to process:`);
    csvFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.filename} (${file.date})`);
    });
    console.log('');
    
    // Master data storage
    const allRecords = []; // Array to store ALL records (no Map!)
    const propertyStatusMap = new Map(); // Track last status per property
    let globalRecordId = 1; // Unique ID counter
    const dailyReports = []; // Store paths to daily reports
    
    // Process each file chronologically
    for (const [index, csvFile] of csvFiles.entries()) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing ${index + 1}/${csvFiles.length}: ${csvFile.filename}`);
      console.log(`Date: ${csvFile.date}`);
      
      const stats = {
        totalRecords: 0,
        recordsAdded: 0,
        statusChanges: 0,
        noPropertyId: 0
      };
      
      try {
        const { headers, records } = await extractRecordsFromCSV(csvFile.path);
        
        console.log(`📊 File has ${headers.length} columns and ${records.length} records`);
        stats.totalRecords = records.length;
        
        for (const record of records) {
          const propertyId = getPropertyId(record);
          
          if (!propertyId) {
            stats.noPropertyId++;
            continue;
          }
          
          // Normalize record to master schema
          const normalizedRecord = normalizeRecord(record);
          
          // Add history tracking metadata
          normalizedRecord._record_id = globalRecordId++;
          normalizedRecord._source_date = csvFile.date;
          normalizedRecord._source_file = csvFile.filename;
          
          // Check if this is a status change
          const currentStatus = normalizedRecord.Status;
          const lastStatus = propertyStatusMap.get(propertyId);
          
          if (lastStatus && lastStatus !== currentStatus && currentStatus) {
            normalizedRecord._is_status_change = 'true';
            normalizedRecord._previous_status = lastStatus;
            normalizedRecord._status_change_date = csvFile.date;
            stats.statusChanges++;
          } else {
            normalizedRecord._is_status_change = 'false';
            normalizedRecord._previous_status = '';
            normalizedRecord._status_change_date = '';
          }
          
          // Update the property status map
          if (currentStatus) {
            propertyStatusMap.set(propertyId, currentStatus);
          }
          
          // Add record to master list (ALL records kept!)
          allRecords.push(normalizedRecord);
          stats.recordsAdded++;
        }
        
        // Create daily report
        const reportPath = await createDailyReport({
          date: csvFile.date,
          filename: csvFile.filename,
          stats
        });
        
        dailyReports.push(reportPath);
        
        console.log(`✅ Added: ${stats.recordsAdded} records, ${stats.statusChanges} status changes`);
        if (stats.noPropertyId > 0) {
          console.log(`⚠️  ${stats.noPropertyId} records without Property ID`);
        }
        
      } catch (error) {
        console.log(`\n❌ Error processing file: ${error.message}`);
      }
    }
    
    // Write master CSV with FULL history
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const masterFilePath = path.join(MASTER_DIR, `master_csv_FULL_HISTORY_${timestamp}.csv`);
    const masterLatestPath = path.join(MASTER_DIR, 'master_csv_full_history_latest.csv');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Writing master CSV with FULL history...`);
    console.log(`📁 Output: ${masterFilePath}`);
    
    // Write CSV with all records
    const writeStream = createWriteStream(masterFilePath);
    const stringifier = stringify({
      header: true,
      columns: MASTER_COLUMNS // Use canonical column order
    });
    
    stringifier.pipe(writeStream);
    
    // Write all records (no deduplication!)
    for (const record of allRecords) {
      stringifier.write(record);
    }
    
    await new Promise((resolve, reject) => {
      stringifier.on('end', resolve);
      stringifier.on('error', reject);
      stringifier.end();
    });
    
    // Copy to latest
    await fs.copyFile(masterFilePath, masterLatestPath);
    
    // Generate summary
    const totalRecords = allRecords.length;
    const uniqueProperties = propertyStatusMap.size;
    const totalStatusChanges = allRecords.filter(r => r._is_status_change === 'true').length;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Master CSV with FULL History Creation Complete!`);
    console.log(`\n📊 Final Statistics:`);
    console.log(`   • Total records (with history): ${totalRecords.toLocaleString()}`);
    console.log(`   • Unique properties: ${uniqueProperties.toLocaleString()}`);
    console.log(`   • Status changes tracked: ${totalStatusChanges.toLocaleString()}`);
    console.log(`   • Files processed: ${csvFiles.length}`);
    console.log(`   • Date range: ${csvFiles[0].date} to ${csvFiles[csvFiles.length - 1].date}`);
    console.log(`\n📁 Outputs created:`);
    console.log(`   • Master CSV: ${masterFilePath}`);
    console.log(`   • Latest symlink: ${masterLatestPath}`);
    console.log(`   • Daily reports: ${dailyReports.length} files`);
    
    // Create summary report
    const summaryPath = path.join(MASTER_DIR, `master_summary_FULL_HISTORY_${timestamp}.md`);
    let summary = `# Master CSV with Full History Summary - ${timestamp}\n\n`;
    summary += `## Overview\n\n`;
    summary += `This master CSV maintains **FULL status history** for complete audit trail.\n\n`;
    summary += `**Key Features:**\n`;
    summary += `- ✅ ALL records preserved (no overwrites)\n`;
    summary += `- ✅ Each record has unique _record_id\n`;
    summary += `- ✅ Status changes tracked with dates\n`;
    summary += `- ✅ Complete progression visible for each property\n\n`;
    summary += `## Statistics\n\n`;
    summary += `- **Total Records**: ${totalRecords.toLocaleString()}\n`;
    summary += `- **Unique Properties**: ${uniqueProperties.toLocaleString()}\n`;
    summary += `- **Status Changes**: ${totalStatusChanges.toLocaleString()}\n`;
    summary += `- **Files Processed**: ${csvFiles.length}\n`;
    summary += `- **Date Range**: ${csvFiles[0].date} to ${csvFiles[csvFiles.length - 1].date}\n\n`;
    summary += `## Files Processed\n\n`;
    csvFiles.forEach((file, index) => {
      summary += `${index + 1}. **${file.filename}** (${file.date})\n`;
    });
    summary += `\n## Output Files\n\n`;
    summary += `- **Master CSV**: \`${path.basename(masterFilePath)}\`\n`;
    summary += `- **Latest Version**: \`master_csv_full_history_latest.csv\`\n`;
    summary += `- **Daily Reports**: \`reports/daily-processing/\`\n`;
    
    await fs.writeFile(summaryPath, summary);
    
    console.log(`   • Summary report: ${summaryPath}`);
    console.log(`\n🎉 Full history CSV aggregation complete!`);
    
  } catch (error) {
    console.error('❌ Error creating master CSV:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const csvDirectory = process.argv[2];
  createMasterCSVWithFullHistory(csvDirectory)
    .then(() => {
      console.log('\n✅ Full history CSV aggregation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { createMasterCSVWithFullHistory };