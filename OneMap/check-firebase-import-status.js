#!/usr/bin/env node

/**
 * Check Firebase Import Status for Lawley Project
 * Date: 2025-01-16
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

async function checkImportStatus() {
  console.log('=== CHECKING LAWLEY IMPORT STATUS ===');
  console.log('Date:', new Date().toISOString());
  
  try {
    // Find Lawley project
    const projectsRef = db.collection('projects');
    const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
    
    if (lawleyQuery.empty) {
      console.log('❌ Lawley project (Law-001) not found');
      return;
    }
    
    const project = lawleyQuery.docs[0];
    const projectId = project.id;
    const projectData = project.data();
    
    console.log(`\n✓ Found Lawley project: ${projectId}`);
    console.log(`  Name: ${projectData.name}`);
    console.log(`  Code: ${projectData.projectCode}`);
    console.log(`  Status: ${projectData.status}`);
    
    // Check poles
    console.log('\n=== POLES STATUS ===');
    const plannedPolesRef = db.collection('planned-poles');
    const polesQuery = await plannedPolesRef
      .where('projectId', '==', projectId)
      .select('poleNumber', 'poleType', 'dropCount')
      .get();
    
    console.log(`Total poles in Firebase: ${polesQuery.size}`);
    
    if (polesQuery.size > 0) {
      // Count by type
      let feederCount = 0;
      let distributionCount = 0;
      let withDropsCount = 0;
      
      polesQuery.forEach(doc => {
        const data = doc.data();
        if (data.poleType === 'feeder') feederCount++;
        if (data.poleType === 'distribution') distributionCount++;
        if (data.dropCount > 0) withDropsCount++;
      });
      
      console.log(`  - Feeder poles: ${feederCount}`);
      console.log(`  - Distribution poles: ${distributionCount}`);
      console.log(`  - Poles with drops: ${withDropsCount}`);
      
      // Show sample
      console.log('\nSample poles:');
      let count = 0;
      polesQuery.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`  - ${data.poleNumber} (${data.poleType}, ${data.dropCount || 0} drops)`);
          count++;
        }
      });
    }
    
    // Check drops
    console.log('\n=== DROPS STATUS ===');
    const dropsRef = db.collection('drops');
    const dropsQuery = await dropsRef
      .where('projectId', '==', projectId)
      .select('dropNumber', 'isSpare', 'poleReference')
      .get();
    
    console.log(`Total drops in Firebase: ${dropsQuery.size}`);
    
    if (dropsQuery.size > 0) {
      // Count spares
      let spareCount = 0;
      let activeCount = 0;
      
      dropsQuery.forEach(doc => {
        const data = doc.data();
        if (data.isSpare) spareCount++;
        else activeCount++;
      });
      
      console.log(`  - Active drops: ${activeCount}`);
      console.log(`  - Spare drops: ${spareCount}`);
      
      // Show sample
      console.log('\nSample drops:');
      let count = 0;
      dropsQuery.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`  - ${data.dropNumber} → ${data.poleReference} (${data.isSpare ? 'spare' : 'active'})`);
          count++;
        }
      });
    }
    
    // Compare with expected
    console.log('\n=== COMPARISON WITH EXPECTED ===');
    console.log('Expected from CSV extraction:');
    console.log('  - Poles: 4,468 (2,107 feeder + 2,361 distribution)');
    console.log('  - Drops: 23,708 (20,109 active + 3,599 spare)');
    
    console.log('\nCurrent in Firebase:');
    console.log(`  - Poles: ${polesQuery.size}`);
    console.log(`  - Drops: ${dropsQuery.size}`);
    
    console.log('\nRemaining to import:');
    console.log(`  - Poles: ${4468 - polesQuery.size}`);
    console.log(`  - Drops: ${23708 - dropsQuery.size}`);
    
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

// Run the check
checkImportStatus().then(() => {
  console.log('\nStatus check complete!');
  process.exit(0);
}).catch(error => {
  console.error('Status check failed:', error);
  process.exit(1);
});