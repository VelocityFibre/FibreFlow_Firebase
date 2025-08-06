#!/usr/bin/env node

const XLSX = require('xlsx');
const Database = require('./src/database');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

async function analyzeBeforeImport(filename) {
  if (!filename) {
    console.error(chalk.red('Please provide filename as argument'));
    process.exit(1);
  }
  
  const filepath = path.join(__dirname, '../data/excel/', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(chalk.red(`File not found: ${filepath}`));
    process.exit(1);
  }
  
  console.log(chalk.cyan('=== PRE-IMPORT ANALYSIS ==='));
  console.log(chalk.gray(`File: ${filename}\n`));
  
  // Read new Excel file
  console.log(chalk.yellow('1. Reading new Excel file...'));
  const workbook = XLSX.readFile(filepath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const newData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`   Total records in new file: ${newData.length}`);
  
  // Analyze status distribution
  const statusCounts = {};
  const propertyIds = new Set();
  const poleNumbers = new Set();
  const dropNumbers = new Set();
  
  newData.forEach(row => {
    const status = row['Status'] || 'BLANK';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    if (row['Property ID']) propertyIds.add(row['Property ID']);
    if (row['Pole Number']) poleNumbers.add(row['Pole Number']);
    if (row['Drop Number']) dropNumbers.add(row['Drop Number']);
  });
  
  console.log(`   Unique properties: ${propertyIds.size}`);
  console.log(`   Unique poles: ${poleNumbers.size}`);
  console.log(`   Unique drops: ${dropNumbers.size}`);
  
  console.log('\n   Status distribution:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
  
  // Connect to database
  const db = new Database();
  await db.initialize();
  
  // Compare with existing data
  console.log(chalk.yellow('\n2. Comparing with existing database...'));
  
  const existingStats = await db.get(`
    SELECT 
      COUNT(DISTINCT property_id) as properties,
      COUNT(DISTINCT pole_number) as poles,
      COUNT(DISTINCT drop_number) as drops,
      COUNT(*) as total_records
    FROM status_changes
  `);
  
  console.log('   Existing database:');
  console.log(`     Total records: ${existingStats.total_records}`);
  console.log(`     Properties: ${existingStats.properties}`);
  console.log(`     Poles: ${existingStats.poles}`);
  console.log(`     Drops: ${existingStats.drops}`);
  
  // Check for potential duplicates
  console.log(chalk.yellow('\n3. Checking for potential duplicates...'));
  
  let exactDuplicates = 0;
  let statusChanges = 0;
  let newProperties = 0;
  
  // Sample check (first 1000 records for performance)
  const sampleSize = Math.min(1000, newData.length);
  console.log(`   Sampling ${sampleSize} records...`);
  
  for (let i = 0; i < sampleSize; i++) {
    const row = newData[i];
    const propertyId = row['Property ID'];
    const status = row['Status'];
    const dateChanged = row['date_status_changed'];
    
    if (propertyId) {
      // Check if property exists
      const existing = await db.get(
        'SELECT property_id, status, status_date FROM status_changes WHERE property_id = ?',
        [propertyId]
      );
      
      if (!existing) {
        newProperties++;
      } else if (existing.status === status) {
        exactDuplicates++;
      } else {
        statusChanges++;
      }
    }
  }
  
  const multiplier = newData.length / sampleSize;
  console.log(`\n   Based on sample analysis (estimated for full file):`);
  console.log(`     New properties: ~${Math.round(newProperties * multiplier)}`);
  console.log(`     Exact duplicates: ~${Math.round(exactDuplicates * multiplier)}`);
  console.log(`     Status changes: ~${Math.round(statusChanges * multiplier)}`);
  
  // Find specific status changes
  console.log(chalk.yellow('\n4. Identifying specific changes...'));
  
  const changedProperties = [];
  let checkedCount = 0;
  
  for (const row of newData) {
    const propertyId = row['Property ID'];
    const newStatus = row['Status'];
    
    if (propertyId && newStatus) {
      const existing = await db.get(
        'SELECT property_id, status, pole_number, drop_number FROM status_changes WHERE property_id = ?',
        [propertyId]
      );
      
      if (existing && existing.status !== newStatus) {
        changedProperties.push({
          property_id: propertyId,
          pole_number: row['Pole Number'] || existing.pole_number,
          old_status: existing.status,
          new_status: newStatus,
          date_changed: row['date_status_changed']
        });
        
        if (changedProperties.length >= 20) break; // Show first 20 changes
      }
      
      checkedCount++;
      if (checkedCount % 1000 === 0) {
        process.stdout.write(`\r   Checked ${checkedCount} records...`);
      }
    }
  }
  
  console.log(`\n\n   Sample of status changes found:`);
  changedProperties.forEach((change, i) => {
    console.log(`\n   ${i + 1}. Property: ${change.property_id}`);
    console.log(`      Pole: ${change.pole_number || 'N/A'}`);
    console.log(`      Old Status: ${change.old_status}`);
    console.log(`      New Status: ${change.new_status}`);
    console.log(`      Date Changed: ${change.date_changed}`);
  });
  
  // Date range analysis
  console.log(chalk.yellow('\n5. Date range analysis...'));
  
  const dates = newData
    .map(row => row['date_status_changed'])
    .filter(date => date)
    .map(date => new Date(date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a - b);
  
  if (dates.length > 0) {
    console.log(`   Earliest date: ${dates[0].toISOString()}`);
    console.log(`   Latest date: ${dates[dates.length - 1].toISOString()}`);
    console.log(`   Date span: ${Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))} days`);
  }
  
  // Generate summary
  console.log(chalk.green('\n=== IMPORT RECOMMENDATION ===\n'));
  
  if (statusChanges > 0) {
    console.log(chalk.yellow('⚠️  Status changes detected!'));
    console.log('   You should import this file WITH status tracking enabled.');
    console.log('   This will create a history of status changes.');
  }
  
  if (exactDuplicates > newProperties) {
    console.log(chalk.red('⚠️  High duplicate ratio!'));
    console.log('   Most records already exist. Consider incremental import.');
  }
  
  if (newProperties > 0) {
    console.log(chalk.green('✓  New properties found'));
    console.log('   These will be added to the database.');
  }
  
  console.log('\nRecommended command:');
  console.log(chalk.cyan(`node scripts/import-with-tracking.js ${filename}`));
  
  await db.close();
}

// Get filename from command line
const filename = process.argv[2];
analyzeBeforeImport(filename).catch(console.error);