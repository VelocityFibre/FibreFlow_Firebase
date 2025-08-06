#!/usr/bin/env node

/**
 * Fix BOM (Byte Order Mark) in CSV headers
 * This normalizes column headers by removing BOM characters
 */

const fs = require('fs').promises;
const path = require('path');

// Normalize header by removing BOM and trimming
function normalizeHeader(header) {
  // Remove BOM character if present
  return header.replace(/^\uFEFF/, '').trim();
}

// Process a CSV file to remove BOM from headers
async function fixBOMInCSV(csvPath) {
  try {
    console.log(`Processing: ${path.basename(csvPath)}`);
    
    // Read file content
    let content = await fs.readFile(csvPath, 'utf-8');
    
    // Split into lines
    const lines = content.split(/\r?\n/);
    
    if (lines.length > 0) {
      // Get header line
      const headers = lines[0].split(',');
      
      // Check if first header has BOM
      if (headers[0] && headers[0].startsWith('\uFEFF')) {
        console.log(`  ✓ Found BOM in first column, fixing...`);
        
        // Fix all headers
        const fixedHeaders = headers.map(normalizeHeader);
        
        // Rebuild first line
        lines[0] = fixedHeaders.join(',');
        
        // Write back
        await fs.writeFile(csvPath, lines.join('\n'), 'utf-8');
        console.log(`  ✓ Fixed headers in ${path.basename(csvPath)}`);
        
        return true;
      } else {
        console.log(`  ✓ No BOM found, file is clean`);
        return false;
      }
    }
    
  } catch (error) {
    console.error(`  ✗ Error processing ${csvPath}:`, error.message);
    return false;
  }
}

// Main function to fix all CSVs in a directory
async function fixAllCSVs(directory) {
  console.log('🔧 Fixing BOM in CSV files...\n');
  
  try {
    const files = await fs.readdir(directory);
    const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));
    
    console.log(`Found ${csvFiles.length} CSV files to check\n`);
    
    let fixedCount = 0;
    
    for (const file of csvFiles) {
      const fullPath = path.join(directory, file);
      const wasFixed = await fixBOMInCSV(fullPath);
      if (wasFixed) fixedCount++;
    }
    
    console.log(`\n✅ Complete! Fixed ${fixedCount} files`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const directory = process.argv[2] || '../downloads/Lawley Raw Stats';
  fixAllCSVs(directory)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fixBOMInCSV, normalizeHeader };