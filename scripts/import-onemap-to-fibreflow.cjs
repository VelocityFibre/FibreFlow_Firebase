#!/usr/bin/env node

/**
 * Import OneMap Status History to FibreFlow Production
 * Bridges data from vf-onemap-data to fibreflow-73daf
 */

const admin = require('firebase-admin');

// Initialize both Firebase projects
const oneMapApp = admin.initializeApp({
  projectId: 'vf-onemap-data'
}, 'onemap');

const fibreFlowApp = admin.initializeApp({
  projectId: 'fibreflow-73daf'
}, 'fibreflow');

const oneMapDb = admin.firestore(oneMapApp);
const fibreFlowDb = admin.firestore(fibreFlowApp);

async function importOneMapToFibreFlow(options = {}) {
  const { 
    dryRun = false, 
    limit = null,
    poleNumber = null,
    onlyWithHistory = false 
  } = options;
  
  console.log('🌉 OneMap to FibreFlow Import Bridge\n');
  console.log('📊 Source: vf-onemap-data');
  console.log('🎯 Target: fibreflow-73daf');
  console.log(`📋 Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
  if (limit) console.log(`📦 Limit: ${limit} records`);
  if (poleNumber) console.log(`🔍 Filter: Pole ${poleNumber}`);
  if (onlyWithHistory) console.log(`🔄 Only poles with status history`);
  console.log('\n' + '='.repeat(60) + '\n');
  
  try {
    // Step 1: Fetch OneMap data
    console.log('📥 Fetching OneMap data...');
    let query = oneMapDb.collection('vf-onemap-processed-records');
    
    if (poleNumber) {
      query = query.where('poleNumber', '==', poleNumber);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const oneMapSnapshot = await query.get();
    console.log(`Found ${oneMapSnapshot.size} OneMap records\n`);
    
    // Step 2: Process each record
    let processed = 0;
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const batch = fibreFlowDb.batch();
    let batchCount = 0;
    
    for (const doc of oneMapSnapshot.docs) {
      const oneMapData = doc.data();
      const propertyId = doc.id;
      
      // Skip if no pole number
      if (!oneMapData.poleNumber || oneMapData.poleNumber === 'No Pole') {
        skipped++;
        continue;
      }
      
      // Skip if no history and onlyWithHistory is true
      if (onlyWithHistory && (!oneMapData.statusHistory || oneMapData.statusHistory.length === 0)) {
        skipped++;
        continue;
      }
      
      processed++;
      
      // Find corresponding pole in FibreFlow by pole number
      const fibreFlowQuery = await fibreFlowDb.collection('planned-poles')
        .where('poleNumber', '==', oneMapData.poleNumber)
        .limit(1)
        .get();
      
      if (!fibreFlowQuery.empty) {
        // Pole exists in FibreFlow - update it
        const fibreFlowDoc = fibreFlowQuery.docs[0];
        const fibreFlowPole = fibreFlowDoc.data();
        
        // Build status history
        const statusHistory = [];
        
        // Add existing FibreFlow history if any
        if (fibreFlowPole.statusHistory) {
          statusHistory.push(...fibreFlowPole.statusHistory);
        }
        
        // Convert OneMap history to FibreFlow format
        if (oneMapData.statusHistory && oneMapData.statusHistory.length > 0) {
          for (const entry of oneMapData.statusHistory) {
            // Check if this entry already exists (by date and status)
            const exists = statusHistory.some(h => 
              h.status === entry.status && 
              h.source === `OneMap Import - ${entry.fileName}`
            );
            
            if (!exists) {
              statusHistory.push({
                status: entry.status,
                changedAt: admin.firestore.Timestamp.fromDate(new Date(entry.timestamp)),
                changedBy: 'onemap-import',
                changedByName: entry.agent || 'OneMap System',
                source: `OneMap Import - ${entry.fileName}`,
                importBatchId: entry.batchId,
                notes: `Property ${propertyId} - ${oneMapData.locationAddress || ''}`,
                previousStatus: statusHistory.length > 0 ? statusHistory[statusHistory.length - 1].status : 'Initial'
              });
            }
          }
        }
        
        // Sort by date
        statusHistory.sort((a, b) => {
          const dateA = a.changedAt.toDate ? a.changedAt.toDate() : new Date(a.changedAt);
          const dateB = b.changedAt.toDate ? b.changedAt.toDate() : new Date(b.changedAt);
          return dateA - dateB;
        });
        
        // Update the pole
        const updateData = {
          status: oneMapData.currentStatus || oneMapData['Status Update'] || fibreFlowPole.status,
          statusHistory: statusHistory,
          lastOneMapSync: admin.firestore.FieldValue.serverTimestamp(),
          oneMapPropertyIds: admin.firestore.FieldValue.arrayUnion(propertyId)
        };
        
        // Add location if missing
        if (!fibreFlowPole.location && oneMapData.locationAddress) {
          updateData.location = oneMapData.locationAddress;
        }
        
        if (!dryRun) {
          batch.update(fibreFlowDoc.ref, updateData);
          batchCount++;
          
          // Commit batch every 100 updates
          if (batchCount >= 100) {
            await batch.commit();
            console.log(`✅ Committed batch of ${batchCount} updates...`);
            batchCount = 0;
          }
        }
        
        updated++;
        
        console.log(`✅ ${dryRun ? '[DRY RUN] Would update' : 'Updated'} pole ${oneMapData.poleNumber}`);
        if (statusHistory.length > 0) {
          console.log(`   Status history: ${statusHistory.length} entries`);
          console.log(`   Current status: ${updateData.status}`);
        }
        
      } else {
        // Pole doesn't exist in FibreFlow
        console.log(`⚠️  Pole ${oneMapData.poleNumber} not found in FibreFlow`);
        
        // Optional: Create new pole (uncomment if desired)
        /*
        if (!dryRun) {
          const newPole = {
            poleNumber: oneMapData.poleNumber,
            vfPoleId: oneMapData.poleNumber,
            status: oneMapData.currentStatus || 'Imported from OneMap',
            location: oneMapData.locationAddress || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'onemap-import',
            createdByName: 'OneMap Import',
            source: 'OneMap Import',
            // ... other required fields
          };
          
          await fibreFlowDb.collection('planned-poles').add(newPole);
          created++;
        }
        */
      }
    }
    
    // Final batch commit
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates...`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log(`   Total OneMap records: ${oneMapSnapshot.size}`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Updated in FibreFlow: ${updated}`);
    console.log(`   Created in FibreFlow: ${created}`);
    console.log(`   Skipped (no pole/history): ${skipped}`);
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made');
      console.log('💡 Run without --dry-run to apply changes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  limit: null,
  poleNumber: null,
  onlyWithHistory: args.includes('--only-with-history')
};

// Parse limit
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  options.limit = parseInt(args[limitIndex + 1]);
}

// Parse pole number
const poleIndex = args.indexOf('--pole');
if (poleIndex !== -1 && args[poleIndex + 1]) {
  options.poleNumber = args[poleIndex + 1];
}

// Show help
if (args.includes('--help')) {
  console.log('Usage: node import-onemap-to-fibreflow.cjs [options]');
  console.log('\nOptions:');
  console.log('  --dry-run           Preview changes without applying them');
  console.log('  --limit <n>         Process only n records');
  console.log('  --pole <number>     Process only specific pole number');
  console.log('  --only-with-history Only import poles that have status history');
  console.log('  --help              Show this help message');
  console.log('\nExamples:');
  console.log('  node import-onemap-to-fibreflow.cjs --dry-run --limit 10');
  console.log('  node import-onemap-to-fibreflow.cjs --pole LAW.P.C518');
  console.log('  node import-onemap-to-fibreflow.cjs --only-with-history');
  process.exit(0);
}

// Run import
importOneMapToFibreFlow(options)
  .then(() => {
    console.log('\n✨ Import bridge process complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });