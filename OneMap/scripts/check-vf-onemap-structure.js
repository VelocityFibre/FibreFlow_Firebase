#!/usr/bin/env node

/**
 * Check VF OneMap database structure and find collections
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkDatabaseStructure() {
  console.log('🔍 VF-ONEMAP-DATA DATABASE STRUCTURE CHECK\n');
  console.log('Project ID: vf-onemap-data');
  console.log('='.repeat(80) + '\n');

  try {
    // List all root collections
    const collections = await db.listCollections();
    
    console.log(`Found ${collections.length} root collections:\n`);
    
    for (const collection of collections) {
      console.log(`\n📁 Collection: ${collection.id}`);
      console.log('-'.repeat(40));
      
      // Get document count (limited for performance)
      const snapshot = await collection.limit(10).get();
      console.log(`Sample size: ${snapshot.size} documents`);
      
      if (snapshot.size > 0) {
        // Show structure of first document
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data();
        
        console.log(`\nDocument ID: ${firstDoc.id}`);
        console.log('Fields:');
        
        // Show key fields
        const keyFields = Object.keys(data).slice(0, 10);
        keyFields.forEach(field => {
          const value = data[field];
          const type = Array.isArray(value) ? 'array' : typeof value;
          console.log(`  - ${field}: ${type}`);
          
          // Show sample value for important fields
          if (['Property ID', 'Pole Number', 'Drop Number', 'Site', 'Status'].includes(field)) {
            console.log(`    → ${value}`);
          }
        });
        
        if (Object.keys(data).length > 10) {
          console.log(`  ... and ${Object.keys(data).length - 10} more fields`);
        }
      }
    }
    
    // Look specifically for Lawley data
    console.log('\n\n🎯 SEARCHING FOR LAWLEY DATA:');
    console.log('='.repeat(80));
    
    for (const collection of collections) {
      const searchQueries = [
        // Try searching by file name patterns
        collection.where('fileName', '>=', 'Lawley').where('fileName', '<', 'Lawlez').limit(1),
        // Try by batch ID pattern
        collection.where('batchId', '>=', 'IMP_').where('batchId', '<', 'IMQ_').limit(1),
        // Try direct document access
        collection.limit(1)
      ];
      
      for (const query of searchQueries) {
        try {
          const result = await query.get();
          if (!result.empty) {
            const doc = result.docs[0].data();
            
            // Check if this looks like Lawley data
            const jsonStr = JSON.stringify(doc).toLowerCase();
            if (jsonStr.includes('lawley') || jsonStr.includes('law.p.')) {
              console.log(`\n✅ Found Lawley data in collection: ${collection.id}`);
              console.log('Sample document contains Lawley references');
              break;
            }
          }
        } catch (e) {
          // Query might fail, continue
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

// Run check
checkDatabaseStructure().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});