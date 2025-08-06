/**
 * BACKUP SCRIPT - Created 2025-08-05
 * Purpose: Backup corrupted data before clearing for fresh start
 * This preserves the evidence of phantom changes for future analysis
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../credentials/vf-onemap-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function backupCollection(collectionName, backupName) {
  console.log(`\n📦 Backing up ${collectionName} to ${backupName}...`);
  
  const sourceCollection = db.collection(collectionName);
  const backupCollection = db.collection(backupName);
  
  let count = 0;
  let batch = db.batch();
  const batchSize = 500;
  
  try {
    const snapshot = await sourceCollection.get();
    console.log(`Found ${snapshot.size} documents to backup`);
    
    for (const doc of snapshot.docs) {
      const backupDoc = backupCollection.doc(doc.id);
      batch.set(backupDoc, {
        ...doc.data(),
        _backupDate: new Date(),
        _originalCollection: collectionName
      });
      
      count++;
      
      if (count % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`Backed up ${count} documents...`);
      }
    }
    
    // Commit final batch
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Backed up ${count} documents from ${collectionName}`);
    return count;
    
  } catch (error) {
    console.error(`❌ Error backing up ${collectionName}:`, error);
    throw error;
  }
}

async function createBackup() {
  console.log('🔐 CREATING BACKUP BEFORE DATABASE CLEAR');
  console.log('📅 Date: 2025-08-05');
  console.log('🎯 Purpose: Preserve corrupted data for analysis\n');
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  
  try {
    // Backup main collections
    await backupCollection(
      'vf-onemap-processed-records', 
      `BACKUP_2025-08-05_processed-records_${timestamp}`
    );
    
    await backupCollection(
      'vf-onemap-status-changes',
      `BACKUP_2025-08-05_status-changes_${timestamp}`
    );
    
    // Create backup metadata
    await db.collection('_backups').add({
      timestamp: new Date(),
      reason: 'Pre-clear backup before fixing phantom status changes',
      collections: [
        `BACKUP_2025-08-05_processed-records_${timestamp}`,
        `BACKUP_2025-08-05_status-changes_${timestamp}`
      ],
      issue: 'Phantom status changes due to merge:true and memory corruption',
      createdBy: 'backup-before-clear-2025-08-05.js'
    });
    
    console.log('\n✅ BACKUP COMPLETE!');
    console.log('📁 Backup collections created with timestamp:', timestamp);
    console.log('\n🔔 You can now safely clear the original collections');
    
  } catch (error) {
    console.error('\n❌ BACKUP FAILED:', error);
    console.error('⚠️  DO NOT PROCEED WITH CLEARING!');
  }
}

// Run backup
createBackup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));