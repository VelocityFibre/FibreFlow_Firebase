#!/usr/bin/env node

const Database = require('./src/database');
const XLSX = require('xlsx');
const chalk = require('chalk');
const path = require('path');

async function verifyDataAccuracy() {
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('=== DATA VERIFICATION REPORT ===\n'));
  
  // 1. Confirm we're querying SQL database
  console.log(chalk.yellow('1. Data Source Confirmation:'));
  console.log('   - Source: SQLite Database (onemap.db)');
  console.log('   - Location: ./onemap.db');
  
  const dbStats = await db.get('SELECT COUNT(*) as count FROM status_changes');
  console.log(`   - Total records in SQL: ${dbStats.count}`);
  
  // 2. Cross-reference with original Excel
  console.log(chalk.yellow('\n2. Cross-Reference with Original Excel:'));
  
  const excelPath = path.join(__dirname, '../data/excel/1754473447790_Lawley_01082025.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`   - Excel records: ${excelData.length}`);
  console.log(`   - SQL records: ${dbStats.count}`);
  console.log(`   - Match: ${excelData.length === dbStats.count ? '✓ YES' : '✗ NO'}`);
  
  // 3. Verify specific Home Installation records
  console.log(chalk.yellow('\n3. Verifying Home Installation Records:'));
  
  // Count in Excel
  const excelHomeInstalls = excelData.filter(row => 
    row['Status'] && row['Status'].includes('Home Installation')
  );
  const excelHomeSignups = excelData.filter(row => 
    row['Status'] && row['Status'].includes('Home Sign Ups')
  );
  
  console.log(`   Excel counts:`);
  console.log(`   - Home Installation records: ${excelHomeInstalls.length}`);
  console.log(`   - Home Sign Ups records: ${excelHomeSignups.length}`);
  
  // Count in SQL
  const sqlHomeInstalls = await db.get(
    "SELECT COUNT(*) as count FROM status_changes WHERE status LIKE '%Home Installation%'"
  );
  const sqlHomeSignups = await db.get(
    "SELECT COUNT(*) as count FROM status_changes WHERE status LIKE '%Home Sign Ups%'"
  );
  
  console.log(`   SQL counts:`);
  console.log(`   - Home Installation records: ${sqlHomeInstalls.count}`);
  console.log(`   - Home Sign Ups records: ${sqlHomeSignups.count}`);
  
  // 4. Sample verification - check specific properties
  console.log(chalk.yellow('\n4. Sample Property Verification:'));
  
  // Get 5 properties with installations from SQL
  const sampleProperties = await db.all(`
    SELECT DISTINCT property_id, status
    FROM status_changes
    WHERE status LIKE '%Home Installation%'
    LIMIT 5
  `);
  
  console.log('   Checking first 5 installation properties in both sources:');
  
  for (const prop of sampleProperties) {
    // Check in Excel
    const excelMatch = excelData.find(row => 
      row['Property ID'] == prop.property_id && 
      row['Status'] === prop.status
    );
    
    console.log(`   Property ${prop.property_id}: ${excelMatch ? '✓ Found in Excel' : '✗ Not found in Excel'}`);
  }
  
  // 5. Detailed analysis of installs without signups
  console.log(chalk.yellow('\n5. Detailed Analysis - Installs without SignUps:'));
  
  // Method 1: Check each property individually
  const installProperties = await db.all(`
    SELECT DISTINCT property_id 
    FROM status_changes 
    WHERE status IN ('Home Installation: In Progress', 'Home Installation: Installed')
  `);
  
  const signupProperties = await db.all(`
    SELECT DISTINCT property_id 
    FROM status_changes 
    WHERE status LIKE 'Home Sign Ups:%'
  `);
  
  const signupSet = new Set(signupProperties.map(p => p.property_id));
  const installsWithoutSignups = installProperties.filter(p => !signupSet.has(p.property_id));
  
  console.log(`   Total properties with installations: ${installProperties.length}`);
  console.log(`   Total properties with signups: ${signupProperties.length}`);
  console.log(`   Installations without signups: ${installsWithoutSignups.length}`);
  
  // 6. Check if it's a data structure issue
  console.log(chalk.yellow('\n6. Data Structure Analysis:'));
  
  // Check if same property has multiple records
  const multipleStatuses = await db.all(`
    SELECT property_id, COUNT(*) as record_count, 
           GROUP_CONCAT(status, ' | ') as all_statuses
    FROM status_changes
    WHERE property_id IN (
      SELECT property_id FROM status_changes 
      WHERE status LIKE '%Home Installation%'
    )
    GROUP BY property_id
    ORDER BY record_count DESC
    LIMIT 10
  `);
  
  console.log('   Properties with multiple status records:');
  multipleStatuses.forEach(p => {
    console.log(`   Property ${p.property_id}: ${p.record_count} records`);
    console.log(`     Statuses: ${p.all_statuses}`);
  });
  
  // 7. Export verification data
  console.log(chalk.yellow('\n7. Creating Verification Report...'));
  
  const verificationData = [];
  
  // Add first 20 installs without signups with all their data
  for (const prop of installsWithoutSignups.slice(0, 20)) {
    const records = await db.all(
      'SELECT * FROM status_changes WHERE property_id = ?',
      [prop.property_id]
    );
    
    records.forEach(record => {
      verificationData.push({
        property_id: record.property_id,
        status: record.status,
        pole_number: record.pole_number,
        drop_number: record.drop_number,
        has_signup: 'NO',
        verification_note: 'Has installation but no signup'
      });
    });
  }
  
  // Create Excel report
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(verificationData);
  XLSX.utils.book_append_sheet(wb, ws, 'Verification Data');
  
  const filename = `Data_Verification_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(__dirname, '../reports/', filename);
  
  XLSX.writeFile(wb, filepath);
  console.log(chalk.green(`   ✓ Verification report saved to: ${filepath}`));
  
  await db.close();
}

// Run verification
verifyDataAccuracy().catch(console.error);