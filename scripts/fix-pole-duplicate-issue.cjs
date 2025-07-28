#!/usr/bin/env node

/**
 * Script to diagnose and provide solutions for duplicate pole documents
 * 
 * Issue: Multiple documents exist for the same pole number
 * Solution: Identify the correct document with status history
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../sync/config/service-accounts/fibreflow-73daf-key.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fibreflow-73daf'
  });
} catch (error) {
  // Try alternative path
  try {
    const altPath = path.join(__dirname, '../OneMap/credentials/vf-onemap-service-account.json');
    const altServiceAccount = require(altPath);
    admin.initializeApp({
      credential: admin.credential.cert(altServiceAccount),
      projectId: 'fibreflow-73daf'
    });
  } catch (altError) {
    console.error('❌ Could not initialize Firebase Admin');
    process.exit(1);
  }
}

const db = admin.firestore();

async function analyzePole(poleNumber) {
  console.log(`\n🔍 Analyzing pole: ${poleNumber}`);
  console.log('='.repeat(80));
  
  // Find all documents with this pole number
  const query = await db.collection('planned-poles')
    .where('poleNumber', '==', poleNumber)
    .get();
  
  if (query.empty) {
    console.log('❌ No documents found with this pole number');
    return;
  }
  
  console.log(`\n📊 Found ${query.size} documents with pole number ${poleNumber}:\n`);
  
  const documents = [];
  
  // Analyze each document
  for (const doc of query.docs) {
    const data = doc.data();
    const docInfo = {
      id: doc.id,
      data: data,
      hasStatusHistory: false,
      historyCount: 0,
      latestStatus: null,
      recommendation: ''
    };
    
    // Check for status history
    const historyRef = doc.ref.collection('statusHistory');
    const history = await historyRef.orderBy('timestamp', 'desc').limit(1).get();
    
    if (!history.empty) {
      docInfo.hasStatusHistory = true;
      const fullHistory = await historyRef.get();
      docInfo.historyCount = fullHistory.size;
      docInfo.latestStatus = history.docs[0].data().status;
    }
    
    documents.push(docInfo);
    
    console.log(`📄 Document ID: ${doc.id}`);
    console.log(`   Status: ${data.status || data.importStatus || 'N/A'}`);
    console.log(`   Project: ${data.projectName || 'N/A'}`);
    console.log(`   Address: ${data.address || 'N/A'}`);
    console.log(`   Status History: ${docInfo.hasStatusHistory ? `✅ Yes (${docInfo.historyCount} entries)` : '❌ No'}`);
    if (docInfo.hasStatusHistory) {
      console.log(`   Latest Status: ${docInfo.latestStatus}`);
    }
    console.log(`   URL: https://fibreflow-73daf.web.app/pole-tracker/${doc.id}`);
    console.log();
  }
  
  // Determine the best document
  console.log('\n' + '='.repeat(80));
  console.log('📋 ANALYSIS & RECOMMENDATIONS');
  console.log('='.repeat(80));
  
  // Find the document with the most history
  const bestDoc = documents.reduce((best, current) => {
    if (!best) return current;
    if (current.historyCount > best.historyCount) return current;
    if (current.historyCount === best.historyCount && current.id === poleNumber) return current;
    return best;
  }, null);
  
  if (bestDoc && bestDoc.hasStatusHistory) {
    console.log('\n✅ RECOMMENDED DOCUMENT:');
    console.log(`   Document ID: ${bestDoc.id}`);
    console.log(`   Status History: ${bestDoc.historyCount} entries`);
    console.log(`   Current Status: ${bestDoc.latestStatus}`);
    console.log(`\n🔗 CORRECT URL TO USE:`);
    console.log(`   https://fibreflow-73daf.web.app/pole-tracker/${bestDoc.id}`);
  } else {
    console.log('\n⚠️  WARNING: No documents have status history!');
    console.log('   This pole may not have been properly synced.');
  }
  
  // Show duplicate issue
  if (documents.length > 1) {
    console.log('\n⚠️  DUPLICATE DOCUMENTS DETECTED:');
    console.log('   Multiple documents exist for the same pole number.');
    console.log('   This can cause confusion when searching or viewing poles.');
    console.log('\n   Recommended actions:');
    console.log('   1. Use the document with status history (shown above)');
    console.log('   2. Consider cleaning up duplicate documents');
    console.log('   3. Update the search functionality to handle duplicates');
  }
  
  return bestDoc;
}

async function checkMultiplePoles() {
  console.log('\n🔍 Checking for other poles with duplicates...\n');
  
  // Get a sample of poles
  const sample = await db.collection('planned-poles')
    .where('projectName', '==', 'LAWLEY')
    .limit(20)
    .get();
  
  const poleNumbers = new Set();
  const duplicates = new Map();
  
  sample.forEach(doc => {
    const poleNumber = doc.data().poleNumber;
    if (poleNumber) {
      if (poleNumbers.has(poleNumber)) {
        duplicates.set(poleNumber, (duplicates.get(poleNumber) || 1) + 1);
      } else {
        poleNumbers.add(poleNumber);
      }
    }
  });
  
  if (duplicates.size > 0) {
    console.log('⚠️  Other poles with duplicates in this sample:');
    duplicates.forEach((count, pole) => {
      console.log(`   ${pole}: ${count} duplicates`);
    });
  } else {
    console.log('✅ No duplicates found in this sample');
  }
}

async function main() {
  console.log('🔧 POLE DUPLICATE ISSUE DIAGNOSTIC TOOL');
  console.log('='.repeat(80));
  
  // Analyze the specific pole
  const targetPole = 'LAW.P.C328';
  const bestDoc = await analyzePole(targetPole);
  
  // Check for other duplicates
  await checkMultiplePoles();
  
  console.log('\n' + '='.repeat(80));
  console.log('📌 SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\nThe issue is that multiple documents exist for pole LAW.P.C328:');
  console.log('- The user is viewing document A7LuDrS5gxDrMcaYRbaI (no history)');
  console.log('- The correct document is LAW.P.C328 (has status history)');
  console.log('\nThis appears to be a data import issue where duplicates were created.');
  console.log('\n✅ Solution: Use the correct URL provided above to view the pole with history.');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});