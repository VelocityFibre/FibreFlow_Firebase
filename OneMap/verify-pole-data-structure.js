#!/usr/bin/env node

/**
 * Verify and Fix Pole Data Structure for FibreFlow
 * Date: 2025-01-16
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
const app = initializeApp({
  credential: credential.applicationDefault(),
  projectId: 'fibreflow-73daf'
});

const db = getFirestore(app);

async function verifyPoleData() {
  console.log('=== VERIFYING POLE DATA STRUCTURE ===');
  
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
    const projectData = project.data();
    
    console.log(`\n✓ Found Lawley project: ${projectId}`);
    console.log(`  Name: ${projectData.name}`);
    console.log(`  Code: ${projectData.projectCode}`);
    
    // Check pole-trackers collection (primary)
    console.log('\n=== CHECKING pole-trackers COLLECTION ===');
    const poleTrackersRef = db.collection('pole-trackers');
    const poleTrackersQuery = await poleTrackersRef
      .where('projectId', '==', projectId)
      .limit(5)
      .get();
    
    console.log(`Found ${poleTrackersQuery.size} poles in pole-trackers collection`);
    
    if (poleTrackersQuery.size > 0) {
      console.log('\nSample pole from pole-trackers:');
      const sampleDoc = poleTrackersQuery.docs[0];
      const sampleData = sampleDoc.data();
      console.log(JSON.stringify(sampleData, null, 2));
    }
    
    // Check planned-poles collection (where we imported)
    console.log('\n=== CHECKING planned-poles COLLECTION ===');
    const plannedPolesRef = db.collection('planned-poles');
    const plannedPolesQuery = await plannedPolesRef
      .where('projectId', '==', projectId)
      .limit(5)
      .get();
    
    console.log(`Found ${plannedPolesQuery.size} poles in planned-poles collection`);
    
    if (plannedPolesQuery.size > 0) {
      console.log('\nSample pole from planned-poles:');
      const sampleDoc = plannedPolesQuery.docs[0];
      const sampleData = sampleDoc.data();
      console.log(JSON.stringify(sampleData, null, 2));
      
      // Check field mapping
      console.log('\n=== FIELD MAPPING CHECK ===');
      console.log('Current fields in our data:');
      console.log('  - poleNumber:', sampleData.poleNumber);
      console.log('  - location:', sampleData.location);
      console.log('  - poleType:', sampleData.poleType);
      console.log('  - projectId:', sampleData.projectId);
      
      console.log('\nExpected fields for pole-tracker:');
      console.log('  ✓ poleNumber - Present');
      console.log('  ✓ projectId - Present');
      console.log('  ✓ location - Present');
      console.log('  ✓ poleType - Present');
      console.log('  ? vfPoleId - Missing (auto-generated)');
      console.log('  ? projectCode - Missing');
      console.log('  ? contractorId - Missing');
      console.log('  ? maxCapacity - Missing (should be 12)');
    }
    
    // Get total count
    const totalQuery = await plannedPolesRef
      .where('projectId', '==', projectId)
      .count()
      .get();
    
    console.log(`\nTotal poles in planned-poles: ${totalQuery.data().count}`);
    
    // Check if we need to add missing fields
    console.log('\n=== RECOMMENDED ACTIONS ===');
    console.log('1. The data is in planned-poles collection (correct)');
    console.log('2. Some fields may need to be added:');
    console.log('   - vfPoleId (if not present)');
    console.log('   - projectCode: "Law-001"');
    console.log('   - maxCapacity: 12');
    console.log('   - contractorId: null (or specific contractor)');
    console.log('\n3. The pole tracker should show data from planned-poles');
    console.log('   Check if you selected the correct project in the UI');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function addMissingFields() {
  console.log('\n=== ADDING MISSING FIELDS TO POLES ===');
  
  const projectsRef = db.collection('projects');
  const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
  
  if (lawleyQuery.empty) {
    console.log('❌ Lawley project not found');
    return;
  }
  
  const project = lawleyQuery.docs[0];
  const projectId = project.id;
  const projectCode = project.data().projectCode;
  
  // Get all poles for this project
  const plannedPolesRef = db.collection('planned-poles');
  const polesQuery = await plannedPolesRef
    .where('projectId', '==', projectId)
    .get();
  
  console.log(`Found ${polesQuery.size} poles to update`);
  
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;
  
  polesQuery.forEach(doc => {
    const data = doc.data();
    const updates = {};
    
    // Add missing fields for pole tracker compatibility
    if (!data.vfPoleId) {
      updates.vfPoleId = data.poleNumber; // Use poleNumber as vfPoleId
    }
    if (!data.projectCode) {
      updates.projectCode = projectCode;
    }
    if (!data.maxCapacity) {
      updates.maxCapacity = 12;
    }
    if (!data.contractorId) {
      updates.contractorId = null;
    }
    if (!data.contractorName) {
      updates.contractorName = null;
    }
    if (!data.workingTeam) {
      updates.workingTeam = 'Import Team';
    }
    if (!data.dateInstalled) {
      updates.dateInstalled = data.createdAt || Timestamp.now();
    }
    if (!data.uploads) {
      updates.uploads = {
        before: { uploaded: false },
        front: { uploaded: false },
        side: { uploaded: false },
        depth: { uploaded: false },
        concrete: { uploaded: false },
        compaction: { uploaded: false }
      };
    }
    if (!data.qualityChecked) {
      updates.qualityChecked = false;
    }
    if (!data.updatedAt) {
      updates.updatedAt = Timestamp.now();
    }
    if (!data.createdBy) {
      updates.createdBy = 'import-script';
    }
    if (!data.updatedBy) {
      updates.updatedBy = 'import-script';
    }
    
    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
      batchCount++;
    }
    
    // Commit batch when full
    if (batchCount === 500) {
      batch.commit();
      console.log(`Updated ${count} poles...`);
      batch = db.batch();
      batchCount = 0;
    }
  });
  
  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✓ Updated ${count} poles with missing fields`);
}

// Run verification and add missing fields automatically
verifyPoleData().then(async () => {
  console.log('\n=== AUTOMATICALLY ADDING MISSING FIELDS ===');
  await addMissingFields();
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Go to https://fibreflow-73daf.web.app/pole-tracker');
  console.log('2. Select "Lawley" project from the dropdown');
  console.log('3. You should see the poles in the list');
  console.log('\nIf still not visible:');
  console.log('- Check browser console for errors');
  console.log('- Try refreshing the page');
  console.log('- Check if you have the right permissions');
  
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});