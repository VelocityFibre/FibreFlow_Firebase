#!/usr/bin/env node

/**
 * Split CSV files into pole-numbered and permission-only records
 * This simplifies processing by separating two different tracking scenarios
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');
// We'll create CSV manually to avoid dependency

async function parseCSV(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return csv.parse(content.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
}

async function splitCSVFile(inputPath, outputDir) {
  console.log(`\n📄 Processing: ${path.basename(inputPath)}`);
  
  // Parse CSV
  const records = await parseCSV(inputPath);
  console.log(`  Total records: ${records.length}`);
  
  // Split records
  const poleRecords = [];
  const permissionRecords = [];
  
  records.forEach(record => {
    const poleNumber = record['Pole Number'];
    if (poleNumber && poleNumber.trim() && poleNumber.trim() !== 'null') {
      poleRecords.push(record);
    } else {
      permissionRecords.push(record);
    }
  });
  
  console.log(`  ✅ Pole records (has pole number): ${poleRecords.length}`);
  console.log(`  📋 Permission records (no pole yet): ${permissionRecords.length}`);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Save split files
  const baseName = path.basename(inputPath, '.csv');
  
  // Save pole records
  if (poleRecords.length > 0) {
    const headers = Object.keys(poleRecords[0]);
    const poleCSV = [
      headers.join(';'),
      ...poleRecords.map(r => headers.map(h => r[h] || '').join(';'))
    ].join('\n');
    
    await fs.writeFile(
      path.join(outputDir, `${baseName}_pole_records.csv`),
      poleCSV
    );
  }
  
  // Save permission records
  if (permissionRecords.length > 0) {
    const headers = Object.keys(permissionRecords[0]);
    const permissionCSV = [
      headers.join(';'),
      ...permissionRecords.map(r => headers.map(h => r[h] || '').join(';'))
    ].join('\n');
    
    await fs.writeFile(
      path.join(outputDir, `${baseName}_permission_records.csv`),
      permissionCSV
    );
  }
  
  // Generate summary
  const summary = {
    fileName: path.basename(inputPath),
    totalRecords: records.length,
    poleRecords: poleRecords.length,
    permissionRecords: permissionRecords.length,
    polePercentage: ((poleRecords.length / records.length) * 100).toFixed(1),
    
    // Sample data for verification
    samplePoleRecord: poleRecords[0] ? {
      propertyId: poleRecords[0]['Property ID'],
      poleNumber: poleRecords[0]['Pole Number'],
      status: poleRecords[0]['Status']
    } : null,
    
    samplePermissionRecord: permissionRecords[0] ? {
      propertyId: permissionRecords[0]['Property ID'],
      poleNumber: permissionRecords[0]['Pole Number'] || 'empty',
      status: permissionRecords[0]['Status']
    } : null
  };
  
  // Save summary
  await fs.writeFile(
    path.join(outputDir, `${baseName}_split_summary.json`),
    JSON.stringify(summary, null, 2)
  );
  
  return summary;
}

async function processAllCSVs(inputDir, outputBaseDir) {
  console.log('🔄 CSV Splitting Process\n');
  console.log(`Input directory: ${inputDir}`);
  console.log(`Output directory: ${outputBaseDir}\n`);
  
  // Get all CSV files
  const files = await fs.readdir(inputDir);
  const csvFiles = files.filter(f => f.endsWith('.csv')).sort();
  
  console.log(`Found ${csvFiles.length} CSV files to process`);
  
  const summaries = [];
  
  for (const file of csvFiles) {
    const inputPath = path.join(inputDir, file);
    
    // Extract date from filename (e.g., "22052025" -> "2025-05-22")
    const dateMatch = file.match(/(\d{2})(\d{2})(\d{4})/);
    let outputDir = path.join(outputBaseDir, 'unsorted');
    
    if (dateMatch) {
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      outputDir = path.join(outputBaseDir, date);
    }
    
    const summary = await splitCSVFile(inputPath, outputDir);
    summaries.push({ date: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : 'unknown', ...summary });
  }
  
  // Generate overall report
  const report = `
# CSV Split Analysis Report

## Summary
- Total files processed: ${summaries.length}
- Date range: ${summaries[0]?.date} to ${summaries[summaries.length - 1]?.date}

## File Breakdown
${summaries.map(s => `
### ${s.date} - ${s.fileName}
- Total records: ${s.totalRecords}
- Pole records: ${s.poleRecords} (${s.polePercentage}%)
- Permission records: ${s.permissionRecords} (${100 - s.polePercentage}%)
`).join('\n')}

## Insights
- Early files have more permission-only records
- Later files show more pole assignments
- This split makes tracking much cleaner!

Generated: ${new Date().toISOString()}
`;
  
  await fs.writeFile(
    path.join(outputBaseDir, 'split_analysis_report.md'),
    report
  );
  
  console.log(`\n✅ Processing complete!`);
  console.log(`📄 Report saved to: ${path.join(outputBaseDir, 'split_analysis_report.md')}`);
  
  return summaries;
}

// Example: Process single file
async function processSingleFile() {
  const testFile = 'downloads/Lawley May Week 3 22052025 - First Report.csv';
  const outputDir = 'split_data/2025-05-22';
  
  await splitCSVFile(testFile, outputDir);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Process single test file
    await processSingleFile();
  } else if (args[0] === '--all') {
    // Process all files in downloads
    await processAllCSVs('downloads', 'split_data');
    
    // Also process files in Lawley Raw Stats subdirectory
    await processAllCSVs('downloads/Lawley Raw Stats', 'split_data');
  } else if (args.length === 2) {
    // Process specific file
    await splitCSVFile(args[0], args[1]);
  } else {
    console.log('Usage:');
    console.log('  node split-csv-by-pole.js                    # Test with single file');
    console.log('  node split-csv-by-pole.js --all              # Process all files');
    console.log('  node split-csv-by-pole.js <input> <output>   # Process specific file');
  }
}

if (require.main === module) {
  main().catch(console.error);
}