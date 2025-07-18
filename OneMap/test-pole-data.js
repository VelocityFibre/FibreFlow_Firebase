#!/usr/bin/env node

/**
 * Test Pole Data Query
 * Quick test to see if we can query the planned-poles collection
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
const app = initializeApp({
  credential: credential.applicationDefault(),
  projectId: 'fibreflow-73daf'
});

const db = getFirestore(app);

async function testPoleQuery() {
  console.log('=== TESTING POLE DATA QUERY ===');
  
  try {
    // Find Lawley project
    const projectsRef = db.collection('projects');
    const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
    
    if (lawleyQuery.empty) {
      console.log('❌ Lawley project not found');
      return;
    }
    
    const project = lawleyQuery.docs[0];
    const projectId = project.id;
    console.log(`✓ Found Lawley project: ${projectId}`);
    
    // Test simple query (no ordering)
    console.log('\n=== SIMPLE QUERY (NO ORDERING) ===');
    const simpleQuery = await db.collection('planned-poles')
      .where('projectId', '==', projectId)
      .limit(5)
      .get();
    
    console.log(`Found ${simpleQuery.size} poles with simple query`);
    
    if (simpleQuery.size > 0) {
      console.log('Sample pole:');
      const sample = simpleQuery.docs[0].data();
      console.log(`  - ID: ${sample.poleNumber}`);
      console.log(`  - Type: ${sample.poleType}`);
      console.log(`  - Project ID: ${sample.projectId}`);
      console.log(`  - Has GPS: ${sample.location ? 'Yes' : 'No'}`);
    }
    
    // Test with ordering (this might fail due to missing index)
    console.log('\n=== QUERY WITH ORDERING (MIGHT FAIL) ===');
    try {
      const orderedQuery = await db.collection('planned-poles')
        .where('projectId', '==', projectId)
        .orderBy('poleNumber')
        .limit(5)
        .get();
      
      console.log(`✓ Ordered query successful: ${orderedQuery.size} poles`);
      
      if (orderedQuery.size > 0) {
        console.log('First few poles:');
        orderedQuery.docs.forEach((doc, index) => {
          if (index < 3) {
            const data = doc.data();
            console.log(`  ${index + 1}. ${data.poleNumber} (${data.poleType})`);
          }
        });
      }
    } catch (indexError) {
      console.log('❌ Ordered query failed (expected - need index):');
      console.log(`   ${indexError.message}`);
      console.log('\n   To fix: Create composite index for planned-poles:');
      console.log('   - Field 1: projectId (Ascending)');
      console.log('   - Field 2: poleNumber (Ascending)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run test
testPoleQuery().then(() => {
  console.log('\n=== TEST COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});