const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp({projectId: 'fibreflow-73daf'});
}

const db = admin.firestore();

async function debugImportMystery() {
  console.log('🔍 Debugging Import Mystery: Why only 333 of 746?\n');
  
  try {
    // 1. Read the original CSV
    const fileContent = await fs.readFile('OneMap/downloads/Lawley May Week 3 22052025 - First Report.csv', 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`📄 CSV File Analysis:`);
    console.log(`- Total rows: ${records.length}`);
    
    // 2. Get all property IDs from CSV
    const csvPropertyIds = new Set();
    records.forEach(record => {
      const propId = record['Property ID'] || record['﻿Property ID'];
      if (propId) csvPropertyIds.add(propId.trim());
    });
    console.log(`- Unique Property IDs: ${csvPropertyIds.size}`);
    
    // 3. Get all docs from staging
    const stagingDocs = await db.collection('onemap-processing-staging').get();
    const stagingPropertyIds = new Set();
    stagingDocs.forEach(doc => {
      if (doc.data().propertyId) {
        stagingPropertyIds.add(doc.data().propertyId);
      }
    });
    
    console.log(`\n📊 Staging Collection Analysis:`);
    console.log(`- Total documents: ${stagingDocs.size}`);
    console.log(`- Unique Property IDs: ${stagingPropertyIds.size}`);
    
    // 4. Find missing property IDs
    const missingFromStaging = [];
    csvPropertyIds.forEach(propId => {
      if (!stagingPropertyIds.has(propId)) {
        missingFromStaging.push(propId);
      }
    });
    
    console.log(`\n❌ Missing from Staging: ${missingFromStaging.length} records`);
    
    // 5. Analyze missing records
    if (missingFromStaging.length > 0) {
      console.log('\n🔍 Analyzing missing records...');
      
      // Sample first 10 missing records
      const sampleMissing = missingFromStaging.slice(0, 10);
      console.log('\nSample missing Property IDs:');
      
      for (const propId of sampleMissing) {
        const record = records.find(r => 
          (r['Property ID'] || r['﻿Property ID']) === propId
        );
        
        if (record) {
          console.log(`\nProperty: ${propId}`);
          console.log(`- Status: ${record['Status'] || 'N/A'}`);
          console.log(`- Pole: ${record['Pole Number'] || 'N/A'}`);
          console.log(`- Address: ${record['Location Address']?.substring(0, 50)}...`);
        }
      }
      
      // Check if missing records have specific patterns
      const missingByStatus = {};
      missingFromStaging.forEach(propId => {
        const record = records.find(r => 
          (r['Property ID'] || r['﻿Property ID']) === propId
        );
        if (record) {
          const status = record['Status'] || 'No Status';
          missingByStatus[status] = (missingByStatus[status] || 0) + 1;
        }
      });
      
      console.log('\n📊 Missing Records by Status:');
      Object.entries(missingByStatus)
        .sort(([,a], [,b]) => b - a)
        .forEach(([status, count]) => {
          console.log(`- ${status}: ${count}`);
        });
    }
    
    // 6. Check if script was interrupted
    console.log('\n💡 Possible Explanations:');
    console.log('1. Script was interrupted after 333 records');
    console.log('2. Script encountered an error and stopped');
    console.log('3. There was a filter/condition that excluded records');
    console.log('4. Multiple partial imports were run');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugImportMystery();