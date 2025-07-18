const fs = require('fs');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
const app = initializeApp({
  credential: credential.applicationDefault(),
  projectId: 'fibreflow-73daf'
});

const db = getFirestore(app);

async function importLawleyDrops() {
  console.log('Starting Lawley drops import...');
  
  const csvPath = '/home/ldp/Downloads/Lawley Drops (CSV).csv';
  
  try {
    // Read CSV file
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV must contain at least header and one data row');
    }

    console.log(`Found ${lines.length - 1} drop records to process`);

    // Find Lawley project
    const projectsRef = db.collection('projects');
    const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
    
    if (lawleyQuery.empty) {
      throw new Error('Lawley project (Law-001) not found');
    }

    const lawleyProject = lawleyQuery.docs[0];
    const projectId = lawleyProject.id;
    console.log(`Found Lawley project: ${projectId}`);

    // Parse CSV data
    const drops = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < 28) {
        errors.push(`Row ${i}: Insufficient columns`);
        continue;
      }

      const record = {
        label: values[0] || '',           // DR1753027
        type: values[1] || '',            // Cable
        subtype: values[2] || '',         // Drop
        specification: values[3] || '',   // SM/G657A2
        dimension1: values[4] || '',      // 2.8mm
        dimension2: values[5] || '',      // 30m
        cableCapacity: values[6] || '',   // 1F
        contractor: values[7] || '',
        networkPattern: values[8] || '',
        componentOwner: values[9] || '',  // PlanNet
        startFeature: values[10] || '',   // LAW.P.C675
        endFeature: values[11] || '',     // LAW.ONT.DR1753027
        latitude: values[12] || '',
        longitude: values[13] || '',
        sg21: values[14] || '',
        sg26: values[15] || '',
        address: values[16] || '',
        ponNumber: values[17] || '',      // 135
        zoneNumber: values[18] || '',     // 11
        subplace: values[19] || '',       // 798038001
        mainplace: values[20] || '',      // 798038
        municipality: values[21] || '',   // City of Johannesburg
        stackRef: values[22] || '',       // LAW
        dateCreated: values[23] || '',    // 2025-04-14T07:50:57.765
        createdBy: values[24] || '',      // PlanNet
        dateEdited: values[25] || '',
        editedBy: values[26] || '',
        comments: values[27] || ''
      };

      // Process the record
      const dropErrors = [];
      
      // Extract drop number from label (DR1753027)
      const dropNumber = record.label;
      if (!dropNumber || !dropNumber.startsWith('DR')) {
        dropErrors.push('Invalid drop number format - must start with DR');
      }

      // Extract pole number from start feature (LAW.P.C675)
      const poleMatch = record.startFeature.match(/LAW\.P\.C(\d+)/);
      const poleNumber = poleMatch ? `C${poleMatch[1]}` : '';
      if (!poleNumber) {
        dropErrors.push('Cannot extract pole number from start feature');
      }

      // Extract ONT reference from end feature
      const ontReference = record.endFeature.replace('LAW.ONT.', '') || '';
      if (!ontReference) {
        dropErrors.push('Missing ONT reference');
      }

      // Parse cable length
      const cableLength = record.dimension2;
      if (!cableLength || !cableLength.includes('m')) {
        dropErrors.push('Invalid cable length format');
      }

      // Parse date
      let dateCreated;
      try {
        dateCreated = new Date(record.dateCreated);
        if (isNaN(dateCreated.getTime())) {
          throw new Error('Invalid date');
        }
      } catch {
        dropErrors.push('Invalid date format');
        dateCreated = new Date();
      }

      const processedDrop = {
        dropId: record.label,
        dropNumber: dropNumber,
        poleNumber: poleNumber,
        ontReference: ontReference,
        cableLength: cableLength,
        cableType: `${record.specification} ${record.dimension1}`,
        ponNumber: record.ponNumber,
        zoneNumber: record.zoneNumber,
        municipality: record.municipality,
        projectCode: record.stackRef,
        dateCreated: dateCreated,
        createdBy: record.createdBy,
        status: 'planned',
        valid: dropErrors.length === 0,
        errors: dropErrors,
        rawData: record
      };

      if (processedDrop.valid) {
        drops.push(processedDrop);
      } else {
        errors.push(`Row ${i} (${dropNumber}): ${dropErrors.join(', ')}`);
      }
    }

    console.log(`Processed ${drops.length} valid drops, ${errors.length} errors`);

    // Check for existing drops
    const existingDrops = [];
    const dropsRef = db.collection('drops');
    const existingQuery = await dropsRef.where('projectId', '==', projectId).get();
    
    existingQuery.forEach(doc => {
      const data = doc.data();
      if (data.dropNumber) {
        existingDrops.push(data.dropNumber);
      }
    });

    console.log(`Found ${existingDrops.length} existing drops in project`);

    // Filter out duplicates
    const newDrops = drops.filter(drop => !existingDrops.includes(drop.dropNumber));
    const duplicates = drops.filter(drop => existingDrops.includes(drop.dropNumber));

    console.log(`${newDrops.length} new drops to import, ${duplicates.length} duplicates skipped`);

    // Import new drops
    const batch = db.batch();
    let successCount = 0;

    for (const drop of newDrops) {
      const docRef = dropsRef.doc();
      batch.set(docRef, {
        id: docRef.id,
        projectId: projectId,
        dropNumber: drop.dropNumber,
        dropId: drop.dropId,
        poleNumber: drop.poleNumber,
        ontReference: drop.ontReference,
        cableLength: drop.cableLength,
        cableType: drop.cableType,
        ponNumber: drop.ponNumber,
        zoneNumber: drop.zoneNumber,
        municipality: drop.municipality,
        projectCode: drop.projectCode,
        status: drop.status,
        dateCreated: Timestamp.fromDate(drop.dateCreated),
        createdBy: drop.createdBy,
        importedBy: 'system',
        importedAt: Timestamp.now(),
        lastModified: Timestamp.now(),
        lastModifiedBy: 'system',
        rawImportData: drop.rawData
      });
      successCount++;
    }

    if (successCount > 0) {
      await batch.commit();
      console.log(`Successfully imported ${successCount} drops`);
    }

    // Print summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total records processed: ${lines.length - 1}`);
    console.log(`Valid drops: ${drops.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Existing duplicates: ${duplicates.length}`);
    console.log(`New drops imported: ${successCount}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(error => console.log(error));
    }

    if (duplicates.length > 0) {
      console.log('\n=== DUPLICATES SKIPPED ===');
      duplicates.forEach(drop => console.log(`${drop.dropNumber} (${drop.dropId})`));
    }

    console.log('\nImport completed successfully!');

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importLawleyDrops().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});