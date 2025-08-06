#!/usr/bin/env node

/**
 * Verify Pole Status History
 * 
 * Compare status history for a specific pole across:
 * 1. Master CSV (aggregated source)
 * 2. CSV change logs (daily progression)
 * 3. Staging database
 * 4. Production database (if synced)
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

// Initialize Firebase Admin
const stagingServiceAccount = require('../../config/service-accounts/vf-onemap-data-key.json');
const productionServiceAccount = require('../../config/service-accounts/fibreflow-73daf-key.json');

const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(stagingServiceAccount),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(productionServiceAccount),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

/**
 * Get pole history from CSV change logs
 */
async function getPoleHistoryFromCSVLogs(poleNumber) {
  const changeLogsDir = '/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/change-logs';
  const history = [];
  
  try {
    // Get all change log files
    const files = await fs.readdir(changeLogsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
    
    console.log(`📁 Checking ${jsonFiles.length} change log files...`);
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(changeLogsDir, file), 'utf-8');
      const changeData = JSON.parse(content);
      
      // Extract date from filename (changes_YYYY-MM-DD.json)
      const dateMatch = file.match(/changes_(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : 'unknown';
      
      // Check poles section
      if (changeData.poles) {
        // Check new poles
        if (changeData.poles.new && changeData.poles.new[poleNumber]) {
          history.push({
            date,
            type: 'new',
            data: changeData.poles.new[poleNumber]
          });
        }
        
        // Check modified poles
        if (changeData.poles.modified && changeData.poles.modified[poleNumber]) {
          history.push({
            date,
            type: 'modified',
            changes: changeData.poles.modified[poleNumber]
          });
        }
      }
    }
    
    return history;
  } catch (error) {
    console.error('Error reading change logs:', error);
    return [];
  }
}

/**
 * Get pole history from staging database
 */
async function getPoleHistoryFromStaging(poleNumber) {
  const history = [];
  
  try {
    // Get current status from processed records
    const processedSnapshot = await stagingDb.collection('vf-onemap-processed-records')
      .where('poleNumber', '==', poleNumber)
      .get();
    
    if (!processedSnapshot.empty) {
      processedSnapshot.forEach(doc => {
        const data = doc.data();
        history.push({
          source: 'processed-records',
          propertyId: data.propertyId,
          currentStatus: data.currentStatus || data.status,
          lastModified: data.lastModifiedDate,
          data
        });
      });
    }
    
    // Get status change history
    const changesSnapshot = await stagingDb.collection('vf-onemap-status-changes')
      .where('poleNumber', '==', poleNumber)
      .orderBy('changeDate', 'asc')
      .get();
    
    const statusChanges = [];
    changesSnapshot.forEach(doc => {
      const data = doc.data();
      statusChanges.push({
        date: data.changeDate,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        agent: data.agent,
        propertyId: data.propertyId,
        dropNumber: data.dropNumber
      });
    });
    
    if (statusChanges.length > 0) {
      history.push({
        source: 'status-changes',
        changes: statusChanges
      });
    }
    
    return history;
  } catch (error) {
    console.error('Error fetching from staging:', error);
    return [];
  }
}

/**
 * Get pole history from production database
 */
async function getPoleHistoryFromProduction(poleNumber) {
  const history = [];
  
  try {
    // Get pole document
    const poleDoc = await productionDb.collection('planned-poles').doc(poleNumber).get();
    
    if (poleDoc.exists) {
      const data = poleDoc.data();
      history.push({
        source: 'planned-poles',
        currentStatus: data.currentStatus,
        lastUpdated: data.lastUpdated,
        syncMetadata: data.syncMetadata,
        data
      });
      
      // Get status history subcollection
      const historySnapshot = await productionDb.collection('planned-poles')
        .doc(poleNumber)
        .collection('statusHistory')
        .orderBy('changeDate', 'asc')
        .get();
      
      const statusHistory = [];
      historySnapshot.forEach(doc => {
        statusHistory.push(doc.data());
      });
      
      if (statusHistory.length > 0) {
        history.push({
          source: 'statusHistory',
          changes: statusHistory
        });
      }
    }
    
    return history;
  } catch (error) {
    // Pole might not be synced yet
    return [];
  }
}

/**
 * Get pole from master CSV
 */
async function getPoleFromMasterCSV(poleNumber) {
  const masterCSVPath = '/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/master/master_csv_latest.csv';
  
  try {
    const content = await fs.readFile(masterCSVPath, 'utf-8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });
    
    return records.filter(r => r['Pole Number'] === poleNumber);
  } catch (error) {
    console.error('Error reading master CSV:', error);
    return [];
  }
}

/**
 * Main verification function
 */
async function verifyPoleStatusHistory(poleNumber) {
  console.log(`\n🔍 Verifying Status History for Pole: ${poleNumber}`);
  console.log('=' * 70);
  
  // 1. Get history from all sources
  console.log('\n📊 Gathering data from all sources...\n');
  
  // CSV Sources
  console.log('1️⃣ Master CSV...');
  const masterCSVRecords = await getPoleFromMasterCSV(poleNumber);
  console.log(`   Found ${masterCSVRecords.length} records in master CSV`);
  
  console.log('\n2️⃣ CSV Change Logs...');
  const csvHistory = await getPoleHistoryFromCSVLogs(poleNumber);
  console.log(`   Found ${csvHistory.length} change entries`);
  
  // Database Sources  
  console.log('\n3️⃣ Staging Database...');
  const stagingHistory = await getPoleHistoryFromStaging(poleNumber);
  console.log(`   Found ${stagingHistory.length} data sources in staging`);
  
  console.log('\n4️⃣ Production Database...');
  const productionHistory = await getPoleHistoryFromProduction(poleNumber);
  console.log(`   Found ${productionHistory.length} data sources in production`);
  
  // 2. Display comprehensive history
  console.log('\n' + '=' * 70);
  console.log('📋 COMPREHENSIVE STATUS HISTORY');
  console.log('=' * 70);
  
  // Master CSV Records
  if (masterCSVRecords.length > 0) {
    console.log('\n🗂️  Master CSV Records:');
    masterCSVRecords.forEach(record => {
      console.log(`   Property: ${record['Property ID']}`);
      console.log(`   Status: ${record['Status']}`);
      console.log(`   Drop: ${record['Drop Number'] || 'N/A'}`);
      console.log(`   Agent: ${record['Field Agent Name (pole permission)'] || 'N/A'}`);
      console.log(`   Address: ${record['Address']}`);
      console.log('   ---');
    });
  }
  
  // CSV Change History
  if (csvHistory.length > 0) {
    console.log('\n📈 CSV Daily Progression:');
    csvHistory.forEach(entry => {
      console.log(`   ${entry.date}: ${entry.type}`);
      if (entry.type === 'new') {
        console.log(`     First seen with status: ${entry.data.status}`);
      } else if (entry.changes) {
        Object.entries(entry.changes).forEach(([field, change]) => {
          console.log(`     ${field}: ${change.old} → ${change.new}`);
        });
      }
    });
  }
  
  // Staging Database
  if (stagingHistory.length > 0) {
    console.log('\n💾 Staging Database:');
    
    // Current status
    const processed = stagingHistory.find(h => h.source === 'processed-records');
    if (processed) {
      console.log('   Current Status:');
      console.log(`     Status: ${processed.currentStatus}`);
      console.log(`     Property: ${processed.propertyId}`);
    }
    
    // Status history
    const changes = stagingHistory.find(h => h.source === 'status-changes');
    if (changes && changes.changes.length > 0) {
      console.log('   Status Changes:');
      changes.changes.forEach(change => {
        console.log(`     ${change.date}: ${change.fromStatus} → ${change.toStatus}`);
        console.log(`       Agent: ${change.agent || 'N/A'}, Drop: ${change.dropNumber || 'N/A'}`);
      });
    }
  }
  
  // Production Database
  if (productionHistory.length > 0) {
    console.log('\n🚀 Production Database:');
    
    const poleData = productionHistory.find(h => h.source === 'planned-poles');
    if (poleData) {
      console.log('   Current Status:', poleData.currentStatus);
      console.log('   Sync Type:', poleData.syncMetadata?.syncType || 'unknown');
      console.log('   Last Sync:', poleData.syncMetadata?.lastSyncDate?.toDate?.() || 'unknown');
    }
    
    const statusHist = productionHistory.find(h => h.source === 'statusHistory');
    if (statusHist && statusHist.changes.length > 0) {
      console.log('   Synced Status History:', statusHist.changes.length, 'entries');
    }
  }
  
  // 3. Validation Summary
  console.log('\n' + '=' * 70);
  console.log('✅ VALIDATION SUMMARY');
  console.log('=' * 70);
  
  const issues = [];
  
  // Check if pole exists in master CSV
  if (masterCSVRecords.length === 0) {
    issues.push('❌ Pole not found in master CSV');
  }
  
  // Check if staging matches CSV
  if (stagingHistory.length === 0) {
    issues.push('❌ Pole not found in staging database');
  }
  
  // Check sync status
  if (productionHistory.length === 0) {
    issues.push('⚠️  Pole not yet synced to production');
  }
  
  if (issues.length === 0) {
    console.log('✅ All sources have data for this pole');
    console.log('✅ Status history is being tracked');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  return {
    poleNumber,
    masterCSV: masterCSVRecords,
    csvHistory,
    stagingHistory,
    productionHistory,
    issues
  };
}

// Command line interface
if (require.main === module) {
  const poleNumber = process.argv[2];
  
  if (!poleNumber) {
    console.log('Usage: node verify-pole-status-history.js <POLE_NUMBER>');
    console.log('Example: node verify-pole-status-history.js LAW.P.C654');
    process.exit(1);
  }
  
  verifyPoleStatusHistory(poleNumber)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { verifyPoleStatusHistory };