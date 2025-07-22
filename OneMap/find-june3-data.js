#!/usr/bin/env node

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function findJune3Data() {
  console.log('\nSEARCHING FOR JUNE 3RD DATA');
  console.log('============================\n');
  
  try {
    // Check all recent import IDs that have June 3rd in the filename
    const june3ImportId = 'IMP_2025-07-22_1753176584113'; // Latest June 3rd import
    
    console.log(`Checking import ID: ${june3ImportId}`);
    
    // Count records with this import ID
    const june3Count = await db.collection('onemap-processing-staging')
      .where('importId', '==', june3ImportId)
      .count()
      .get();
    
    console.log(`Records found: ${june3Count.data().count}`);
    
    if (june3Count.data().count > 0) {
      // Get a sample
      const sampleQuery = await db.collection('onemap-processing-staging')
        .where('importId', '==', june3ImportId)
        .limit(5)
        .get();
      
      console.log('\nSample records:');
      sampleQuery.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\nRecord ${index + 1}:`);
        console.log(`- Property ID: ${data['Property ID']}`);
        console.log(`- Pole Number: ${data['Pole Number'] || 'N/A'}`);
        console.log(`- Status: ${data.Status || 'N/A'}`);
        console.log(`- Field Agent: ${data['Field Agent'] || 'N/A'}`);
      });
      
      // Count by status
      console.log('\nStatus breakdown for June 3rd data:');
      
      // Get approved count
      const approvedCount = await db.collection('onemap-processing-staging')
        .where('importId', '==', june3ImportId)
        .where('Status', '==', 'Pole Permission: Approved')
        .count()
        .get();
      
      console.log(`- Pole Permission: Approved: ${approvedCount.data().count}`);
      
      // Get no status count
      const noStatusCount = await db.collection('onemap-processing-staging')
        .where('importId', '==', june3ImportId)
        .where('Status', '==', null)
        .count()
        .get();
      
      console.log(`- No Status: ${noStatusCount.data().count}`);
      
      console.log(`- Other statuses: ${june3Count.data().count - approvedCount.data().count - noStatusCount.data().count}`);
    }
    
    // Also check what all import IDs exist in staging
    console.log('\n\nAll unique import IDs in staging (sampling first 100 records):');
    const sampleDocs = await db.collection('onemap-processing-staging')
      .limit(100)
      .get();
    
    const importIds = new Set();
    sampleDocs.forEach(doc => {
      const importId = doc.data().importId;
      if (importId) importIds.add(importId);
    });
    
    Array.from(importIds).sort().forEach(id => {
      console.log(`- ${id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findJune3Data().then(() => process.exit(0));