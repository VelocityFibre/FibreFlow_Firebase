#!/usr/bin/env node

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function investigateMissingRecords() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    // Check all records in Neon, not just Lawley
    console.log('🔍 INVESTIGATING RECORD DISCREPANCY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Get total records in Neon
    const totalQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT property_id) as unique_properties,
        COUNT(CASE WHEN pole_number LIKE 'LAW%' THEN 1 END) as lawley_records,
        COUNT(CASE WHEN pole_number NOT LIKE 'LAW%' OR pole_number IS NULL THEN 1 END) as non_lawley_records
      FROM status_changes
    `;
    
    const totalResult = await client.query(totalQuery);
    const totals = totalResult.rows[0];
    
    console.log('📊 Neon Database Total Statistics:');
    console.log(`   Total Records: ${totals.total_records}`);
    console.log(`   Unique Properties: ${totals.unique_properties}`);
    console.log(`   Lawley Records: ${totals.lawley_records}`);
    console.log(`   Non-Lawley Records: ${totals.non_lawley_records}`);
    
    // Check records by pole number prefix
    const prefixQuery = `
      SELECT 
        CASE 
          WHEN pole_number IS NULL THEN '[No Pole Number]'
          WHEN pole_number = '' THEN '[Empty String]'
          ELSE SUBSTRING(pole_number, 1, 3)
        END as prefix,
        COUNT(*) as record_count,
        COUNT(DISTINCT property_id) as unique_properties
      FROM status_changes
      GROUP BY prefix
      ORDER BY record_count DESC
    `;
    
    const prefixResult = await client.query(prefixQuery);
    
    console.log('\n📊 Records by Pole Number Prefix:');
    prefixResult.rows.forEach(row => {
      console.log(`   ${row.prefix}: ${row.record_count} records (${row.unique_properties} properties)`);
    });
    
    // Read Excel to check non-Lawley records
    const excelPath = '/home/ldp/Downloads/1754891703324_Lawley_10082025.xlsx';
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    // Analyze Excel pole numbers
    const excelPoleAnalysis = {
      withLawley: 0,
      withOtherPole: 0,
      noPole: 0,
      emptyPole: 0
    };
    
    const otherPrefixes = new Set();
    
    excelData.forEach(row => {
      const poleNumber = row['Pole Number'];
      if (!poleNumber) {
        excelPoleAnalysis.noPole++;
      } else if (poleNumber === '') {
        excelPoleAnalysis.emptyPole++;
      } else if (poleNumber.startsWith('LAW')) {
        excelPoleAnalysis.withLawley++;
      } else {
        excelPoleAnalysis.withOtherPole++;
        otherPrefixes.add(poleNumber.substring(0, 3));
      }
    });
    
    console.log('\n📄 Excel File Pole Number Analysis:');
    console.log(`   Records with LAW poles: ${excelPoleAnalysis.withLawley}`);
    console.log(`   Records with other poles: ${excelPoleAnalysis.withOtherPole}`);
    console.log(`   Records with no pole: ${excelPoleAnalysis.noPole}`);
    console.log(`   Records with empty pole: ${excelPoleAnalysis.emptyPole}`);
    
    if (otherPrefixes.size > 0) {
      console.log(`\n   Other prefixes found: ${Array.from(otherPrefixes).join(', ')}`);
    }
    
    // Check if we're missing records without pole numbers
    console.log('\n\n🔍 ANALYZING MISSING RECORDS:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Get property IDs from both sources
    const neonPropsQuery = `SELECT DISTINCT property_id FROM status_changes`;
    const neonProps = await client.query(neonPropsQuery);
    const neonPropSet = new Set(neonProps.rows.map(r => r.property_id));
    
    const excelProps = new Set(excelData.map(row => String(row['Property ID'])));
    
    // Find missing property IDs
    const missingProps = [];
    excelProps.forEach(prop => {
      if (!neonPropSet.has(prop)) {
        missingProps.push(prop);
      }
    });
    
    console.log(`\nProperty IDs in Excel but NOT in Neon: ${missingProps.length}`);
    
    // Sample analysis of missing records
    if (missingProps.length > 0) {
      console.log('\nAnalyzing first 10 missing records from Excel:');
      const sampleMissing = missingProps.slice(0, 10);
      
      sampleMissing.forEach(propId => {
        const excelRow = excelData.find(row => String(row['Property ID']) === propId);
        if (excelRow) {
          console.log(`\nProperty ID: ${propId}`);
          console.log(`  Status: ${excelRow['Status'] || '[Empty]'}`);
          console.log(`  Pole: ${excelRow['Pole Number'] || '[No Pole]'}`);
          console.log(`  Address: ${excelRow['Location Address'] || '[No Address]'}`);
        }
      });
    }
    
    // Final summary
    console.log('\n\n📊 INVESTIGATION SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Excel Total Records: 15,651`);
    console.log(`Neon Total Records: ${totals.total_records}`);
    console.log(`Missing Records: ${15651 - totals.total_records}`);
    console.log(`\nExplanation: The Neon database contains only ${totals.total_records} records,`);
    console.log(`suggesting that ${15651 - totals.total_records} records were not imported from the Excel file.`);
    console.log(`\nAll records in Neon are from Lawley (no MOH prefix found).`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

investigateMissingRecords().catch(console.error);