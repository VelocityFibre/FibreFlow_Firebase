#!/usr/bin/env node

/**
 * Cleanup duplicate poles in VF OneMap database
 * This script:
 * 1. Finds all duplicate poles (same poleNumber, different doc IDs)
 * 2. Identifies the "master" document (most complete data)
 * 3. Merges data from duplicates into master
 * 4. Deletes duplicate documents
 * 5. Generates a cleanup report
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Helper function to count non-empty fields
function countNonEmptyFields(data) {
  let count = 0;
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && value !== '') {
      count++;
    }
  }
  return count;
}

// Helper function to merge data, preferring non-empty values
function mergeData(master, duplicate) {
  const merged = { ...master };
  
  for (const [key, value] of Object.entries(duplicate)) {
    // If master doesn't have this field or it's empty, take from duplicate
    if (!merged[key] || merged[key] === '' || merged[key] === null) {
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value;
      }
    }
  }
  
  return merged;
}

// Helper to determine the best master document
function selectMasterDocument(documents) {
  let bestDoc = documents[0];
  let bestScore = 0;

  for (const doc of documents) {
    let score = 0;
    
    // Score based on completeness
    score += countNonEmptyFields(doc.data);
    
    // Prefer documents with these important fields
    if (doc.data.latitude && doc.data.longitude) score += 10;
    if (doc.data.dropNumber) score += 5;
    if (doc.data.statusUpdate) score += 5;
    if (doc.data.lastModifiedDate) score += 3;
    if (doc.data.fieldAgentNamePolePermission) score += 3;
    
    // Prefer older property IDs (likely original)
    const propId = parseInt(doc.data.propertyId || '999999999');
    score -= propId / 1000000; // Lower property IDs get higher score
    
    if (score > bestScore) {
      bestScore = score;
      bestDoc = doc;
    }
  }
  
  return bestDoc;
}

async function cleanupDuplicates(dryRun = true) {
  console.log('🧹 DUPLICATE POLE CLEANUP SCRIPT');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (will delete duplicates)'}`);
  console.log('Database: vf-onemap-data');
  console.log('=' .repeat(80) + '\n');

  const startTime = Date.now();
  const report = {
    startTime: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'live',
    database: 'vf-onemap-data',
    collection: 'vf-onemap-processed-records',
    statistics: {
      totalRecords: 0,
      recordsWithPoles: 0,
      uniquePoles: 0,
      duplicatePoles: 0,
      affectedRecords: 0,
      documentsDeleted: 0,
      documentsMerged: 0,
      errors: 0
    },
    cleanupDetails: [],
    errors: []
  };

  try {
    // Map to store pole numbers and their documents
    const poleMap = new Map();
    
    console.log('📊 Phase 1: Scanning for duplicates...\n');
    
    // Process in batches to avoid timeouts
    let lastDocId = null;
    let batchCount = 0;
    const batchSize = 500;
    
    while (true) {
      let query = db.collection('vf-onemap-processed-records')
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(batchSize);
      
      if (lastDocId) {
        query = query.startAfter(lastDocId);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) break;
      
      batchCount++;
      console.log(`Processing batch ${batchCount} (${snapshot.size} records)...`);
      
      snapshot.forEach(doc => {
        report.statistics.totalRecords++;
        const data = doc.data();
        const poleNumber = data.poleNumber || data['Pole Number'] || '';
        
        if (poleNumber && poleNumber.trim()) {
          report.statistics.recordsWithPoles++;
          const normalizedPole = poleNumber.trim().toUpperCase();
          
          if (!poleMap.has(normalizedPole)) {
            poleMap.set(normalizedPole, []);
            report.statistics.uniquePoles++;
          }
          
          poleMap.get(normalizedPole).push({
            id: doc.id,
            data: data
          });
        }
      });
      
      lastDocId = snapshot.docs[snapshot.docs.length - 1].id;
    }
    
    console.log(`\n✅ Scan complete: ${report.statistics.totalRecords} records processed`);
    console.log(`   Records with poles: ${report.statistics.recordsWithPoles}`);
    console.log(`   Unique pole numbers: ${report.statistics.uniquePoles}\n`);
    
    // Phase 2: Process duplicates
    console.log('🔧 Phase 2: Processing duplicates...\n');
    
    const duplicatePoles = [];
    for (const [poleNumber, docs] of poleMap.entries()) {
      if (docs.length > 1) {
        duplicatePoles.push({ poleNumber, documents: docs });
        report.statistics.duplicatePoles++;
        report.statistics.affectedRecords += docs.length;
      }
    }
    
    console.log(`Found ${report.statistics.duplicatePoles} poles with duplicates`);
    console.log(`Total affected records: ${report.statistics.affectedRecords}\n`);
    
    if (duplicatePoles.length === 0) {
      console.log('✨ No duplicates found! Database is clean.');
      return report;
    }
    
    // Process each duplicate group
    console.log('🔄 Phase 3: Merging and cleaning duplicates...\n');
    
    let processed = 0;
    for (const { poleNumber, documents } of duplicatePoles) {
      processed++;
      
      if (processed % 100 === 0) {
        console.log(`Progress: ${processed}/${duplicatePoles.length} poles processed...`);
      }
      
      try {
        // Select master document
        const master = selectMasterDocument(documents);
        
        // Merge data from all duplicates
        let mergedData = { ...master.data };
        const duplicatesToDelete = [];
        
        for (const doc of documents) {
          if (doc.id !== master.id) {
            mergedData = mergeData(mergedData, doc.data);
            duplicatesToDelete.push(doc.id);
          }
        }
        
        // Record cleanup details
        const cleanupDetail = {
          poleNumber,
          masterId: master.id,
          mergedFields: Object.keys(mergedData).length,
          duplicatesRemoved: duplicatesToDelete.length,
          deletedIds: duplicatesToDelete
        };
        
        // Perform cleanup (if not dry run)
        if (!dryRun) {
          // Update master with merged data
          await db.collection('vf-onemap-processed-records')
            .doc(master.id)
            .update(mergedData);
          
          // Delete duplicates
          const batch = db.batch();
          for (const docId of duplicatesToDelete) {
            batch.delete(db.collection('vf-onemap-processed-records').doc(docId));
          }
          await batch.commit();
          
          report.statistics.documentsMerged++;
          report.statistics.documentsDeleted += duplicatesToDelete.length;
        }
        
        report.cleanupDetails.push(cleanupDetail);
        
      } catch (error) {
        report.statistics.errors++;
        report.errors.push({
          poleNumber,
          error: error.message
        });
        console.error(`❌ Error processing pole ${poleNumber}:`, error.message);
      }
    }
    
    // Generate report
    console.log('\n\n📝 CLEANUP SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE RUN'}`);
    console.log(`Total records scanned: ${report.statistics.totalRecords.toLocaleString()}`);
    console.log(`Unique poles: ${report.statistics.uniquePoles.toLocaleString()}`);
    console.log(`Poles with duplicates: ${report.statistics.duplicatePoles.toLocaleString()}`);
    console.log(`Records affected: ${report.statistics.affectedRecords.toLocaleString()}`);
    
    if (!dryRun) {
      console.log(`\n✅ CLEANUP COMPLETED:`);
      console.log(`Documents merged: ${report.statistics.documentsMerged.toLocaleString()}`);
      console.log(`Documents deleted: ${report.statistics.documentsDeleted.toLocaleString()}`);
    } else {
      console.log(`\n⚠️  DRY RUN - No changes made`);
      console.log(`Would merge: ${report.statistics.duplicatePoles.toLocaleString()} documents`);
      console.log(`Would delete: ${(report.statistics.affectedRecords - report.statistics.duplicatePoles).toLocaleString()} documents`);
    }
    
    if (report.statistics.errors > 0) {
      console.log(`\n⚠️  Errors encountered: ${report.statistics.errors}`);
    }
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, '..', 'reports', `cleanup-report-${timestamp}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    report.endTime = new Date().toISOString();
    report.duration = `${((Date.now() - startTime) / 1000).toFixed(2)} seconds`;
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    report.errors.push({
      type: 'fatal',
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await admin.app().delete();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isLiveRun = args.includes('--live') || args.includes('--execute');
  
  if (!isLiveRun) {
    console.log('\n⚠️  Running in DRY RUN mode. No changes will be made.');
    console.log('To execute cleanup, run with --live flag:');
    console.log('  node cleanup-duplicate-poles.js --live\n');
  } else {
    console.log('\n⚠️  LIVE RUN - This will modify the database!');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  try {
    await cleanupDuplicates(!isLiveRun);
    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main();