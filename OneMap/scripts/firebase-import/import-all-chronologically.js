#!/usr/bin/env node

/**
 * AUTOMATED CHRONOLOGICAL IMPORT
 * Processes all CSV files in order with tracking
 */

const fs = require('fs');
const path = require('path');
const { optimizedImport } = require('./bulk-import-optimized-2025-08-05.js');

// Define all files in chronological order
const CSV_FILES = [
  // May 2025
  'Lawley May Week 3 22052025 - First Report.csv',
  'Lawley May Week 3 23052025.csv',
  'Lawley May Week 4 26052025.csv',
  'Lawley May Week 4 27052025.csv',
  'Lawley May Week 4 29052025.csv',
  'Lawley May Week 4 30052025.csv',
  
  // June 2025
  'Lawley June Week 1 02062025.csv',
  'Lawley June Week 1 03062025.csv',
  'Lawley June  Week 1 05062025.csv', // Note double space
  'Lawley June Week 1 06062025.csv',
  'Lawley June Week 2 09062025.csv',
  'Lawley June Week 2 10062025.csv',
  'Lawley June Week 2 11062025.csv',
  'Lawley June Week 2 12062025.csv',
  'Lawley June Week 2 13062025.csv',
  'Lawley June Week 3 16062025.csv',
  'Lawley June Week 3 17062025.csv',
  'Lawley June Week 3 18062025.csv',
  'Lawley June Week 3 19062025.csv',
  'Lawley June Week 3 20062025.csv', // CRITICAL - Check for phantom changes
  'Lawley June Week 3 22062025.csv',
  'Lawley June Week 4 23062025.csv',
  'Mohadin June Week 4 24062025.csv', // Different site
  'Lawley June Week 4 26062025.csv',
  'Lawley June Week 4 27062025.csv',
  'Lawley June Week 4 30062025.csv',
  
  // July 2025
  'Lawley July Week 1 01072025.csv',
  'Lawley July Week 1 02072025.csv',
  'Lawley July Week 1 03072025.csv',
  'Lawly July Week 1 04072025.csv', // Note typo
  'Lawley July Week 2 07072025.csv',
  'Lawley July Week 2 08072025.csv',
  'Lawley July Week 2 11072025.csv',
  'Lawley July Week 3 14072025.csv',
  'Lawley July Week 3 15072025.csv',
  'Lawley July Week 3 16072025.csv',
  'Lawley July Week 3 17072025.csv',
  'Lawley July Week 3 18072025.csv'
];

const TRACKING_FILE = path.join(__dirname, '../../AUTOMATED_IMPORT_TRACKING.json');

// Load or create tracking data
function loadTracking() {
  if (fs.existsSync(TRACKING_FILE)) {
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  }
  return {
    files: {},
    lastProcessed: null,
    startedAt: new Date().toISOString()
  };
}

// Save tracking data
function saveTracking(tracking) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracking, null, 2));
}

// Update markdown log
function updateMarkdownLog(fileName, status, stats = null) {
  const logPath = path.join(__dirname, '../../IMPORT_TRACKING_LOG_2025-08-05.md');
  let content = fs.readFileSync(logPath, 'utf8');
  
  // Update the checkbox for this file
  const searchPattern = `- [ ] ${fileName}`;
  let replacement;
  
  switch(status) {
    case 'completed':
      replacement = `- [x] ${fileName} ✅ COMPLETED`;
      break;
    case 'in_progress':
      replacement = `- [ ] ${fileName} ⏳ IN PROGRESS`;
      break;
    case 'failed':
      replacement = `- [ ] ${fileName} ❌ FAILED`;
      break;
    default:
      replacement = `- [ ] ${fileName} 🔄 PENDING`;
  }
  
  content = content.replace(searchPattern, replacement);
  
  // Add to log section
  if (stats) {
    const date = new Date().toISOString();
    const logEntry = `\n${date} - ${fileName}: ${status.toUpperCase()} - New: ${stats.new}, Updated: ${stats.updated}, Changes: ${stats.statusChanges}`;
    content = content.replace('## Next Actions', logEntry + '\n\n## Next Actions');
  }
  
  fs.writeFileSync(logPath, content);
}

async function processAllFiles() {
  console.log('🚀 AUTOMATED CHRONOLOGICAL IMPORT SYSTEM');
  console.log('=' .repeat(50));
  
  const tracking = loadTracking();
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  for (const fileName of CSV_FILES) {
    // Check if already processed
    if (tracking.files[fileName]?.status === 'completed') {
      console.log(`\n⏭️  Skipping ${fileName} - Already completed`);
      skippedCount++;
      continue;
    }
    
    // Check if file exists
    const filePath = path.join(__dirname, '../../downloads/Lawley Raw Stats', fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`\n❌ File not found: ${fileName}`);
      tracking.files[fileName] = { status: 'not_found', lastAttempt: new Date().toISOString() };
      failedCount++;
      continue;
    }
    
    // Process the file
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📁 Processing: ${fileName}`);
    console.log(`Progress: ${processedCount + skippedCount + 1}/${CSV_FILES.length}`);
    console.log(`${'='.repeat(50)}`);
    
    tracking.files[fileName] = { 
      status: 'in_progress', 
      startedAt: new Date().toISOString() 
    };
    saveTracking(tracking);
    updateMarkdownLog(fileName, 'in_progress');
    
    try {
      const stats = await optimizedImport(fileName);
      
      tracking.files[fileName] = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        stats: stats
      };
      tracking.lastProcessed = fileName;
      saveTracking(tracking);
      updateMarkdownLog(fileName, 'completed', stats);
      
      processedCount++;
      
      // Special check for June 20
      if (fileName.includes('20062025')) {
        console.log('\n⚠️  CRITICAL FILE: June 20 - Checking for phantom changes...');
        console.log('Please run verification after this import!');
      }
      
      // Brief pause between files
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`\n❌ Error processing ${fileName}:`, error.message);
      
      tracking.files[fileName] = {
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: error.message
      };
      saveTracking(tracking);
      updateMarkdownLog(fileName, 'failed');
      
      failedCount++;
      
      // Continue with next file
      continue;
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Files: ${CSV_FILES.length}`);
  console.log(`✅ Processed: ${processedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`📅 Completed: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  // Save final tracking
  tracking.completedAt = new Date().toISOString();
  saveTracking(tracking);
  
  console.log('\n📄 Tracking saved to:', TRACKING_FILE);
  console.log('📄 Log updated at: IMPORT_TRACKING_LOG_2025-08-05.md');
}

// Run if called directly
if (require.main === module) {
  processAllFiles()
    .then(() => {
      console.log('\n✅ All imports completed!');
      console.log('\n🔍 Next step: Run verification scripts');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Import process failed:', error);
      process.exit(1);
    });
}

module.exports = { processAllFiles };