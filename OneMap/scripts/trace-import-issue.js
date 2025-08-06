#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function traceImportIssue() {
  try {
    console.log('🔍 Tracing the import issue for property 308025...\n');
    
    // Get the property
    const doc = await db.collection('vf-onemap-processed-records').doc('308025').get();
    const data = doc.data();
    
    console.log('Current Database State:');
    console.log('- currentStatus:', data.currentStatus);
    console.log('- Status Update field:', data['Status Update']);
    console.log('- Last import batch:', data.importBatchId);
    console.log('- Last import file:', data.fileName);
    console.log('- Last import date:', data.lastImportDate);
    
    // Check import metadata
    console.log('\n📋 Import Metadata:');
    console.log('- hadStatusChangeInImport:', data.hadStatusChangeInImport);
    
    // Analyze the pattern
    console.log('\n📊 Status History Analysis:');
    if (data.statusHistory) {
      const sorted = [...data.statusHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log('\nStatus progression:');
      let lastStatus = null;
      sorted.forEach(entry => {
        const changed = lastStatus && lastStatus !== entry.status;
        console.log(`${entry.date}: "${entry.status}" ${changed ? '⚠️ CHANGED' : '(no change)'}`);
        lastStatus = entry.status;
      });
    }
    
    // Theory
    console.log('\n💡 THEORY:');
    console.log('The import script only creates history entries when the status CHANGES.');
    console.log('If June 30 had the same status as June 23, no history entry would be created.');
    console.log('Similarly for July 14 - if it matched the existing status, no entry.');
    
    console.log('\n🔍 Missing dates:');
    console.log('- June 30: Expected "Home Installation: In Progress" (same as June 23)');
    console.log('- July 14: Expected "Home Sign Ups: Approved & Installation Scheduled"');
    
    console.log('\n❓ The mystery:');
    console.log('If the script doesn\'t record non-changes, where did the WRONG data come from?');
    console.log('The database shows the OPPOSITE of what\'s in the CSV files!');
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

traceImportIssue();