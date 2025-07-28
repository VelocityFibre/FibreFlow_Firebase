#!/usr/bin/env node

/**
 * vf-onemap-data Import Using Firebase Client SDK
 * ===============================================
 * 
 * Uses Firebase client SDK with admin user authentication
 */

const fs = require('fs');
const path = require('path');

// Use the import syntax compatible with CommonJS
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  writeBatch
} = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration for vf-onemap-data
const VF_ONEMAP_CONFIG = {
  apiKey: "AIzaSyBYourActualAPIKey", // You'll need to provide this
  authDomain: "vf-onemap-data.firebaseapp.com",
  projectId: "vf-onemap-data",
  storageBucket: "vf-onemap-data.appspot.com",
  messagingSenderId: "YourSenderID",
  appId: "YourAppID"
};

// Collection names
const COLLECTIONS = {
  processedRecords: 'vf-onemap-processed-records',
  importBatches: 'vf-onemap-import-batches',
  importReports: 'vf-onemap-import-reports',
  changeHistory: 'vf-onemap-change-history',
  preImportReports: 'vf-onemap-pre-import-reports',
  postImportReports: 'vf-onemap-post-import-reports'
};

// Import the CSV parsing function
const { parseCSV } = require('./demo-production-import');

/**
 * Initialize Firebase and authenticate
 */
async function initializeFirebase() {
  console.log('🔥 Initializing vf-onemap-data Firebase...');
  
  const app = initializeApp(VF_ONEMAP_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  try {
    // Sign in with admin credentials
    console.log('🔐 Authenticating as admin user...');
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      'louis@velocityfibreapp.com',
      'YourPasswordHere' // You'll need to provide this
    );
    
    console.log('✅ Authenticated as:', userCredential.user.email);
    return db;
    
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

/**
 * Main import function
 */
async function runImport() {
  const csvFile = 'Lawley May Week 3 22052025 - First Report.csv';
  const batchId = `IMPORT_${Date.now()}`;
  
  console.log('🚀 vf-onemap-data Import System');
  console.log('===============================');
  console.log('');
  
  try {
    // Initialize Firebase
    const db = await initializeFirebase();
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../OneMap/downloads', csvFile);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvFile}`);
    }
    
    console.log(`📁 Reading: ${csvFile}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const csvRecords = parseCSV(csvContent);
    console.log(`📊 Parsed ${csvRecords.length} records`);
    
    // Process records
    console.log('🔄 Importing to vf-onemap-data...');
    const batch = writeBatch(db);
    let batchCount = 0;
    let newRecords = 0;
    
    for (const record of csvRecords) {
      const docRef = doc(db, COLLECTIONS.processedRecords, record.propertyId);
      
      const importRecord = {
        ...record,
        importDate: Timestamp.now(),
        importBatchId: batchId,
        sourceFile: csvFile,
        lastUpdated: Timestamp.now()
      };
      
      batch.set(docRef, importRecord, { merge: true });
      batchCount++;
      newRecords++;
      
      // Commit batch every 500 operations (Firestore limit)
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`📦 Committed batch of ${batchCount} operations`);
        batchCount = 0;
      }
    }
    
    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Committed final batch of ${batchCount} operations`);
    }
    
    console.log('');
    console.log('✅ IMPORT COMPLETE');
    console.log('==================');
    console.log(`Total Records Imported: ${newRecords}`);
    console.log(`Batch ID: ${batchId}`);
    console.log('');
    console.log('📊 Data is now in vf-onemap-data Firebase!');
    console.log('Check at: https://console.firebase.google.com/project/vf-onemap-data/firestore');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.log('');
    console.log('📋 SETUP REQUIRED:');
    console.log('1. Get the Firebase config from vf-onemap-data project settings');
    console.log('2. Update VF_ONEMAP_CONFIG with actual values');
    console.log('3. Enable Email/Password auth in Firebase Console');
    console.log('4. Create admin user account if needed');
  }
}

// Run if called directly
if (require.main === module) {
  runImport();
}

module.exports = { runImport };