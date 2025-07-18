#!/usr/bin/env node

/**
 * Import Lawley Poles and Drops to Firebase
 * Date: 2025-01-16
 * 
 * This script:
 * 1. Checks if Lawley project exists (Law-001)
 * 2. Imports poles from extracted JSON
 * 3. Imports drops from extracted JSON
 * 4. Links everything to the Lawley project
 */

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
const app = initializeApp({
  credential: credential.applicationDefault(),
  projectId: 'fibreflow-73daf'
});

const db = getFirestore(app);

// File paths
const POLES_JSON = path.join(__dirname, 'output', 'poles-with-drops.json');
const DROPS_JSON = path.join(__dirname, 'output', 'lawley-drops-extracted.json');

async function findOrCreateLawleyProject() {
  console.log('Looking for Lawley project...');
  
  const projectsRef = db.collection('projects');
  const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
  
  if (!lawleyQuery.empty) {
    const project = lawleyQuery.docs[0];
    console.log(`✓ Found existing Lawley project: ${project.id}`);
    return project.id;
  }
  
  // Create project if it doesn't exist
  console.log('Lawley project not found. Creating...');
  const newProject = {
    projectCode: 'Law-001',
    name: 'Lawley',
    client: 'Lawley',
    municipality: 'City of Johannesburg',
    status: 'active',
    createdAt: Timestamp.now(),
    lastModified: Timestamp.now(),
    createdBy: 'import-script',
    lastModifiedBy: 'import-script'
  };
  
  const projectRef = await projectsRef.add(newProject);
  console.log(`✓ Created Lawley project: ${projectRef.id}`);
  return projectRef.id;
}

