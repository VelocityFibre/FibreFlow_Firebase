#!/usr/bin/env node

/**
 * CROSS-REFERENCE VERIFICATION SYSTEM
 * Created: 2025-08-05
 * 
 * Purpose: Verify database status history matches CSV source files
 * This ensures our imports are accurate and catches any discrepancies
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Initialize Firebase
const serviceAccount = require('../../credentials/vf-onemap-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

/**
 * Build complete status timeline from CSV files
 */
async function buildCSVTimeline(csvDirectory) {
  console.log('📁 Building timeline from CSV files...\n');
  
  const timeline = new Map(); // propertyId -> array of status entries
  const csvFiles = fs.readdirSync(csvDirectory)
    .filter(f => f.endsWith('.csv'))
    .sort(); // Process chronologically
  
  for (const fileName of csvFiles) {
    console.log(`📄 Processing: ${fileName}`);
    const filePath = path.join(csvDirectory, fileName);
    
    // Extract date from filename (e.g., "09052025" -> 2025-05-09)
    const dateMatch = fileName.match(/(\d{2})(\d{2})(\d{4})/);
    const fileDate = dateMatch ? 
      `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : 
      new Date().toISOString().split('T')[0];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          const propertyId = (row['Property ID'] || row['﻿Property ID'] || '').toString().trim();
          const status = (row['Status'] || '').toString().trim();
          
          if (propertyId && status) {
            if (!timeline.has(propertyId)) {
              timeline.set(propertyId, []);
            }
            
            timeline.get(propertyId).push({
              date: fileDate,
              status: status,
              fileName: fileName,
              agent: (row['Field Agent Name'] || '').toString().trim()
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }
  
  // Sort each property's timeline by date
  for (const [propertyId, entries] of timeline) {
    entries.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  return timeline;
}

/**
 * Extract actual status changes from timeline
 */
function extractStatusChanges(timeline) {
  const changes = [];
  let previousStatus = null;
  
  for (let i = 0; i < timeline.length; i++) {
    const current = timeline[i];
    
    if (i === 0) {
      // First appearance
      changes.push({
        date: current.date,
        fromStatus: 'Initial',
        toStatus: current.status,
        fileName: current.fileName
      });
    } else if (previousStatus !== current.status) {
      // Status changed
      changes.push({
        date: current.date,
        fromStatus: previousStatus,
        toStatus: current.status,
        fileName: current.fileName
      });
    }
    
    previousStatus = current.status;
  }
  
  return changes;
}

/**
 * Compare database history with CSV timeline
 */
async function verifyProperty(propertyId, csvTimeline) {
  const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return {
      propertyId,
      status: 'MISSING',
      message: 'Property not found in database'
    };
  }
  
  const data = doc.data();
  const dbHistory = data.statusHistory || [];
  const csvChanges = extractStatusChanges(csvTimeline);
  
  // Compare counts
  if (dbHistory.length !== csvChanges.length) {
    return {
      propertyId,
      status: 'MISMATCH',
      message: `Database has ${dbHistory.length} changes, CSV shows ${csvChanges.length}`,
      dbHistory,
      csvChanges
    };
  }
  
  // Compare each change
  const mismatches = [];
  for (let i = 0; i < csvChanges.length; i++) {
    const csvChange = csvChanges[i];
    const dbChange = dbHistory[i];
    
    if (!dbChange || 
        dbChange.fromStatus !== csvChange.fromStatus ||
        dbChange.toStatus !== csvChange.toStatus) {
      mismatches.push({
        index: i,
        csv: csvChange,
        database: dbChange
      });
    }
  }
  
  if (mismatches.length > 0) {
    return {
      propertyId,
      status: 'MISMATCH',
      message: `${mismatches.length} status changes don't match`,
      mismatches
    };
  }
  
  // Verify current status
  const lastCSVStatus = csvTimeline[csvTimeline.length - 1].status;
  if (data.currentStatus !== lastCSVStatus) {
    return {
      propertyId,
      status: 'CURRENT_MISMATCH',
      message: `Current status mismatch - DB: ${data.currentStatus}, CSV: ${lastCSVStatus}`
    };
  }
  
  return {
    propertyId,
    status: 'VERIFIED',
    message: 'All status changes match CSV source'
  };
}

/**
 * Main verification process
 */
async function runVerification(csvDirectory, propertiesToCheck = null) {
  console.log('🔍 CROSS-REFERENCE VERIFICATION SYSTEM\n');
  console.log('=' .repeat(50));
  
  // Build complete timeline from CSVs
  const csvTimeline = await buildCSVTimeline(csvDirectory);
  console.log(`\n✅ Built timeline for ${csvTimeline.size} properties\n`);
  
  // Determine which properties to check
  let checkList;
  if (propertiesToCheck) {
    checkList = propertiesToCheck;
  } else {
    // Sample check - first 10 properties
    checkList = Array.from(csvTimeline.keys()).slice(0, 10);
  }
  
  // Verify each property
  const results = {
    verified: 0,
    mismatches: 0,
    missing: 0,
    errors: []
  };
  
  console.log(`Verifying ${checkList.length} properties...\n`);
  
  for (const propertyId of checkList) {
    const timeline = csvTimeline.get(propertyId);
    if (!timeline) {
      console.log(`❌ Property ${propertyId} not found in CSV files`);
      continue;
    }
    
    const result = await verifyProperty(propertyId, timeline);
    
    if (result.status === 'VERIFIED') {
      console.log(`✅ ${propertyId}: ${result.message}`);
      results.verified++;
    } else {
      console.log(`❌ ${propertyId}: ${result.message}`);
      if (result.status === 'MISSING') {
        results.missing++;
      } else {
        results.mismatches++;
      }
      results.errors.push(result);
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Verified: ${results.verified}`);
  console.log(`❌ Mismatches: ${results.mismatches}`);
  console.log(`❓ Missing: ${results.missing}`);
  console.log(`📋 Total Checked: ${checkList.length}`);
  
  // Save detailed report
  if (results.errors.length > 0) {
    const reportPath = path.join(__dirname, `verification-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
  
  return results;
}

// Command line usage
if (require.main === module) {
  const csvDirectory = process.argv[2] || path.join(__dirname, '../../downloads/Lawley Raw Stats');
  const propertiesToCheck = process.argv[3] ? process.argv[3].split(',') : null;
  
  runVerification(csvDirectory, propertiesToCheck)
    .then(() => {
      console.log('\n✅ Verification complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { runVerification, buildCSVTimeline, verifyProperty };