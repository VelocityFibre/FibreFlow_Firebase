#!/usr/bin/env node

const XLSX = require('xlsx');
const Database = require('./src/database');
const chalk = require('chalk');
const path = require('path');

async function showColumnMapping() {
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('=== EXCEL TO SQL COLUMN MAPPING ANALYSIS ===\n'));
  
  // Read Excel to get original column names
  const excelPath = path.join(__dirname, '../data/excel/1754473447790_Lawley_01082025.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const excelColumns = excelData[0]; // First row contains headers
  
  console.log(chalk.yellow('Total Excel Columns: ' + excelColumns.length + '\n'));
  
  // Get SQL table structure
  const sqlColumns = await db.getTableInfo('status_changes');
  
  console.log(chalk.green('SQL Table Columns:'));
  sqlColumns.forEach(col => {
    if (!['id', 'created_at', 'import_batch_id', 'source_row', 'raw_data'].includes(col.name)) {
      console.log(`  - ${col.name} (${col.type})`);
    }
  });
  
  // Show current mapping from excel-importer.js
  const mappedColumns = {
    'property id': 'property_id',
    'propertyid': 'property_id',
    'property_id': 'property_id',
    
    'pole number': 'pole_number',
    'polenumber': 'pole_number',
    'pole_number': 'pole_number',
    'pole': 'pole_number',
    
    'drop number': 'drop_number',
    'dropnumber': 'drop_number',
    'drop_number': 'drop_number',
    'drop': 'drop_number',
    
    'status': 'status',
    'current status': 'status',
    'status description': 'status',
    
    'date': 'status_date',
    'date changed': 'status_date',
    'status date': 'status_date',
    'status_date': 'status_date',
    'datetime': 'status_date',
    'timestamp': 'status_date',
    
    'agent': 'agent',
    'user': 'agent',
    'changed by': 'agent',
    'updated by': 'agent',
    
    'address': 'address',
    'location': 'address',
    'site address': 'address',
    
    'latitude': 'location_lat',
    'lat': 'location_lat',
    
    'longitude': 'location_lng',
    'lng': 'location_lng',
    'lon': 'location_lng',
    
    'zone': 'zone',
    'feeder': 'feeder',
    'distribution': 'distribution',
    'pon': 'pon',
    'project': 'project',
    'contractor': 'contractor'
  };
  
  console.log(chalk.yellow('\n=== MAPPING PROBLEMS ===\n'));
  
  // Critical unmapped fields
  const criticalUnmapped = [
    'date_status_changed',
    'lst_mod_dt',
    'Field Agent Name (pole permission)',
    'Field Agent Name (Home Sign Ups)',
    'Field Agent Name and Surname(sales)',
    'Installer Name',
    'Location Address',
    'PONs'
  ];
  
  console.log(chalk.red('Critical Fields NOT Mapped:'));
  excelColumns.forEach((col, index) => {
    const normalized = col.toLowerCase().trim();
    if (!mappedColumns[normalized] && criticalUnmapped.some(c => col.includes(c))) {
      console.log(`  ❌ "${col}" → NOT MAPPED`);
    }
  });
  
  console.log(chalk.yellow('\n=== CORRECT MAPPING NEEDED ===\n'));
  
  // Show what should be mapped
  console.log('Date fields that should map to status_date:');
  console.log('  - "date_status_changed" → status_date');
  console.log('  - "lst_mod_dt" → status_date (if date_status_changed is empty)');
  
  console.log('\nAgent fields that should map to agent:');
  console.log('  - "Field Agent Name (pole permission)" → agent');
  console.log('  - "Field Agent Name (Home Sign Ups)" → agent');
  console.log('  - "Installer Name" → agent');
  console.log('  - "Field Agent Name and Surname(sales)" → agent');
  
  console.log('\nAddress field:');
  console.log('  - "Location Address" → address');
  
  console.log('\nOther important fields:');
  console.log('  - "PONs" → pon');
  
  // Create a sample query showing the impact
  console.log(chalk.yellow('\n=== IMPACT OF MISSING MAPPINGS ===\n'));
  
  // Check how many records have NULL in critical fields
  const nullChecks = await db.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status_date IS NULL THEN 1 END) as missing_date,
      COUNT(CASE WHEN agent IS NULL THEN 1 END) as missing_agent,
      COUNT(CASE WHEN address IS NULL THEN 1 END) as missing_address
    FROM status_changes
  `);
  
  console.log('Records with missing data due to poor mapping:');
  console.log(`  - Missing dates: ${nullChecks.missing_date} (${(nullChecks.missing_date/nullChecks.total*100).toFixed(1)}%)`);
  console.log(`  - Missing agents: ${nullChecks.missing_agent} (${(nullChecks.missing_agent/nullChecks.total*100).toFixed(1)}%)`);
  console.log(`  - Missing addresses: ${nullChecks.missing_address} (${(nullChecks.missing_address/nullChecks.total*100).toFixed(1)}%)`);
  
  // Show sample of raw data to see what we're missing
  console.log(chalk.yellow('\n=== SAMPLE RAW DATA ===\n'));
  
  const sampleRecord = await db.get(`
    SELECT raw_data FROM status_changes 
    WHERE status LIKE '%Home Installation%' 
    LIMIT 1
  `);
  
  if (sampleRecord && sampleRecord.raw_data) {
    const rawData = JSON.parse(sampleRecord.raw_data);
    console.log('Sample record showing unmapped fields:');
    console.log(`  date_status_changed: ${rawData['date_status_changed'] || 'NULL'}`);
    console.log(`  Field Agent Name (pole permission): ${rawData['Field Agent Name (pole permission)'] || 'NULL'}`);
    console.log(`  Location Address: ${rawData['Location Address'] || 'NULL'}`);
    console.log(`  lst_mod_dt: ${rawData['lst_mod_dt'] || 'NULL'}`);
  }
  
  await db.close();
}

// Run the analysis
showColumnMapping().catch(console.error);