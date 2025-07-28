#!/usr/bin/env node

/**
 * Create Pole Status Changes Collection for FibreFlow Production
 * Extracts status history from pole tracker documents into queryable collection
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function createPoleStatusChangesCollection() {
  try {
    console.log('🚀 Creating pole status changes collection for FibreFlow...\n');
    console.log('📊 Database: fibreflow-73daf (Production)');
    console.log('📁 Source: planned-poles collection');
    console.log('📁 Target: pole-status-changes collection\n');
    
    // Fetch all poles with status history
    const snapshot = await db.collection('planned-poles').get();
    console.log(`📊 Processing ${snapshot.size} poles...\n`);
    
    let batch = db.batch();
    let changeCount = 0;
    let batchCount = 0;
    let polesWithHistory = 0;
    
    for (const doc of snapshot.docs) {
      const pole = doc.data();
      const poleId = doc.id;
      
      if (pole.statusHistory && pole.statusHistory.length > 0) {
        polesWithHistory++;
        
        // Process each status change
        for (let i = 0; i < pole.statusHistory.length; i++) {
          const change = pole.statusHistory[i];
          const previousStatus = i > 0 ? pole.statusHistory[i-1].status : 'Initial';
          const previousDate = i > 0 ? pole.statusHistory[i-1].changedAt : null;
          
          // Calculate days in previous status
          let daysInPreviousStatus = null;
          if (previousDate && change.changedAt) {
            const prev = previousDate.toDate ? previousDate.toDate() : new Date(previousDate);
            const curr = change.changedAt.toDate ? change.changedAt.toDate() : new Date(change.changedAt);
            daysInPreviousStatus = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
          }
          
          // Get the timestamp
          const changeTimestamp = change.changedAt?.toDate ? change.changedAt.toDate() : new Date(change.changedAt);
          const changeDate = changeTimestamp.toISOString().split('T')[0];
          
          // Create status change document
          const changeDoc = {
            // Core fields
            poleId: poleId,
            vfPoleId: pole.vfPoleId || '',
            changeIndex: i,
            
            // Status transition
            fromStatus: previousStatus,
            toStatus: change.status || 'No Status',
            
            // Timing
            changeDate: changeDate,
            changedAt: change.changedAt,
            daysInPreviousStatus: daysInPreviousStatus,
            
            // Context
            changedBy: change.changedBy || '',
            changedByName: change.changedByName || 'System',
            source: change.source || 'Unknown',
            importBatchId: change.importBatchId || '',
            notes: change.notes || '',
            
            // Pole context
            poleNumber: pole.poleNumber || '',
            projectId: pole.projectId || '',
            projectCode: pole.projectCode || '',
            projectName: pole.projectName || '',
            zone: pole.zone || '',
            location: pole.location || '',
            contractorId: pole.contractorId || '',
            contractorName: pole.contractorName || '',
            
            // Drop information
            connectedDrops: pole.connectedDrops || [],
            dropCount: pole.dropCount || 0,
            
            // Metadata
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isInitialStatus: i === 0,
            isLatestStatus: i === pole.statusHistory.length - 1
          };
          
          // Add to batch
          const changeId = `${poleId}_${i}_${changeDate}`;
          const changeRef = db.collection('pole-status-changes').doc(changeId);
          batch.set(changeRef, changeDoc);
          
          changeCount++;
          
          // Commit batch every 500 documents
          if (changeCount % 500 === 0) {
            await batch.commit();
            batchCount++;
            console.log(`✅ Committed batch ${batchCount} (${changeCount} changes so far)...`);
            // Start new batch
            batch = db.batch();
          }
        }
      }
    }
    
    // Commit final batch
    if (changeCount % 500 !== 0) {
      await batch.commit();
      console.log(`✅ Committed final batch...`);
    }
    
    console.log('\n✨ Pole status changes collection created!');
    console.log(`📊 Summary:`);
    console.log(`   - Total poles processed: ${snapshot.size}`);
    console.log(`   - Poles with history: ${polesWithHistory}`);
    console.log(`   - Total status changes: ${changeCount}`);
    console.log(`🔍 Collection: pole-status-changes`);
    console.log(`🌐 Database: fibreflow-73daf (Production)`);
    console.log('\nYou can now query pole status changes directly in FibreFlow!');
    
    // Create some useful indexes
    console.log('\n📇 Creating indexes for common queries...');
    console.log('Recommended indexes (create in Firebase Console):');
    console.log('- changedAt + toStatus');
    console.log('- changedBy + changeDate');
    console.log('- fromStatus + toStatus');
    console.log('- poleNumber + changeDate');
    console.log('- projectId + changeDate');
    console.log('- contractorId + changeDate');
    console.log('- zone + changeDate');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

// Run the migration
createPoleStatusChangesCollection();