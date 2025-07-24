#!/usr/bin/env node

/**
 * Batch Process Pole Reports
 * 
 * This script handles the complete daily processing workflow:
 * 1. Checks for new/updated CSV files
 * 2. Identifies changed poles
 * 3. Generates reports for affected poles
 * 4. Stores reports in Firebase
 * 5. Maintains version history (current + previous)
 * 6. Logs performance metrics
 * 
 * Usage: node batch-process-pole-reports.js [options]
 * Options:
 *   --force-all    Process all poles (ignore change detection)
 *   --dry-run      Show what would be done without executing
 *   --limit N      Process only N poles (for testing)
 *   --csv PATH     Use specific CSV file instead of latest
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc, writeBatch, serverTimestamp, query, orderBy, limit, getDocs } = require('firebase/firestore');
const { getStorage, ref, uploadString, getDownloadURL } = require('firebase/storage');

// Import existing report generation logic
const { generatePoleReportData } = require('./generate-pole-report-enhanced');

// Configuration
const CONFIG = {
  CSV_PATH: path.join(__dirname, '../../../GraphAnalysis/data/master/master_csv_latest_validated.csv'),
  METADATA_PATH: path.join(__dirname, '../metadata/processing-log.json'),
  REPORTS_COLLECTION: 'analytics/pole-reports',
  BATCH_SIZE: 100,
  MAX_CONCURRENT: 5,
  CACHE_HOURS: 24
};

// Firebase configuration (from environment or direct)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBbaRXEkiVGHC5S_lLH8SWvgTJZDF6iTzQ",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "146498268846",
  appId: "1:146498268846:web:34fda96797dcec30dc6c74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    forceAll: false,
    dryRun: false,
    limit: null,
    csvPath: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force-all') options.forceAll = true;
    if (args[i] === '--dry-run') options.dryRun = true;
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    }
    if (args[i] === '--csv' && args[i + 1]) {
      options.csvPath = args[i + 1];
      i++;
    }
  }

  return options;
}

// Load processing metadata
async function loadMetadata() {
  try {
    const data = await fs.readFile(CONFIG.METADATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty metadata
    return {
      lastProcessed: null,
      lastChecksum: null,
      processedPoles: {},
      performanceStats: []
    };
  }
}

// Save processing metadata
async function saveMetadata(metadata) {
  const dir = path.dirname(CONFIG.METADATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG.METADATA_PATH, JSON.stringify(metadata, null, 2));
}

// Calculate file checksum
async function calculateChecksum(filePath) {
  const crypto = require('crypto');
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Read and parse CSV
async function readCSV(csvPath) {
  const content = await fs.readFile(csvPath, 'utf-8');
  return csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    relax_quotes: true,
    relax_column_count: true
  });
}

// Group records by pole number
function groupByPole(records) {
  const poleMap = new Map();
  
  records.forEach(record => {
    const poleNumber = record['Pole Number'];
    if (!poleNumber) return;
    
    if (!poleMap.has(poleNumber)) {
      poleMap.set(poleNumber, []);
    }
    poleMap.get(poleNumber).push(record);
  });
  
  return poleMap;
}

// Detect changed poles
async function detectChangedPoles(currentRecords, metadata) {
  const changed = new Set();
  const currentPoleMap = groupByPole(currentRecords);
  
  // If force all, return all poles
  if (parseArgs().forceAll) {
    return Array.from(currentPoleMap.keys());
  }
  
  // Compare with previous processed data
  for (const [poleNumber, records] of currentPoleMap) {
    const recordsHash = calculateRecordsHash(records);
    const previousHash = metadata.processedPoles[poleNumber]?.hash;
    
    if (recordsHash !== previousHash) {
      changed.add(poleNumber);
    }
  }
  
  // Also check for deleted poles
  for (const poleNumber in metadata.processedPoles) {
    if (!currentPoleMap.has(poleNumber)) {
      changed.add(poleNumber); // Mark for deletion or archival
    }
  }
  
  return Array.from(changed);
}

// Calculate hash for pole records
function calculateRecordsHash(records) {
  const crypto = require('crypto');
  const sortedRecords = records
    .map(r => JSON.stringify(r))
    .sort()
    .join('|');
  return crypto.createHash('sha256').update(sortedRecords).digest('hex');
}

// Generate report for a single pole
async function generatePoleReport(poleNumber, records) {
  const report = {
    poleNumber,
    generatedAt: new Date().toISOString(),
    dataSource: 'CSV',
    version: 'current',
    summary: {
      totalRecords: records.length,
      firstAppearance: null,
      lastUpdate: null,
      addresses: [],
      totalDrops: 0,
      timeSpan: 0
    },
    timeline: [],
    drops: [],
    agents: [],
    dataQuality: []
  };
  
  // Extract unique addresses
  const addresses = [...new Set(records.map(r => r['Location Address']))];
  report.summary.addresses = addresses;
  
  // Extract connected drops
  const drops = new Map();
  records.forEach(record => {
    const dropNumber = record['Drop Number'];
    if (dropNumber) {
      if (!drops.has(dropNumber)) {
        drops.set(dropNumber, {
          dropNumber,
          address: record['Location Address'],
          status: record['Status'],
          agent: record['Field Agent'],
          lastUpdate: record['_import_timestamp'] || record['_first_seen_date']
        });
      }
    }
  });
  report.drops = Array.from(drops.values());
  report.summary.totalDrops = report.drops.length;
  
  // Build timeline
  const timelineEvents = [];
  records.forEach(record => {
    const event = {
      date: record['_first_seen_date'] || record['_import_timestamp'],
      time: null,
      status: record['Status'],
      previousStatus: null,
      drop: record['Drop Number'],
      agent: record['Field Agent'],
      workflow: record['Flow Name Groups']
    };
    
    if (event.date) {
      timelineEvents.push(event);
    }
  });
  
  // Sort timeline by date
  timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate previous status for each event
  for (let i = 1; i < timelineEvents.length; i++) {
    const prevStatus = timelineEvents[i - 1].status;
    if (prevStatus !== timelineEvents[i].status) {
      timelineEvents[i].previousStatus = prevStatus;
    }
  }
  
  report.timeline = timelineEvents;
  
  // Calculate time span
  if (timelineEvents.length > 0) {
    report.summary.firstAppearance = timelineEvents[0].date;
    report.summary.lastUpdate = timelineEvents[timelineEvents.length - 1].date;
    
    const firstDate = new Date(report.summary.firstAppearance);
    const lastDate = new Date(report.summary.lastUpdate);
    const diffDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    report.summary.timeSpan = diffDays;
  }
  
  // Extract agent activity
  const agentMap = new Map();
  records.forEach(record => {
    const agent = record['Field Agent'];
    if (agent) {
      if (!agentMap.has(agent)) {
        agentMap.set(agent, {
          name: agent,
          totalActions: 0,
          firstActivity: null,
          lastActivity: null,
          statusBreakdown: []
        });
      }
      
      const agentData = agentMap.get(agent);
      agentData.totalActions++;
      
      // Update activity dates
      const date = record['_first_seen_date'] || record['_import_timestamp'];
      if (date) {
        if (!agentData.firstActivity || new Date(date) < new Date(agentData.firstActivity)) {
          agentData.firstActivity = date;
        }
        if (!agentData.lastActivity || new Date(date) > new Date(agentData.lastActivity)) {
          agentData.lastActivity = date;
        }
      }
    }
  });
  
  report.agents = Array.from(agentMap.values());
  
  // Data quality checks
  const qualityIssues = [];
  
  // Check for missing field agents
  const missingAgents = records.filter(r => !r['Field Agent']).length;
  if (missingAgents > 0) {
    qualityIssues.push({
      type: 'missing_data',
      field: 'Field Agent',
      count: missingAgents,
      percentage: Math.round((missingAgents / records.length) * 100)
    });
  }
  
  // Check for address conflicts
  if (addresses.length > 1) {
    qualityIssues.push({
      type: 'multiple_addresses',
      count: addresses.length,
      addresses: addresses
    });
  }
  
  report.dataQuality = qualityIssues;
  
  return report;
}

// Store report in Firebase
async function storeReport(report, dryRun = false) {
  if (dryRun) {
    console.log(`[DRY RUN] Would store report for pole ${report.poleNumber}`);
    return;
  }
  
  try {
    // Archive current report as previous
    const currentRef = doc(db, 'analytics', 'pole-reports', report.poleNumber, 'current');
    const currentDoc = await getDoc(currentRef);
    
    if (currentDoc.exists()) {
      const previousRef = doc(db, 'analytics', 'pole-reports', report.poleNumber, 'previous');
      await setDoc(previousRef, {
        ...currentDoc.data(),
        version: 'previous',
        archivedAt: serverTimestamp()
      });
    }
    
    // Store new report as current
    await setDoc(currentRef, {
      ...report,
      updatedAt: serverTimestamp()
    });
    
    // Also store in the flat collection for easy querying
    const summaryRef = doc(db, 'analytics', 'pole-reports-summary', report.poleNumber);
    await setDoc(summaryRef, {
      poleNumber: report.poleNumber,
      lastGenerated: report.generatedAt,
      totalRecords: report.summary.totalRecords,
      totalDrops: report.summary.totalDrops,
      totalAgents: report.agents.length,
      dataSource: report.dataSource,
      status: 'available',
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Stored report for pole ${report.poleNumber}`);
  } catch (error) {
    console.error(`❌ Failed to store report for pole ${report.poleNumber}:`, error.message);
    throw error;
  }
}

// Process poles in batches
async function processBatch(poles, poleMap, options) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (const poleNumber of poles) {
    try {
      const records = poleMap.get(poleNumber);
      if (!records) continue;
      
      console.log(`\n📊 Processing pole ${poleNumber} (${records.length} records)`);
      
      const report = await generatePoleReport(poleNumber, records);
      await storeReport(report, options.dryRun);
      
      results.successful++;
    } catch (error) {
      console.error(`❌ Failed to process pole ${poleNumber}:`, error.message);
      results.failed++;
      results.errors.push({ pole: poleNumber, error: error.message });
    }
  }
  
  return results;
}

// Main processing function
async function processPoleReports() {
  const startTime = Date.now();
  const options = parseArgs();
  
  console.log('\n🚀 Pole Reports Batch Processing');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Options:`, options);
  console.log('');
  
  try {
    // Load metadata
    const metadata = await loadMetadata();
    console.log('📂 Loading metadata...');
    
    // Determine CSV path
    const csvPath = options.csvPath || CONFIG.CSV_PATH;
    console.log(`📄 Using CSV: ${csvPath}`);
    
    // Check if file has changed
    const currentChecksum = await calculateChecksum(csvPath);
    if (!options.forceAll && currentChecksum === metadata.lastChecksum) {
      console.log('✅ CSV file unchanged since last processing. Exiting.');
      return;
    }
    
    // Read CSV data
    console.log('📖 Reading CSV data...');
    const records = await readCSV(csvPath);
    console.log(`   Found ${records.length} total records`);
    
    // Group by pole
    const poleMap = groupByPole(records);
    console.log(`   Found ${poleMap.size} unique poles`);
    
    // Detect changed poles
    console.log('🔍 Detecting changed poles...');
    let changedPoles = await detectChangedPoles(records, metadata);
    
    if (options.limit && changedPoles.length > options.limit) {
      changedPoles = changedPoles.slice(0, options.limit);
      console.log(`   Limited to ${options.limit} poles for testing`);
    }
    
    console.log(`   Found ${changedPoles.length} poles to process`);
    
    if (changedPoles.length === 0) {
      console.log('✅ No changes detected. Exiting.');
      return;
    }
    
    // Process in batches
    console.log(`\n📦 Processing ${changedPoles.length} poles in batches of ${CONFIG.BATCH_SIZE}...`);
    
    const allResults = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < changedPoles.length; i += CONFIG.BATCH_SIZE) {
      const batch = changedPoles.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(`\n📋 Batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} of ${Math.ceil(changedPoles.length / CONFIG.BATCH_SIZE)}`);
      
      const batchResults = await processBatch(batch, poleMap, options);
      allResults.successful += batchResults.successful;
      allResults.failed += batchResults.failed;
      allResults.errors.push(...batchResults.errors);
    }
    
    // Update metadata
    if (!options.dryRun) {
      console.log('\n💾 Updating metadata...');
      
      // Update processed poles
      for (const poleNumber of changedPoles) {
        if (poleMap.has(poleNumber)) {
          metadata.processedPoles[poleNumber] = {
            hash: calculateRecordsHash(poleMap.get(poleNumber)),
            lastProcessed: new Date().toISOString()
          };
        } else {
          // Pole was deleted
          delete metadata.processedPoles[poleNumber];
        }
      }
      
      metadata.lastProcessed = new Date().toISOString();
      metadata.lastChecksum = currentChecksum;
      
      // Add performance stats
      const duration = Date.now() - startTime;
      metadata.performanceStats.push({
        timestamp: new Date().toISOString(),
        duration,
        recordsProcessed: records.length,
        polesProcessed: changedPoles.length,
        successful: allResults.successful,
        failed: allResults.failed
      });
      
      // Keep only last 30 days of stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      metadata.performanceStats = metadata.performanceStats.filter(
        stat => new Date(stat.timestamp) > thirtyDaysAgo
      );
      
      await saveMetadata(metadata);
    }
    
    // Final report
    const duration = Date.now() - startTime;
    console.log('\n' + '='.repeat(60));
    console.log('📊 Batch Processing Complete');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`   Successful: ${allResults.successful}`);
    console.log(`   Failed: ${allResults.failed}`);
    
    if (allResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      allResults.errors.forEach(({ pole, error }) => {
        console.log(`   ${pole}: ${error}`);
      });
    }
    
    console.log('\n✅ Processing complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  processPoleReports().catch(console.error);
}

module.exports = { processPoleReports };