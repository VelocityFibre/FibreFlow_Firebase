const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function checkJune3Data() {
  try {
    console.log('Checking staging database contents...');
    
    // First check what's in the staging collection
    const allDocs = await db.collection('onemap-processing-staging')
      .limit(10)
      .get();
    
    console.log('\nTotal docs in staging:', allDocs.size);
    
    if (allDocs.size > 0) {
      console.log('\nSample document structure:');
      const firstDoc = allDocs.docs[0].data();
      console.log(JSON.stringify(firstDoc, null, 2));
      
      // Check unique statuses
      const statusCheck = await db.collection('onemap-processing-staging')
        .select('Status')
        .limit(100)
        .get();
      
      const statuses = new Set();
      statusCheck.forEach(doc => {
        if (doc.data().Status) {
          statuses.add(doc.data().Status);
        }
      });
      
      console.log('\nUnique statuses found:');
      Array.from(statuses).sort().forEach(status => console.log(`- ${status}`));
    }
    
    // Now specifically look for June 3rd data
    console.log('\n\nLooking for June 3rd data...');
    
    // Check imports to find June 3rd import
    const imports = await db.collection('onemap-processing-imports')
      .where('importDate', '>=', new Date('2025-06-03T00:00:00'))
      .where('importDate', '<', new Date('2025-06-04T00:00:00'))
      .get();
    
    console.log('June 3rd imports found:', imports.size);
    
    if (imports.size > 0) {
      imports.forEach(doc => {
        const data = doc.data();
        console.log('\nImport:', {
          id: data.importId,
          fileName: data.fileName,
          recordCount: data.recordCount,
          date: data.importDate?.toDate?.() || data.importDate
        });
      });
    }
    
    // Try checking production data from June 3rd
    console.log('\n\nChecking production data...');
    const prodDocs = await db.collection('onemap-processing')
      .where('importId', '>=', 'IMP_2025-06-03')
      .where('importId', '<', 'IMP_2025-06-04')
      .limit(5)
      .get();
    
    console.log('Production docs from June 3rd:', prodDocs.size);
    
    if (prodDocs.size > 0) {
      console.log('\nSample June 3rd production record:');
      const sampleData = prodDocs.docs[0].data();
      console.log({
        propertyId: sampleData['Property ID'],
        poleNumber: sampleData['Pole Number'],
        status: sampleData.Status,
        address: sampleData['Street Address'],
        importId: sampleData.importId
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkJune3Data();