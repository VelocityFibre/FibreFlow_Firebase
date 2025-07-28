#!/usr/bin/env node

/**
 * Import CSV to vf-onemap-data using existing Firebase authentication
 * This approach uses the existing Firebase Admin SDK service account
 * without creating new keys
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');

// Initialize vf-onemap-data app using existing credentials
function initializeVfOnemapApp() {
  try {
    // Check if we're already authenticated with Firebase Admin
    const apps = admin.apps;
    let vfOnemapApp = apps.find(app => app.name === 'vf-onemap');
    
    if (!vfOnemapApp) {
      // Try to use existing service account from FibreFlow
      const possiblePaths = [
        path.join(__dirname, '../credentials/vf-onemap-service-account.json'),
        path.join(__dirname, '../../.keys/vf-onemap-service-account.json'),
        path.join(process.env.HOME, '.firebase-keys/vf-onemap-service-account.json'),
        // Check if there's an existing Firebase Admin SDK key
        path.join(__dirname, '../credentials/firebase-admin-sdk.json')
      ];
      
      let serviceAccountPath = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          serviceAccountPath = testPath;
          console.log(`✅ Found service account at: ${testPath}`);
          break;
        }
      }
      
      if (serviceAccountPath) {
        const serviceAccount = require(serviceAccountPath);
        vfOnemapApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'vf-onemap-data',
          storageBucket: 'vf-onemap-data.firebasestorage.app'
        }, 'vf-onemap');
      } else {
        // Try application default credentials
        console.log('Attempting to use Application Default Credentials...');
        vfOnemapApp = admin.initializeApp({
          projectId: 'vf-onemap-data',
          storageBucket: 'vf-onemap-data.firebasestorage.app'
        }, 'vf-onemap');
      }
    }
    
    return vfOnemapApp;
  } catch (error) {
    console.error('❌ Failed to initialize vf-onemap-data app:', error.message);
    throw error;
  }
}

// Parse CSV file
async function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  return new Promise((resolve, reject) => {
    csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

// Import records to Firestore
async function importToFirestore(app, records, fileName) {
  const db = app.firestore();
  const batch = db.batch();
  const importBatchId = `IMP_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  
  console.log(`\n📤 Importing ${records.length} records to vf-onemap-data...`);
  console.log(`Batch ID: ${importBatchId}\n`);
  
  let processedCount = 0;
  let newCount = 0;
  let duplicateCount = 0;
  
  // Process records in chunks of 500 (Firestore batch limit)
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const chunkBatch = db.batch();
    
    for (const record of chunk) {
      const propertyId = record['Property ID'];
      if (!propertyId) continue;
      
      const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
      
      // Check if document exists
      const docSnapshot = await docRef.get();
      
      if (!docSnapshot.exists) {
        newCount++;
      } else {
        duplicateCount++;
      }
      
      chunkBatch.set(docRef, {
        ...record,
        importBatchId: importBatchId,
        fileName: fileName,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      processedCount++;
    }
    
    await chunkBatch.commit();
    console.log(`✅ Processed ${processedCount}/${records.length} records...`);
  }
  
  // Create import batch summary
  const batchSummary = {
    batchId: importBatchId,
    fileName: fileName,
    totalRecords: records.length,
    newRecords: newCount,
    duplicates: duplicateCount,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'completed'
  };
  
  await db.collection('vf-onemap-import-batches').doc(importBatchId).set(batchSummary);
  
  return batchSummary;
}

// Main import function
async function importCSVToVfOnemap(csvFileName) {
  try {
    console.log('🚀 Starting vf-onemap-data CSV import...\n');
    
    // Initialize app
    const app = initializeVfOnemapApp();
    console.log('✅ Connected to vf-onemap-data\n');
    
    // Find CSV file
    const csvPath = path.join(__dirname, '../downloads', csvFileName);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    // Parse CSV
    console.log(`📄 Parsing CSV: ${csvFileName}`);
    const records = await parseCSV(csvPath);
    console.log(`✅ Found ${records.length} records\n`);
    
    // Import to Firestore
    const summary = await importToFirestore(app, records, csvFileName);
    
    // Display summary
    console.log('\n✨ Import completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`- Total records: ${summary.totalRecords}`);
    console.log(`- New records: ${summary.newRecords}`);
    console.log(`- Duplicates: ${summary.duplicates}`);
    console.log(`- Batch ID: ${summary.batchId}`);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure you have access to vf-onemap-data project');
    console.error('2. Check if you are logged in: firebase login');
    console.error('3. Try setting project: firebase use vf-onemap-data');
    process.exit(1);
  }
}

// Command line usage
const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node vf-onemap-import-using-existing-auth.js <csv-filename>');
  console.log('\nExample:');
  console.log('  node vf-onemap-import-using-existing-auth.js "Lawley May Week 3 22052025 - First Report.csv"');
  process.exit(1);
}

importCSVToVfOnemap(csvFile);