#!/usr/bin/env node

/**
 * vf-onemap-data Firebase Configuration
 * =====================================
 * 
 * Configuration for the actual vf-onemap-data Firebase project
 */

// Check for required environment variables or config file
const fs = require('fs');
const path = require('path');

// Firebase Admin SDK setup
const admin = require('firebase-admin');

// Configuration for vf-onemap-data project
const VF_ONEMAP_FIREBASE_CONFIG = {
  projectId: 'vf-onemap-data',  // Your actual project ID
  
  // Collection names in vf-onemap-data database
  collections: {
    processedRecords: 'vf-onemap-processed-records',
    importBatches: 'vf-onemap-import-batches',
    importReports: 'vf-onemap-import-reports',
    changeHistory: 'vf-onemap-change-history',
    preImportReports: 'vf-onemap-pre-import-reports',
    postImportReports: 'vf-onemap-post-import-reports'
  }
};

/**
 * Initialize Firebase Admin SDK
 */
function initializeVfOnemapFirebase() {
  try {
    // Initialize with default credentials for admin user
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: VF_ONEMAP_FIREBASE_CONFIG.projectId
      });
    }
    
    console.log('✅ Connecting to vf-onemap-data Firebase...');
    console.log('📧 Admin user: louis@velocityfibreapp.com');
    console.log('🔐 Using admin authentication');
    
    const db = admin.firestore();
    
    // Set project ID for Firestore
    db.settings({
      projectId: VF_ONEMAP_FIREBASE_CONFIG.projectId
    });
    
    return db;
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.log('');
    console.log('📋 Make sure you are authenticated as admin:');
    console.log('1. Run: firebase login');
    console.log('2. Login with: louis@velocityfibreapp.com');
    console.log('3. Select the vf-onemap-data project');
    throw error;
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection(db) {
  try {
    // Try to read from a collection
    const testCollection = db.collection(VF_ONEMAP_FIREBASE_CONFIG.collections.importBatches);
    const snapshot = await testCollection.limit(1).get();
    
    console.log('✅ Database connection verified');
    console.log(`📊 Import batches collection has ${snapshot.size} documents`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  VF_ONEMAP_FIREBASE_CONFIG,
  initializeVfOnemapFirebase,
  testDatabaseConnection
};

// Test connection if run directly
if (require.main === module) {
  console.log('🔥 Testing vf-onemap-data Firebase connection...');
  console.log('===========================================');
  
  const db = initializeVfOnemapFirebase();
  testDatabaseConnection(db).then(success => {
    if (success) {
      console.log('');
      console.log('✅ Ready to import data to vf-onemap-data!');
    }
    process.exit(success ? 0 : 1);
  });
}