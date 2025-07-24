#!/usr/bin/env node

/**
 * Daily Update Scheduler
 * 
 * This script handles automated daily updates:
 * 1. Monitors for new CSV files
 * 2. Triggers batch processing
 * 3. Logs performance metrics
 * 4. Creates summary reports
 * 
 * Can be run via:
 * - Cron job (Linux/Mac)
 * - Task Scheduler (Windows)
 * - Firebase Cloud Functions (scheduled)
 * - GitHub Actions (scheduled workflow)
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process').promises;

// Configuration
const CONFIG = {
  CSV_DIRECTORY: path.join(__dirname, '../../../downloads'),
  CSV_PATTERN: /Lawley.*\.csv$/i,
  PROCESSED_LOG: path.join(__dirname, '../metadata/daily-processed.json'),
  DAILY_REPORTS_DIR: path.join(__dirname, '../reports/daily'),
  BATCH_PROCESSOR: path.join(__dirname, 'batch-process-pole-reports.js'),
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000 // 5 seconds
};

/**
 * Load processing log
 */
async function loadProcessedLog() {
  try {
    const data = await fs.readFile(CONFIG.PROCESSED_LOG, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {
      processedFiles: {},
      dailyRuns: []
    };
  }
}

/**
 * Save processing log
 */
async function saveProcessedLog(log) {
  const dir = path.dirname(CONFIG.PROCESSED_LOG);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG.PROCESSED_LOG, JSON.stringify(log, null, 2));
}

/**
 * Find new CSV files
 */
