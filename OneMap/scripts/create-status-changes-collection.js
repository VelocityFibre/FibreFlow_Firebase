#!/usr/bin/env node

/**
 * Create Status Changes Collection
 * Extracts all status changes from embedded arrays into a queryable collection
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function createStatusChangesCollection() {
  try {
    console.log('🚀 Creating status changes collection...\n');
    
    // Fetch all records with status history
    const snapshot = await db.collection('vf-onemap-processed-records').get();
    console.log(`📊 Processing ${snapshot.size} properties...\n`);
    
    let batch = db.batch();
    let changeCount = 0;
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      const record = doc.data();
      const propertyId = doc.id;
      
      if (record.statusHistory && record.statusHistory.length > 0) {
        // Process each status change
        for (let i = 0; i < record.statusHistory.length; i++) {
          const change = record.statusHistory[i];
          const previousStatus = i > 0 ? record.statusHistory[i-1].status : 'Initial';
          const previousDate = i > 0 ? record.statusHistory[i-1].date : null;
          
          // Calculate days in previous status
          let daysInPreviousStatus = null;
          if (previousDate && change.date) {
            const prev = new Date(previousDate);
            const curr = new Date(change.date);
            daysInPreviousStatus = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
          }
          
          // Create status change document
          const changeDoc = {
            // Core fields
            propertyId: propertyId,
            changeIndex: i,
            
            // Status transition
            fromStatus: previousStatus,
            toStatus: change.status || 'No Status',
            
            // Timing
            changeDate: change.date,
            importTimestamp: change.timestamp,
            daysInPreviousStatus: daysInPreviousStatus,
            
            // Context
            agent: change.agent || 'No Agent',
            importBatch: change.batchId,
            sourceFile: change.fileName,
            
            // Property context
            poleNumber: record.poleNumber || 'No Pole',
            dropNumber: record.dropNumber || '',
            locationAddress: record.locationAddress || '',
            
            // Metadata
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isInitialStatus: i === 0,
            isLatestStatus: i === record.statusHistory.length - 1
          };
          
          // Add to batch
          const changeId = `${propertyId}_${i}_${change.date}`;
          const changeRef = db.collection('vf-onemap-status-changes').doc(changeId);
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
    
    console.log('\n✨ Status changes collection created!');
    console.log(`📊 Total status changes: ${changeCount}`);
    console.log(`🔍 Collection: vf-onemap-status-changes`);
    console.log('\nYou can now query status changes directly!');
    
    // Create some useful indexes
    console.log('\n📇 Creating indexes for common queries...');
    // Note: These would typically be created in Firebase Console
    console.log('Recommended indexes:');
    console.log('- changeDate + toStatus');
    console.log('- agent + changeDate');
    console.log('- fromStatus + toStatus');
    console.log('- poleNumber + changeDate');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

// Run the migration
createStatusChangesCollection();