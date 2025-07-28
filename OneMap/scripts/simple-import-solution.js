#!/usr/bin/env node

/**
 * SIMPLE SOLUTION: Import CSV to vf-onemap-data
 * 
 * Since you have full control of vf-onemap-data:
 * 1. Go to: https://console.firebase.google.com/project/vf-onemap-data/settings/serviceaccounts/adminsdk
 * 2. Click "Generate new private key" 
 * 3. Save as: /home/ldp/VF/Apps/FibreFlow/OneMap/credentials/vf-onemap-service-account.json
 * 
 * That's it! No org policies can stop you since you're the owner.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Check if service account exists
const serviceAccountPath = path.join(__dirname, '../credentials/vf-onemap-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.log(`
❌ Service account not found!

📋 Quick Fix (since you have full control):

1. Open: https://console.firebase.google.com/project/vf-onemap-data/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save the file as: ${serviceAccountPath}
4. Run this script again

That's it! As the owner, you can bypass all restrictions.
`);
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function importCSV(csvFileName) {
  try {
    console.log('🚀 Starting import to vf-onemap-data...\n');
    
    const csvPath = path.join(__dirname, '../downloads', csvFileName);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV not found: ${csvPath}`);
    }
    
    // Read and parse CSV
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📊 Found ${records.length} records\n`);
    
    // Import in batches
    const batchSize = 500;
    const importBatchId = `IMP_${Date.now()}`;
    let processed = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const chunk = records.slice(i, i + batchSize);
      
      for (const record of chunk) {
        const propertyId = record['Property ID'];
        if (!propertyId) continue;
        
        const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
        batch.set(docRef, {
          ...record,
          importBatchId,
          importedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        processed++;
      }
      
      await batch.commit();
      console.log(`✅ Processed ${processed}/${records.length} records...`);
    }
    
    // Save import summary
    await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
      batchId: importBatchId,
      fileName: csvFileName,
      totalRecords: records.length,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    });
    
    console.log(`\n✨ Import completed!`);
    console.log(`📁 Batch ID: ${importBatchId}`);
    console.log(`📊 Total records: ${processed}`);
    
    // Terminate the app to exit cleanly
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line usage
const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node simple-import-solution.js <csv-filename>');
  console.log('Example: node simple-import-solution.js "Lawley May Week 3 22052025 - First Report.csv"');
  process.exit(1);
}

// Make sure we have required packages
try {
  require('csv-parse');
} catch (e) {
  console.log('Installing required packages...');
  require('child_process').execSync('npm install firebase-admin csv-parse', { stdio: 'inherit' });
}

importCSV(csvFile);