#!/usr/bin/env node

/**
 * Fix CSV parsing issues:
 * 1. Handle quotes in fields (especially "KG " in Installer Name)
 * 2. Handle variable column counts
 * 3. Clean problematic data before parsing
 */

const fs = require('fs').promises;
const path = require('path');

async function fixCSVFile(inputPath, outputPath) {
  console.log(`Fixing: ${path.basename(inputPath)}`);
  
  let content = await fs.readFile(inputPath, 'utf-8');
  
  // Remove BOM if present
  content = content.replace(/^\uFEFF/, '');
  
  // Fix specific known issues
  // 1. Replace problematic "KG " with KG (no quotes)
  content = content.replace(/"KG "/g, 'KG');
  
  // 2. Fix other quote issues - ensure all fields are properly quoted or not quoted
  const lines = content.split('\n');
  const fixedLines = [];
  
  // Process header
  const header = lines[0];
  fixedLines.push(header);
  const columnCount = header.split(';').length;
  console.log(`  Expected columns: ${columnCount}`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  // Process data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Count semicolons to check column count
    const semicolonCount = (line.match(/;/g) || []).length;
    const apparentColumns = semicolonCount + 1;
    
    // If column count is off, try to fix it
    if (apparentColumns !== columnCount) {
      // Common issue: extra semicolons in text fields
      // Try to fix by checking if we have embedded semicolons in quoted fields
      if (apparentColumns > columnCount) {
        // Skip problematic rows for now
        console.log(`  Line ${i + 1}: ${apparentColumns} columns (expected ${columnCount}) - skipping`);
        skippedCount++;
        continue;
      } else if (apparentColumns < columnCount) {
        // Add empty fields at the end
        const missingFields = columnCount - apparentColumns;
        const fixedLine = line + ';'.repeat(missingFields);
        fixedLines.push(fixedLine);
        fixedCount++;
        continue;
      }
    }
    
    // Fix quote issues in the line
    let fixedLine = line;
    
    // Remove quotes that are causing parsing issues
    // But preserve quotes that are meant to escape semicolons
    fixedLine = fixedLine.replace(/([^;])"([^;])/g, '$1$2');
    
    fixedLines.push(fixedLine);
  }
  
  console.log(`  Fixed ${fixedCount} lines, skipped ${skippedCount} problematic lines`);
  
  // Write fixed content
  await fs.writeFile(outputPath, fixedLines.join('\n'));
  
  return { fixedCount, skippedCount };
}

async function fixAllCSVs(baseDir = 'split_data') {
  console.log('🔧 Fixing CSV parsing issues\n');
  
  // Get all date directories
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const dateDirs = entries
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e => e.name)
    .sort();
  
  const problematicDates = [
    '2025-07-01', '2025-07-02', '2025-07-03', 
    '2025-07-07', '2025-07-08', '2025-07-11',
    '2025-07-14', '2025-07-15', '2025-07-16',
    '2025-07-17', '2025-07-18', '2025-07-19',
    '2025-07-20', '2025-07-21'
  ];
  
  for (const date of dateDirs) {
    if (!problematicDates.includes(date)) continue;
    
    console.log(`\n📅 Processing ${date}`);
    
    const dateDir = path.join(baseDir, date);
    const files = await fs.readdir(dateDir);
    
    for (const file of files) {
      if (!file.endsWith('.csv')) continue;
      
      const inputPath = path.join(dateDir, file);
      const backupPath = path.join(dateDir, file.replace('.csv', '_original.csv'));
      const outputPath = inputPath; // Overwrite original
      
      // Create backup
      await fs.copyFile(inputPath, backupPath);
      
      // Fix the file
      await fixCSVFile(inputPath, outputPath);
    }
  }
  
  console.log('\n✅ CSV fixing complete!');
}

async function validateFixed() {
  // Test parsing the fixed files
  const csv = require('csv-parse/sync');
  
  console.log('\n🔍 Validating fixed files...\n');
  
  const testFiles = [
    'split_data/2025-07-01/Lawley July Week 1 01072025_pole_records.csv',
    'split_data/2025-07-02/Lawley July Week 1 02072025_pole_records.csv',
    'split_data/2025-07-08/Lawley July Week 2 08072025_permission_records.csv'
  ];
  
  for (const file of testFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const records = csv.parse(content, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true
      });
      console.log(`✅ ${path.basename(file)}: ${records.length} records parsed successfully`);
    } catch (error) {
      console.log(`❌ ${path.basename(file)}: ${error.message}`);
    }
  }
}

async function main() {
  await fixAllCSVs();
  await validateFixed();
}

if (require.main === module) {
  main().catch(console.error);
}