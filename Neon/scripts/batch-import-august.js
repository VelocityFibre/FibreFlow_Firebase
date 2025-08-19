#!/usr/bin/env node

/**
 * Batch Import Script for August 2025 Excel Files
 * Processes multiple Excel files in sequence and logs results
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Files to process (August 14-18, 2025)
const filesToProcess = [
  {
    date: '2025-08-14',
    file: '/home/ldp/Downloads/1755237660935_Lawley_14082025.xlsx',
    shortName: 'Lawley_14082025.xlsx'
  },
  {
    date: '2025-08-15',
    file: '/home/ldp/Downloads/1755499735778_Lawley_15082025.xlsx',
    shortName: 'Lawley_15082025.xlsx'
  },
  {
    date: '2025-08-16',
    file: '/home/ldp/Downloads/1755501709548_Lawley_16082025.xlsx',
    shortName: 'Lawley_16082025.xlsx'
  },
  {
    date: '2025-08-17',
    file: '/home/ldp/Downloads/1755501818814_Lawley_17082025.xlsx',
    shortName: 'Lawley_17082025.xlsx'
  },
  {
    date: '2025-08-18',
    file: '/home/ldp/Downloads/1755584665096_Lawley_18082025.xlsx',
    shortName: 'Lawley_18082025.xlsx'
  }
];

async function processImports() {
  console.log('🚀 BATCH IMPORT PROCESS - AUGUST 2025');
  console.log('=====================================');
  console.log(`Processing ${filesToProcess.length} Excel files\n`);

  const results = [];
  
  for (const fileInfo of filesToProcess) {
    console.log(`\n📋 Processing ${fileInfo.shortName} (${fileInfo.date})`);
    console.log('─'.repeat(50));
    
    try {
      // First check if file exists
      if (!fs.existsSync(fileInfo.file)) {
        console.log(`❌ File not found: ${fileInfo.file}`);
        results.push({
          ...fileInfo,
          status: 'FAILED',
          error: 'File not found',
          new: 0,
          updated: 0,
          skipped: 0
        });
        continue;
      }

      // Run the import using fast-excel-import.js
      const output = execSync(
        `node ${path.join(__dirname, 'fast-excel-import.js')} "${fileInfo.file}"`,
        { 
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        }
      );
      
      // Parse the output to extract statistics
      const stats = {
        new: 0,
        updated: 0,
        skipped: 0
      };
      
      // Extract numbers from output
      const newMatch = output.match(/New properties: (\d+)/);
      const updatedMatch = output.match(/Status updates: (\d+)/);
      const skippedMatch = output.match(/Skipped \(no changes\): (\d+)/);
      
      if (newMatch) stats.new = parseInt(newMatch[1]);
      if (updatedMatch) stats.updated = parseInt(updatedMatch[1]);
      if (skippedMatch) stats.skipped = parseInt(skippedMatch[1]);
      
      results.push({
        ...fileInfo,
        status: 'SUCCESS',
        ...stats
      });
      
      console.log(`✅ Import successful`);
      console.log(`   New: ${stats.new}, Updated: ${stats.updated}, Skipped: ${stats.skipped}`);
      
    } catch (error) {
      console.log(`❌ Import failed: ${error.message}`);
      results.push({
        ...fileInfo,
        status: 'FAILED',
        error: error.message,
        new: 0,
        updated: 0,
        skipped: 0
      });
    }
  }
  
  // Generate summary report
  console.log('\n\n📊 IMPORT SUMMARY REPORT');
  console.log('========================');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Files Processed: ${filesToProcess.length}`);
  console.log(`Successful: ${results.filter(r => r.status === 'SUCCESS').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'FAILED').length}`);
  
  let totalNew = 0, totalUpdated = 0, totalSkipped = 0;
  
  console.log('\nDetailed Results:');
  console.log('─'.repeat(80));
  console.log('Date       | File                  | Status  | New  | Updated | Skipped | Notes');
  console.log('─'.repeat(80));
  
  for (const result of results) {
    totalNew += result.new;
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
    
    console.log(
      `${result.date} | ${result.shortName.padEnd(20)} | ${result.status.padEnd(7)} | ${
        result.new.toString().padStart(4)
      } | ${result.updated.toString().padStart(7)} | ${
        result.skipped.toString().padStart(7)
      } | ${result.error || ''}`
    );
  }
  
  console.log('─'.repeat(80));
  console.log(`TOTALS     |                       |         | ${
    totalNew.toString().padStart(4)
  } | ${totalUpdated.toString().padStart(7)} | ${totalSkipped.toString().padStart(7)} |`);
  
  // Append to log file
  const logEntry = `
## Import Log - ${new Date().toISOString()}

### Files Processed: ${filesToProcess.length}
- Successful: ${results.filter(r => r.status === 'SUCCESS').length}
- Failed: ${results.filter(r => r.status === 'FAILED').length}

### Summary:
- Total New Properties: ${totalNew}
- Total Status Updates: ${totalUpdated}
- Total Skipped (No Changes): ${totalSkipped}

### Details:
${results.map(r => `- ${r.date} (${r.shortName}): ${r.status} - New: ${r.new}, Updated: ${r.updated}, Skipped: ${r.skipped}${r.error ? `, Error: ${r.error}` : ''}`).join('\n')}

---
`;

  const logPath = path.join(__dirname, '..', 'logs', 'import-processing-log.md');
  fs.appendFileSync(logPath, logEntry);
  console.log(`\n📝 Log saved to: ${logPath}`);
}

// Run the batch import
processImports().catch(console.error);