async function findNewCSVFiles(processedLog) {
  try {
    const files = await fs.readdir(CONFIG.CSV_DIRECTORY);
    const csvFiles = files.filter(f => CONFIG.CSV_PATTERN.test(f));
    const newFiles = [];
    
    for (const file of csvFiles) {
      const filePath = path.join(CONFIG.CSV_DIRECTORY, file);
      const stats = await fs.stat(filePath);
      const fileInfo = {
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
      
      // Check if file is new or modified
      const processed = processedLog.processedFiles[file];
      if (!processed || processed.modified !== fileInfo.modified) {
        newFiles.push(fileInfo);
      }
    }
    
    return newFiles;
  } catch (error) {
    console.error('Error finding CSV files:', error.message);
    return [];
  }
}

/**
 * Process a single CSV file
 */
async function processCSVFile(fileInfo, retryCount = 0) {
  try {
    console.log(`\n📄 Processing ${fileInfo.name}...`);
    
    // Run batch processor
    const command = `node "${CONFIG.BATCH_PROCESSOR}" --csv "${fileInfo.path}"`;
    const { stdout, stderr } = await exec(command, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Batch processor warnings:', stderr);
    }
    
    // Parse results from stdout
    const results = parseProcessorOutput(stdout);
    
    return {
      success: true,
      file: fileInfo.name,
      results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to process ${fileInfo.name}:`, error.message);
    
    // Retry logic
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`🔄 Retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      return processCSVFile(fileInfo, retryCount + 1);
    }
    
    return {
      success: false,
      file: fileInfo.name,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Parse batch processor output
 */
function parseProcessorOutput(output) {
  const results = {
    polesProcessed: 0,
    successful: 0,
    failed: 0,
    duration: 0
  };
  
  // Extract numbers from output
  const polesMatch = output.match(/Found (\d+) poles to process/);
  if (polesMatch) results.polesProcessed = parseInt(polesMatch[1]);
  
  const successMatch = output.match(/Successful: (\d+)/);
  if (successMatch) results.successful = parseInt(successMatch[1]);
  
  const failedMatch = output.match(/Failed: (\d+)/);
  if (failedMatch) results.failed = parseInt(failedMatch[1]);
  
  const durationMatch = output.match(/Duration: ([\d.]+) seconds/);
  if (durationMatch) results.duration = parseFloat(durationMatch[1]);
  
  return results;
}

/**
 * Generate daily summary report
 */
async function generateDailySummary(summary) {
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(CONFIG.DAILY_REPORTS_DIR, `daily-summary-${reportDate}.md`);
  
  let markdown = `# Pole Reports Daily Processing Summary\n\n`;
  markdown += `**Date**: ${new Date().toLocaleString('en-ZA')}\n`;
  markdown += `**Files Processed**: ${summary.filesProcessed}\n`;
  markdown += `**Total Duration**: ${(summary.totalDuration / 1000).toFixed(2)} seconds\n\n`;
  
  markdown += `## Results\n\n`;
  markdown += `| File | Status | Poles | Successful | Failed | Duration |\n`;
  markdown += `|------|--------|-------|------------|--------|----------|\n`;
  
  summary.results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const poles = result.results?.polesProcessed || 0;
    const successful = result.results?.successful || 0;
    const failed = result.results?.failed || 0;
    const duration = result.results?.duration?.toFixed(2) || 'N/A';
    
    markdown += `| ${result.file} | ${status} | ${poles} | ${successful} | ${failed} | ${duration}s |\n`;
  });
  
  markdown += `\n## Statistics\n\n`;
  markdown += `- **Total Poles Processed**: ${summary.totalPoles}\n`;
  markdown += `- **Total Successful**: ${summary.totalSuccessful}\n`;
  markdown += `- **Total Failed**: ${summary.totalFailed}\n`;
  markdown += `- **Success Rate**: ${summary.successRate.toFixed(1)}%\n`;
  
  if (summary.errors.length > 0) {
    markdown += `\n## Errors\n\n`;
    summary.errors.forEach(error => {
      markdown += `- **${error.file}**: ${error.error}\n`;
    });
  }
  
  markdown += `\n---\n`;
  markdown += `*Generated by FibreFlow Pole Reports System*\n`;
  
  // Save report
  await fs.mkdir(CONFIG.DAILY_REPORTS_DIR, { recursive: true });
  await fs.writeFile(reportPath, markdown);
  
  console.log(`\n📝 Daily summary saved to: ${reportPath}`);
  
  return reportPath;
}

/**
 * Store summary in Firebase
 */
async function storeDailySummaryInFirebase(summary) {
  try {
    const { initializeApp } = require('firebase/app');
    const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBbaRXEkiVGHC5S_lLH8SWvgTJZDF6iTzQ",
      authDomain: "fibreflow-73daf.firebaseapp.com",
      projectId: "fibreflow-73daf",
      storageBucket: "fibreflow-73daf.appspot.com",
      messagingSenderId: "146498268846",
      appId: "1:146498268846:web:34fda96797dcec30dc6c74"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const dateId = new Date().toISOString().split('T')[0];
    const summaryRef = doc(db, 'analytics', 'daily-summaries', dateId);
    
    await setDoc(summaryRef, {
      ...summary,
      createdAt: serverTimestamp()
    });
    
    console.log('✅ Summary stored in Firebase');
  } catch (error) {
    console.error('Failed to store summary in Firebase:', error.message);
  }
}

/**
 * Main daily update function
 */
async function runDailyUpdate() {
  const startTime = Date.now();
  console.log('\n🌅 Pole Reports Daily Update');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const summary = {
    date: new Date().toISOString(),
    filesProcessed: 0,
    totalDuration: 0,
    totalPoles: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    successRate: 0,
    results: [],
    errors: []
  };
  
  try {
    // Load processing log
    const processedLog = await loadProcessedLog();
    
    // Find new CSV files
    console.log('\n🔍 Checking for new CSV files...');
    const newFiles = await findNewCSVFiles(processedLog);
    
    if (newFiles.length === 0) {
      console.log('✅ No new files to process');
      
      // Still log the daily run
      processedLog.dailyRuns.push({
        timestamp: new Date().toISOString(),
        filesProcessed: 0,
        duration: Date.now() - startTime
      });
      
      await saveProcessedLog(processedLog);
      
      // Generate "no changes" report
      await generateDailySummary(summary);
      return;
    }
    
    console.log(`📁 Found ${newFiles.length} new/modified files to process`);
    
    // Process each file
    for (const fileInfo of newFiles) {
      const result = await processCSVFile(fileInfo);
      summary.results.push(result);
      
      if (result.success) {
        summary.filesProcessed++;
        summary.totalPoles += result.results.polesProcessed || 0;
        summary.totalSuccessful += result.results.successful || 0;
        summary.totalFailed += result.results.failed || 0;
        
        // Update processed log
        processedLog.processedFiles[fileInfo.name] = {
          modified: fileInfo.modified,
          lastProcessed: result.timestamp,
          results: result.results
        };
      } else {
        summary.errors.push({
          file: fileInfo.name,
          error: result.error
        });
      }
    }
    
    // Calculate summary statistics
    summary.totalDuration = Date.now() - startTime;
    summary.successRate = summary.totalPoles > 0 ? 
      (summary.totalSuccessful / summary.totalPoles) * 100 : 0;
    
    // Log daily run
    processedLog.dailyRuns.push({
      timestamp: summary.date,
      filesProcessed: summary.filesProcessed,
      polesProcessed: summary.totalPoles,
      successful: summary.totalSuccessful,
      failed: summary.totalFailed,
      duration: summary.totalDuration
    });
    
    // Keep only last 30 days of runs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    processedLog.dailyRuns = processedLog.dailyRuns.filter(
      run => new Date(run.timestamp) > thirtyDaysAgo
    );
    
    // Save updated log
    await saveProcessedLog(processedLog);
    
    // Generate daily summary report
    await generateDailySummary(summary);
    
    // Store in Firebase
    await storeDailySummaryInFirebase(summary);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Daily Update Complete');
    console.log(`   Files Processed: ${summary.filesProcessed}`);
    console.log(`   Total Poles: ${summary.totalPoles}`);
    console.log(`   Successful: ${summary.totalSuccessful}`);
    console.log(`   Failed: ${summary.totalFailed}`);
    console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`   Duration: ${(summary.totalDuration / 1000).toFixed(2)} seconds`);
    
    if (summary.errors.length > 0) {
      console.log('\n❌ Errors:');
      summary.errors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during daily update:', error);
    
    // Save error summary
    summary.errors.push({
      file: 'System',
      error: error.message
    });
    
    await generateDailySummary(summary);
    
    process.exit(1);
  }
}

/**
 * Setup cron job (Linux/Mac)
 */
function setupCronJob() {
  console.log('\n🕐 Setting up daily cron job...');
  
  const scriptPath = __filename;
  const logPath = path.join(__dirname, '../logs/daily-update.log');
  const cronCommand = `0 3 * * * cd ${__dirname} && /usr/bin/node ${scriptPath} >> ${logPath} 2>&1`;
  
  console.log('\nAdd this line to your crontab (crontab -e):');
  console.log(cronCommand);
  console.log('\nThis will run the daily update at 3:00 AM every day.');
  console.log('\nTo view logs:');
  console.log(`tail -f ${logPath}`);
}

/**
 * Check daily run status
 */
async function checkStatus() {
  try {
    const processedLog = await loadProcessedLog();
    
    console.log('\n📊 Daily Run Status');
    console.log('='.repeat(60));
    
    if (processedLog.dailyRuns.length === 0) {
      console.log('No daily runs recorded yet.');
      return;
    }
    
    // Show last 5 runs
    const recentRuns = processedLog.dailyRuns.slice(-5).reverse();
    
    console.log('\nRecent Runs:');
    recentRuns.forEach(run => {
      const date = new Date(run.timestamp).toLocaleString('en-ZA');
      const duration = (run.duration / 1000).toFixed(2);
      console.log(`\n📅 ${date}`);
      console.log(`   Files: ${run.filesProcessed}`);
      console.log(`   Poles: ${run.polesProcessed || 0}`);
      console.log(`   Duration: ${duration}s`);
    });
    
    // Show processed files
    console.log('\n\nProcessed Files:');
    Object.entries(processedLog.processedFiles).forEach(([file, info]) => {
      console.log(`\n📄 ${file}`);
      console.log(`   Last Modified: ${new Date(info.modified).toLocaleString('en-ZA')}`);
      console.log(`   Last Processed: ${new Date(info.lastProcessed).toLocaleString('en-ZA')}`);
      if (info.results) {
        console.log(`   Poles: ${info.results.polesProcessed || 0}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking status:', error.message);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
    case 'setup-cron':
      setupCronJob();
      break;
    case 'status':
      checkStatus().catch(console.error);
      break;
    case 'test':
      console.log('🧪 Running test with dry-run...');
      process.argv.push('--dry-run');
      runDailyUpdate().catch(console.error);
      break;
    default:
      runDailyUpdate().catch(console.error);
  }
}

module.exports = { runDailyUpdate };