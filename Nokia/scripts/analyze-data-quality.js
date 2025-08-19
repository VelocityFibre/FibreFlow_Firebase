#!/usr/bin/env node

const XLSX = require('xlsx');
const path = require('path');

console.log('🔍 Nokia Excel Data Quality Analysis');
console.log('=====================================\n');

const excelPath = '/home/ldp/Downloads/Nokia Export.xlsx';

try {
  // Read Excel file
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total rows in Excel: ${data.length}`);
  
  // Analyze data quality
  let validCount = 0;
  let missingDropCount = 0;
  let missingSerialCount = 0;
  let bothMissingCount = 0;
  
  const sampleValid = [];
  const sampleInvalid = [];
  
  data.forEach((row, index) => {
    const dropNumber = row['Drop Number'] || row['drop_number'] || '';
    const serialNumber = row['Serial Number'] || row['serial_number'] || '';
    
    const hasDropNumber = dropNumber && dropNumber.toString().trim() !== '';
    const hasSerialNumber = serialNumber && serialNumber.toString().trim() !== '';
    
    if (hasDropNumber && hasSerialNumber) {
      validCount++;
      if (sampleValid.length < 3) {
        sampleValid.push({
          row: index + 2, // Excel row (1-indexed + header)
          dropNumber: dropNumber.toString().trim(),
          serialNumber: serialNumber.toString().trim()
        });
      }
    } else {
      if (!hasDropNumber) missingDropCount++;
      if (!hasSerialNumber) missingSerialCount++;
      if (!hasDropNumber && !hasSerialNumber) bothMissingCount++;
      
      if (sampleInvalid.length < 3) {
        sampleInvalid.push({
          row: index + 2,
          dropNumber: hasDropNumber ? dropNumber.toString().trim() : 'MISSING',
          serialNumber: hasSerialNumber ? serialNumber.toString().trim() : 'MISSING'
        });
      }
    }
  });
  
  console.log(`\n📈 Data Quality Results:`);
  console.log(`✅ Valid records (both Drop Number AND Serial Number): ${validCount}`);
  console.log(`❌ Invalid records (missing one or both fields): ${data.length - validCount}`);
  console.log(`   - Missing Drop Number: ${missingDropCount}`);
  console.log(`   - Missing Serial Number: ${missingSerialCount}`);
  console.log(`   - Missing both: ${bothMissingCount}`);
  
  console.log(`\n📋 Sample Valid Records:`);
  console.table(sampleValid);
  
  console.log(`\n⚠️  Sample Invalid Records:`);
  console.table(sampleInvalid);
  
  // Column analysis
  console.log(`\n📊 Available Columns in Excel:`);
  const columns = Object.keys(data[0] || {});
  columns.forEach((col, i) => {
    console.log(`${i + 1}. "${col}"`);
  });
  
  // Percentage breakdown
  const validPercent = ((validCount / data.length) * 100).toFixed(1);
  const invalidPercent = (((data.length - validCount) / data.length) * 100).toFixed(1);
  
  console.log(`\n🎯 Summary:`);
  console.log(`- ${validPercent}% of records are valid and importable`);
  console.log(`- ${invalidPercent}% of records are invalid (missing required fields)`);
  console.log(`\n💡 Import Expectation:`);
  console.log(`Expected successful imports: ~${validCount} records`);
  console.log(`Expected rejected records: ~${data.length - validCount} records`);

} catch (error) {
  console.error('❌ Error analyzing Excel file:', error.message);
  console.log('\n🔍 Possible issues:');
  console.log('- Excel file not found at:', excelPath);
  console.log('- File is corrupted or not a valid Excel file');
  console.log('- Permission issues reading the file');
}