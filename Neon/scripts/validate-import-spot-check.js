#!/usr/bin/env node

/**
 * Spot Check Validation Script
 * Compares random samples from Excel files against Neon database
 * to ensure data integrity after import
 */

const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

// Excel files to validate
const filesToValidate = [
  '/home/ldp/Downloads/1755237660935_Lawley_14082025.xlsx',
  '/home/ldp/Downloads/1755499735778_Lawley_15082025.xlsx',
  '/home/ldp/Downloads/1755501709548_Lawley_16082025.xlsx',
  '/home/ldp/Downloads/1755501818814_Lawley_17082025.xlsx',
  '/home/ldp/Downloads/1755584665096_Lawley_18082025.xlsx'
];

async function validateImports() {
  const sql = neon(connectionString);
  
  console.log('🔍 IMPORT VALIDATION - SPOT CHECK REPORT');
  console.log('=' .repeat(60));
  console.log(`Validation Date: ${new Date().toISOString()}`);
  console.log(`Files to Validate: ${filesToValidate.length}\n`);
  
  let totalChecks = 0;
  let totalMatches = 0;
  let totalMismatches = 0;
  const mismatches = [];
  
  for (const filePath of filesToValidate) {
    const filename = path.basename(filePath);
    console.log(`\n📄 Validating: ${filename}`);
    console.log('─'.repeat(60));
    
    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Get random samples (5% or max 50 records)
      const sampleSize = Math.min(50, Math.ceil(data.length * 0.05));
      const samples = [];
      const usedIndices = new Set();
      
      while (samples.length < sampleSize) {
        const index = Math.floor(Math.random() * data.length);
        if (!usedIndices.has(index) && data[index]['Property ID']) {
          usedIndices.add(index);
          samples.push(data[index]);
        }
      }
      
      console.log(`📊 Sample Size: ${samples.length} records (from ${data.length} total)`);
      
      // Validate each sample
      let fileMatches = 0;
      let fileMismatches = 0;
      
      for (const sample of samples) {
        const propertyId = sample['Property ID'];
        const excelStatus = sample['Status'];
        const excelPole = sample['Pole Number'] || null;
        const excelDrop = sample['Drop Number'] || null;
        const excelAddress = sample['Location Address'] || null;
        
        // Query database
        const dbRecords = await sql`
          SELECT property_id, status, pole_number, drop_number, address
          FROM status_changes
          WHERE property_id = ${propertyId}
        `;
        
        totalChecks++;
        
        if (dbRecords.length === 0) {
          // Record not found
          totalMismatches++;
          fileMismatches++;
          mismatches.push({
            file: filename,
            propertyId,
            issue: 'NOT_FOUND',
            excel: { status: excelStatus, pole: excelPole },
            database: null
          });
        } else {
          const dbRecord = dbRecords[0];
          
          // Check if values match
          const statusMatch = dbRecord.status === excelStatus;
          const poleMatch = (dbRecord.pole_number || null) === excelPole;
          const dropMatch = (dbRecord.drop_number || null) === excelDrop;
          
          if (statusMatch && poleMatch && dropMatch) {
            totalMatches++;
            fileMatches++;
          } else {
            totalMismatches++;
            fileMismatches++;
            mismatches.push({
              file: filename,
              propertyId,
              issue: 'VALUE_MISMATCH',
              excel: { 
                status: excelStatus, 
                pole: excelPole,
                drop: excelDrop
              },
              database: {
                status: dbRecord.status,
                pole: dbRecord.pole_number,
                drop: dbRecord.drop_number
              }
            });
          }
        }
      }
      
      // File summary
      const matchRate = ((fileMatches / samples.length) * 100).toFixed(1);
      console.log(`\n✅ Matches: ${fileMatches}/${samples.length} (${matchRate}%)`);
      if (fileMismatches > 0) {
        console.log(`❌ Mismatches: ${fileMismatches}`);
      }
      
    } catch (error) {
      console.error(`❌ Error validating ${filename}: ${error.message}`);
    }
  }
  
  // Overall summary
  console.log('\n\n📊 VALIDATION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`✅ Matches: ${totalMatches} (${((totalMatches/totalChecks)*100).toFixed(1)}%)`);
  console.log(`❌ Mismatches: ${totalMismatches} (${((totalMismatches/totalChecks)*100).toFixed(1)}%)`);
  
  // Show mismatches detail
  if (mismatches.length > 0) {
    console.log('\n\n⚠️  MISMATCH DETAILS (First 10)');
    console.log('─'.repeat(80));
    
    mismatches.slice(0, 10).forEach(m => {
      console.log(`\nFile: ${m.file}`);
      console.log(`Property ID: ${m.propertyId}`);
      console.log(`Issue: ${m.issue}`);
      
      if (m.issue === 'NOT_FOUND') {
        console.log(`  Excel Status: ${m.excel.status}`);
        console.log(`  Database: RECORD NOT FOUND`);
      } else {
        console.log(`  Excel   → Status: ${m.excel.status}, Pole: ${m.excel.pole}, Drop: ${m.excel.drop}`);
        console.log(`  Database → Status: ${m.database.status}, Pole: ${m.database.pole}, Drop: ${m.database.drop}`);
      }
    });
    
    if (mismatches.length > 10) {
      console.log(`\n... and ${mismatches.length - 10} more mismatches`);
    }
  }
  
  // Data quality check
  console.log('\n\n📈 DATA QUALITY ASSESSMENT');
  console.log('─'.repeat(60));
  
  const matchRate = (totalMatches / totalChecks * 100).toFixed(1);
  if (matchRate >= 99) {
    console.log(`✅ EXCELLENT: ${matchRate}% match rate - Data integrity verified!`);
  } else if (matchRate >= 95) {
    console.log(`⚠️  GOOD: ${matchRate}% match rate - Minor discrepancies found`);
  } else if (matchRate >= 90) {
    console.log(`⚠️  FAIR: ${matchRate}% match rate - Some issues need investigation`);
  } else {
    console.log(`❌ POOR: ${matchRate}% match rate - Significant issues detected!`);
  }
  
  // Save validation report
  const report = {
    validationDate: new Date().toISOString(),
    filesValidated: filesToValidate.length,
    totalChecks,
    totalMatches,
    totalMismatches,
    matchRate: parseFloat(matchRate),
    mismatches: mismatches.slice(0, 50) // Save first 50 for analysis
  };
  
  const reportPath = path.join(__dirname, '..', 'logs', `validation-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Full report saved to: ${reportPath}`);
  
  // Check for specific patterns
  console.log('\n\n🔍 PATTERN ANALYSIS');
  console.log('─'.repeat(60));
  
  // Check if mismatches are from specific dates
  const mismatchesByFile = {};
  mismatches.forEach(m => {
    mismatchesByFile[m.file] = (mismatchesByFile[m.file] || 0) + 1;
  });
  
  console.log('Mismatches by file:');
  Object.entries(mismatchesByFile).forEach(([file, count]) => {
    console.log(`  ${file}: ${count} mismatches`);
  });
  
  // Check if mismatches are status-related
  const statusMismatches = mismatches.filter(m => 
    m.issue === 'VALUE_MISMATCH' && m.excel.status !== m.database?.status
  );
  
  if (statusMismatches.length > 0) {
    console.log(`\n⚠️  ${statusMismatches.length} status mismatches found`);
    console.log('This might indicate status updates not being applied correctly.');
  }
  
  return matchRate;
}

// Run validation
validateImports()
  .then(matchRate => {
    console.log('\n\n✅ Validation complete!');
    process.exit(matchRate >= 95 ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });