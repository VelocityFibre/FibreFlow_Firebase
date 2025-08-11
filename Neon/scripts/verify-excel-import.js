#!/usr/bin/env node

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function verifyExcelImport() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Check the latest Lawley Excel file
    const excelPath = '/home/ldp/Downloads/1754891703324_Lawley_10082025.xlsx';
    console.log(`📄 Reading Excel file: ${path.basename(excelPath)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Excel File Summary:`);
    console.log(`   Sheet Name: ${sheetName}`);
    console.log(`   Total Rows: ${excelData.length}`);
    
    // Get column names from Excel
    const excelColumns = Object.keys(excelData[0] || {});
    console.log(`   Total Columns: ${excelColumns.length}\n`);
    
    // Display first few columns
    console.log('📋 Excel Column Names (first 20):');
    excelColumns.slice(0, 20).forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col}`);
    });
    
    // Count unique values in key fields
    const uniquePropertyIds = new Set();
    const uniquePoleNumbers = new Set();
    const uniqueDropNumbers = new Set();
    const statusCounts = {};
    
    excelData.forEach(row => {
      if (row['Property ID']) uniquePropertyIds.add(row['Property ID']);
      if (row['Pole Number']) uniquePoleNumbers.add(row['Pole Number']);
      if (row['Drop Number']) uniqueDropNumbers.add(row['Drop Number']);
      
      const status = row['Status'] || '[Empty]';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\n📊 Excel Data Analysis:');
    console.log(`   Unique Property IDs: ${uniquePropertyIds.size}`);
    console.log(`   Unique Pole Numbers: ${uniquePoleNumbers.size}`);
    console.log(`   Unique Drop Numbers: ${uniqueDropNumbers.size}`);
    
    console.log('\n📈 Excel Status Distribution:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    
    // Now compare with Neon database
    console.log('\n\n🔄 COMPARING WITH NEON DATABASE:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Get Neon statistics
    const neonStatsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT property_id) as unique_properties,
        COUNT(DISTINCT pole_number) as unique_poles,
        COUNT(DISTINCT drop_number) as unique_drops
      FROM status_changes
      WHERE pole_number LIKE 'LAW%'
    `;
    
    const neonStats = await client.query(neonStatsQuery);
    const stats = neonStats.rows[0];
    
    console.log('📊 Neon Database Summary:');
    console.log(`   Total Records: ${stats.total_records}`);
    console.log(`   Unique Property IDs: ${stats.unique_properties}`);
    console.log(`   Unique Pole Numbers: ${stats.unique_poles}`);
    console.log(`   Unique Drop Numbers: ${stats.unique_drops}`);
    
    // Check column mapping
    console.log('\n\n🔍 VERIFYING COLUMN MAPPING:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Sample a record from Excel and find it in Neon
    const sampleExcelRow = excelData.find(row => row['Pole Number'] && row['Pole Number'].startsWith('LAW'));
    if (sampleExcelRow) {
      const poleNumber = sampleExcelRow['Pole Number'];
      console.log(`\n📌 Sample Record - Pole: ${poleNumber}`);
      
      // Get the same record from Neon
      const neonQuery = `
        SELECT * FROM status_changes 
        WHERE pole_number = $1 
        LIMIT 1
      `;
      const neonResult = await client.query(neonQuery, [poleNumber]);
      
      if (neonResult.rows.length > 0) {
        const neonRow = neonResult.rows[0];
        
        console.log('\nColumn Mapping Verification:');
        console.log('Excel Field → Neon Field → Match?');
        console.log('─────────────────────────────────────────────────');
        
        const mappings = [
          ['Property ID', 'property_id'],
          ['Pole Number', 'pole_number'],
          ['Drop Number', 'drop_number'],
          ['Status', 'status'],
          ['Address', 'address'],
          ['Zone', 'zone'],
          ['PON', 'pon'],
          ['Agent Name', 'agent_name'],
          ['Permission Date', 'permission_date'],
          ['Signup Date', 'signup_date']
        ];
        
        mappings.forEach(([excelCol, neonCol]) => {
          const excelValue = sampleExcelRow[excelCol] || '[NULL]';
          const neonValue = neonRow[neonCol] || '[NULL]';
          const match = excelValue.toString() === neonValue.toString() ? '✅' : '❌';
          console.log(`${excelCol} → ${neonCol}: ${match}`);
          if (match === '❌') {
            console.log(`  Excel: "${excelValue}"`);
            console.log(`  Neon: "${neonValue}"`);
          }
        });
      }
    }
    
    // Check for missing records
    console.log('\n\n🔍 CHECKING FOR MISSING RECORDS:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Get all pole numbers from Neon
    const neonPolesQuery = `
      SELECT DISTINCT pole_number 
      FROM status_changes 
      WHERE pole_number LIKE 'LAW%'
    `;
    const neonPoles = await client.query(neonPolesQuery);
    const neonPoleSet = new Set(neonPoles.rows.map(r => r.pole_number));
    
    // Check for poles in Excel but not in Neon
    const missingInNeon = [];
    uniquePoleNumbers.forEach(pole => {
      if (pole && !neonPoleSet.has(pole)) {
        missingInNeon.push(pole);
      }
    });
    
    console.log(`\nPoles in Excel but NOT in Neon: ${missingInNeon.length}`);
    if (missingInNeon.length > 0 && missingInNeon.length <= 10) {
      missingInNeon.forEach(pole => console.log(`  - ${pole}`));
    }
    
    // Summary
    console.log('\n\n📊 IMPORT VERIFICATION SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Excel Rows: ${excelData.length}`);
    console.log(`Neon Records: ${stats.total_records}`);
    console.log(`Difference: ${Math.abs(excelData.length - stats.total_records)}`);
    
    if (Math.abs(excelData.length - stats.total_records) < 100) {
      console.log('\n✅ Import appears SUCCESSFUL - record counts are very close');
    } else {
      console.log('\n⚠️  Significant difference in record counts - needs investigation');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyExcelImport().catch(console.error);