async function importPoles(projectId) {
  console.log('\n=== IMPORTING POLES ===');
  
  // Load pole data
  const poleData = JSON.parse(fs.readFileSync(POLES_JSON, 'utf8'));
  const poles = poleData.poles;
  
  console.log(`Found ${poles.length} poles to import`);
  
  // Check if poles already exist
  const plannedPolesRef = db.collection('planned-poles');
  const existingPoles = await plannedPolesRef
    .where('projectId', '==', projectId)
    .limit(1)
    .get();
    
  if (!existingPoles.empty) {
    console.log('⚠️  Poles already exist for this project. Checking count...');
    const allPoles = await plannedPolesRef.where('projectId', '==', projectId).get();
    console.log(`   Found ${allPoles.size} existing poles`);
    
    const response = await promptUser('Do you want to continue and add more poles? (yes/no): ');
    if (response.toLowerCase() !== 'yes') {
      console.log('Skipping pole import.');
      return;
    }
  }
  
  // Import poles in batches
  let batch = db.batch();
  let successCount = 0;
  const batchSize = 500;
  let batchCount = 0;
  
  for (let i = 0; i < poles.length; i++) {
    const pole = poles[i];
    const docRef = plannedPolesRef.doc(); // Auto-generate ID
    
    const poleDoc = {
      id: docRef.id,
      projectId: projectId,
      poleNumber: pole.poleId,
      poleType: pole.poleType,
      height: pole.height,
      heightNumeric: pole.heightNumeric,
      diameter: pole.diameter,
      status: pole.status || 'planned',
      location: {
        latitude: pole.latitude,
        longitude: pole.longitude
      },
      ponNumber: pole.ponNumber,
      zoneNumber: pole.zoneNumber,
      connectedDrops: pole.connectedDrops || [],
      dropCount: pole.dropCount || 0,
      importedAt: Timestamp.now(),
      importedBy: 'import-script',
      createdAt: Timestamp.now(),
      lastModified: Timestamp.now(),
      createdBy: 'import-script',
      lastModifiedBy: 'import-script'
    };
    
    batch.set(docRef, poleDoc);
    batchCount++;
    successCount++;
    
    // Commit batch when full
    if (batchCount === batchSize) {
      await batch.commit();
      console.log(`   Imported ${successCount} poles...`);
      // Create new batch
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✓ Successfully imported ${successCount} poles`);
  return successCount;
}

async function importDrops(projectId) {
  console.log('\n=== IMPORTING DROPS ===');
  
  // Load drop data
  const dropData = JSON.parse(fs.readFileSync(DROPS_JSON, 'utf8'));
  const drops = dropData.drops;
  
  console.log(`Found ${drops.length} drops to import`);
  
  // Check if drops already exist
  const dropsRef = db.collection('drops');
  const existingDrops = await dropsRef
    .where('projectId', '==', projectId)
    .limit(1)
    .get();
    
  if (!existingDrops.empty) {
    console.log('⚠️  Drops already exist for this project. Checking count...');
    const allDrops = await dropsRef.where('projectId', '==', projectId).get();
    console.log(`   Found ${allDrops.size} existing drops`);
    
    const response = await promptUser('Do you want to continue and add more drops? (yes/no): ');
    if (response.toLowerCase() !== 'yes') {
      console.log('Skipping drop import.');
      return;
    }
  }
  
  // Import drops in batches
  let batch = db.batch();
  let successCount = 0;
  const batchSize = 500;
  let batchCount = 0;
  
  for (let i = 0; i < drops.length; i++) {
    const drop = drops[i];
    const docRef = dropsRef.doc(); // Auto-generate ID
    
    const dropDoc = {
      id: docRef.id,
      projectId: projectId,
      dropNumber: drop.dropId,
      dropId: drop.dropId,
      poleNumber: drop.poleReference.replace('LAW.P.', ''), // Clean pole reference
      poleReference: drop.poleReference,
      ontReference: drop.ontReference || null,
      cableLength: drop.cableLength,
      cableLengthNumeric: drop.cableLengthNumeric,
      cableType: 'SM/G657A2 2.8mm', // From original data
      ponNumber: drop.ponNumber,
      zoneNumber: drop.zoneNumber,
      municipality: 'City of Johannesburg',
      projectCode: 'LAW',
      status: drop.isSpare ? 'spare' : 'planned',
      isSpare: drop.isSpare,
      dateCreated: drop.dateCreated ? Timestamp.fromDate(new Date(drop.dateCreated)) : Timestamp.now(),
      createdBy: drop.createdBy || 'PlanNet',
      importedBy: 'import-script',
      importedAt: Timestamp.now(),
      lastModified: Timestamp.now(),
      lastModifiedBy: 'import-script'
    };
    
    batch.set(docRef, dropDoc);
    batchCount++;
    successCount++;
    
    // Commit batch when full
    if (batchCount === batchSize) {
      await batch.commit();
      console.log(`   Imported ${successCount} drops...`);
      // Create new batch
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✓ Successfully imported ${successCount} drops`);
  return successCount;
}

async function updateProjectStats(projectId, poleCount, dropCount) {
  console.log('\n=== UPDATING PROJECT STATISTICS ===');
  
  const projectRef = db.collection('projects').doc(projectId);
  
  await projectRef.update({
    'statistics.totalPoles': poleCount,
    'statistics.totalDrops': dropCount,
    'statistics.activeDrops': dropCount - 3599, // From our extraction
    'statistics.spareDrops': 3599,
    'statistics.lastImport': Timestamp.now(),
    lastModified: Timestamp.now(),
    lastModifiedBy: 'import-script'
  });
  
  console.log('✓ Project statistics updated');
}

function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('=== LAWLEY DATA IMPORT TO FIREBASE ===');
  console.log('Date:', new Date().toISOString());
  console.log('Data source:', __dirname);
  
  try {
    // Check if data files exist
    if (!fs.existsSync(POLES_JSON)) {
      throw new Error('Poles data not found. Run extract_lawley_poles.py first.');
    }
    if (!fs.existsSync(DROPS_JSON)) {
      throw new Error('Drops data not found. Run extract_lawley_drops.py first.');
    }
    
    // Find or create project
    const projectId = await findOrCreateLawleyProject();
    
    // Import data
    const poleCount = await importPoles(projectId);
    const dropCount = await importDrops(projectId);
    
    // Update project stats
    if (poleCount && dropCount) {
      await updateProjectStats(projectId, poleCount, dropCount);
    }
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Project ID: ${projectId}`);
    console.log(`Poles imported: ${poleCount || 0}`);
    console.log(`Drops imported: ${dropCount || 0}`);
    console.log('\nView in Firebase Console:');
    console.log('https://console.firebase.google.com/project/fibreflow-73daf/firestore');
    
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
main().then(() => {
  console.log('\nScript completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});