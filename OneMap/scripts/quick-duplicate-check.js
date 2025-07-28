const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findDuplicatePoles() {
  console.log('Starting quick duplicate check for VF OneMap data...\n');
  
  const duplicates = new Map(); // poleNumber -> array of {id, data}
  const processedCount = { count: 0 };
  const startTime = Date.now();
  
  try {
    // Use the correct collection name
    const polesRef = db.collection('vf-onemap-processed-records');
    
    // Process in batches for better performance
    const batchSize = 500;
    let lastDoc = null;
    let hasMore = true;
    
    while (hasMore) {
      let query = polesRef
        .select('poleNumber', 'createdAt', 'updatedAt', 'source')
        .orderBy('__name__')
        .limit(batchSize);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      snapshot.forEach(doc => {
        processedCount.count++;
        const data = doc.data();
        const poleNumber = data.poleNumber;
        
        if (poleNumber) {
          if (!duplicates.has(poleNumber)) {
            duplicates.set(poleNumber, []);
          }
          
          duplicates.get(poleNumber).push({
            id: doc.id,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            source: data.source
          });
        }
        
        // Progress indicator
        if (processedCount.count % 1000 === 0) {
          process.stdout.write(`\rProcessed ${processedCount.count} documents...`);
        }
      });
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      if (snapshot.size < batchSize) {
        hasMore = false;
      }
    }
    
    console.log(`\n\nProcessed ${processedCount.count} total documents`);
    
    // Filter to only keep duplicates (more than one document per poleNumber)
    const actualDuplicates = new Map();
    let totalDuplicateDocuments = 0;
    
    for (const [poleNumber, docs] of duplicates.entries()) {
      if (docs.length > 1) {
        actualDuplicates.set(poleNumber, docs);
        totalDuplicateDocuments += docs.length;
      }
    }
    
    // Generate report
    console.log('\n=== DUPLICATE POLES SUMMARY ===');
    console.log(`Total unique pole numbers with duplicates: ${actualDuplicates.size}`);
    console.log(`Total duplicate documents: ${totalDuplicateDocuments}`);
    console.log(`Processing time: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds\n`);
    
    // Show examples of duplicates
    console.log('=== EXAMPLE DUPLICATES (First 10) ===\n');
    
    let exampleCount = 0;
    for (const [poleNumber, docs] of actualDuplicates.entries()) {
      if (exampleCount >= 10) break;
      
      console.log(`Pole Number: ${poleNumber}`);
      console.log(`Duplicate Count: ${docs.length} documents`);
      
      docs.forEach((doc, index) => {
        const created = doc.createdAt ? new Date(doc.createdAt._seconds * 1000).toISOString() : 'N/A';
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Created: ${created}`);
        console.log(`     Source: ${doc.source || 'Unknown'}`);
      });
      
      console.log('');
      exampleCount++;
    }
    
    // Check for specific pole if provided
    const targetPole = 'LAW.P.C328';
    if (actualDuplicates.has(targetPole)) {
      console.log(`\n=== SPECIFIC POLE: ${targetPole} ===`);
      const docs = actualDuplicates.get(targetPole);
      console.log(`Found ${docs.length} documents for ${targetPole}:`);
      
      docs.forEach((doc, index) => {
        const created = doc.createdAt ? new Date(doc.createdAt._seconds * 1000).toISOString() : 'N/A';
        console.log(`\n${index + 1}. Document ID: ${doc.id}`);
        console.log(`   Created: ${created}`);
        console.log(`   Source: ${doc.source || 'Unknown'}`);
      });
    }
    
    // Statistics by prefix
    console.log('\n=== DUPLICATES BY PREFIX ===');
    const prefixStats = new Map();
    
    for (const [poleNumber, docs] of actualDuplicates.entries()) {
      const prefix = poleNumber.split('.')[0];
      if (!prefixStats.has(prefix)) {
        prefixStats.set(prefix, { count: 0, documents: 0 });
      }
      prefixStats.get(prefix).count++;
      prefixStats.get(prefix).documents += docs.length;
    }
    
    for (const [prefix, stats] of prefixStats.entries()) {
      console.log(`${prefix}: ${stats.count} unique poles, ${stats.documents} total documents`);
    }
    
    // Export duplicate list to file
    const duplicatesList = [];
    for (const [poleNumber, docs] of actualDuplicates.entries()) {
      duplicatesList.push({
        poleNumber,
        duplicateCount: docs.length,
        documentIds: docs.map(d => d.id),
        documents: docs
      });
    }
    
    const fs = require('fs');
    const outputPath = path.join(__dirname, '..', 'reports', `duplicate-poles-${new Date().toISOString().split('T')[0]}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(duplicatesList, null, 2));
    console.log(`\nDuplicate list exported to: ${outputPath}`);
    
    // Quick resolution strategy
    console.log('\n=== RECOMMENDED RESOLUTION ===');
    console.log('1. Keep the oldest document (earliest createdAt) for each pole');
    console.log('2. Delete newer duplicates');
    console.log('3. Total documents to delete: ' + (totalDuplicateDocuments - actualDuplicates.size));
    
  } catch (error) {
    console.error('\nError during duplicate check:', error);
  } finally {
    console.log('\nDuplicate check completed.');
    process.exit(0);
  }
}

// Run the check
findDuplicatePoles().catch(console.error);