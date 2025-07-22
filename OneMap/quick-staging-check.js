#!/usr/bin/env node

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function quickCheck() {
  console.log('\nQUICK STAGING DATABASE CHECK');
  console.log('============================\n');
  
  try {
    // Get count using aggregation (much faster)
    const countQuery = db.collection('onemap-processing-staging').count();
    const countSnapshot = await countQuery.get();
    const totalCount = countSnapshot.data().count;
    
    console.log(`Total records in staging: ${totalCount}`);
    
    // Check for June 3rd data
    console.log('\nChecking for June 3rd data...');
    
    // Look for specific June 3rd import ID
    const june3Query = await db.collection('onemap-processing-staging')
      .where('importId', '==', 'IMP_2025-07-22_1753169450662')
      .limit(5)
      .get();
    
    console.log(`June 3rd records found (Import ID IMP_2025-07-22_1753169450662): ${june3Query.size}`);
    
    if (june3Query.size > 0) {
      // Count total June 3rd records
      const june3Count = await db.collection('onemap-processing-staging')
        .where('importId', '==', 'IMP_2025-07-22_1753169450662')
        .count()
        .get();
      
      console.log(`Total June 3rd records in staging: ${june3Count.data().count}`);
      
      // Show sample
      const sample = june3Query.docs[0].data();
      console.log('\nSample June 3rd record:');
      console.log(`- Property ID: ${sample['Property ID']}`);
      console.log(`- Pole Number: ${sample['Pole Number'] || 'N/A'}`);
      console.log(`- Status: ${sample.Status || 'N/A'}`);
    }
    
    // Check imports metadata
    console.log('\nRecent imports:');
    const imports = await db.collection('onemap-processing-imports')
      .orderBy('importDate', 'desc')
      .limit(5)
      .get();
    
    imports.forEach(doc => {
      const data = doc.data();
      const date = data.importDate?.toDate?.() || data.importDate;
      console.log(`\n- ${data.importId}`);
      console.log(`  File: ${data.fileName}`);
      console.log(`  Records: ${data.recordCount}`);
      console.log(`  Date: ${date ? new Date(date).toLocaleString() : 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

quickCheck().then(() => process.exit(0));