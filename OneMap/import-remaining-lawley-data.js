#!/usr/bin/env node

/**
 * Import Remaining Lawley Data to Firebase
 * This script checks what's already imported and only imports the remaining data
 * Date: 2025-01-16
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

async function getExistingData(projectId) {
  console.log('Checking existing data...');
  
  // Get existing pole numbers
  const existingPoles = new Set();
  const polesQuery = await db.collection('planned-poles')
    .where('projectId', '==', projectId)
    .select('poleNumber')
    .get();
  
  polesQuery.forEach(doc => {
    existingPoles.add(doc.data().poleNumber);
  });
  
  // Get existing drop numbers
  const existingDrops = new Set();
  const dropsQuery = await db.collection('drops')
    .where('projectId', '==', projectId)
    .select('dropNumber')
    .get();
  
  dropsQuery.forEach(doc => {
    existingDrops.add(doc.data().dropNumber);
  });
  
  console.log(`Found ${existingPoles.size} existing poles`);
  console.log(`Found ${existingDrops.size} existing drops`);
  
  return { existingPoles, existingDrops };
}

async function importRemainingPoles(projectId, existingPoles) {
  console.log('\n=== IMPORTING REMAINING POLES ===');
  
  // Load pole data
  const poleData = JSON.parse(fs.readFileSync(POLES_JSON, 'utf8'));
  const allPoles = poleData.poles;
  
  // Filter out existing poles
  const polesToImport = allPoles.filter(pole => !existingPoles.has(pole.poleId));
  
  console.log(`Total poles in file: ${allPoles.length}`);
  console.log(`Already imported: ${existingPoles.size}`);
  console.log(`Remaining to import: ${polesToImport.length}`);
  
  if (polesToImport.length === 0) {
    console.log('All poles already imported!');
    return 0;
  }
  
  // Import in batches
  const plannedPolesRef = db.collection('planned-poles');
  let batch = db.batch();
  let batchCount = 0;
  let successCount = 0;
  const batchSize = 500;
  
  for (const pole of polesToImport) {
    const docRef = plannedPolesRef.doc();
    
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
      console.log(`   Imported ${successCount}/${polesToImport.length} poles...`);
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

async function importRemainingDrops(projectId, existingDrops) {
  console.log('\n=== IMPORTING REMAINING DROPS ===');
  
  // Load drop data
  const dropData = JSON.parse(fs.readFileSync(DROPS_JSON, 'utf8'));
  const allDrops = dropData.drops;
  
  // Filter out existing drops
  const dropsToImport = allDrops.filter(drop => !existingDrops.has(drop.dropId));
  
  console.log(`Total drops in file: ${allDrops.length}`);
  console.log(`Already imported: ${existingDrops.size}`);
  console.log(`Remaining to import: ${dropsToImport.length}`);
  
  if (dropsToImport.length === 0) {
    console.log('All drops already imported!');
    return 0;
  }
  
  // Import in batches
  const dropsRef = db.collection('drops');
  let batch = db.batch();
  let batchCount = 0;
  let successCount = 0;
  const batchSize = 500;
  
  for (const drop of dropsToImport) {
    const docRef = dropsRef.doc();
    
    const dropDoc = {
      id: docRef.id,
      projectId: projectId,
      dropNumber: drop.dropId,
      dropId: drop.dropId,
      poleNumber: drop.poleReference.replace('LAW.P.', ''),
      poleReference: drop.poleReference,
      ontReference: drop.ontReference || null,
      cableLength: drop.cableLength,
      cableLengthNumeric: drop.cableLengthNumeric,
      cableType: 'SM/G657A2 2.8mm',
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
      console.log(`   Imported ${successCount}/${dropsToImport.length} drops...`);
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

async function main() {
  console.log('=== LAWLEY REMAINING DATA IMPORT ===');
  console.log('Date:', new Date().toISOString());
  
  try {
    // Check if data files exist
    if (!fs.existsSync(POLES_JSON) || !fs.existsSync(DROPS_JSON)) {
      throw new Error('Data files not found. Run extraction scripts first.');
    }
    
    // Find Lawley project
    const projectsRef = db.collection('projects');
    const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
    
    if (lawleyQuery.empty) {
      throw new Error('Lawley project (Law-001) not found');
    }
    
    const project = lawleyQuery.docs[0];
    const projectId = project.id;
    console.log(`\n✓ Found Lawley project: ${projectId}`);
    
    // Get existing data
    const { existingPoles, existingDrops } = await getExistingData(projectId);
    
    // Import remaining data
    const importedPoles = await importRemainingPoles(projectId, existingPoles);
    const importedDrops = await importRemainingDrops(projectId, existingDrops);
    
    // Final summary
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Project ID: ${projectId}`);
    console.log(`New poles imported: ${importedPoles}`);
    console.log(`New drops imported: ${importedDrops}`);
    console.log(`\nTotal in Firebase:`);
    console.log(`  - Poles: ${existingPoles.size + importedPoles}`);
    console.log(`  - Drops: ${existingDrops.size + importedDrops}`);
    
    console.log('\nView in Firebase Console:');
    console.log('https://console.firebase.google.com/project/fibreflow-73daf/firestore');
    
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
main().then(() => {
  console.log('\nImport completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});