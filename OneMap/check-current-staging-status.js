#!/usr/bin/env node

/**
 * Comprehensive Staging Database Status Check
 * 
 * This script provides a complete overview of what's currently in the OneMap staging database
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function checkStagingStatus() {
  console.log(`
================================================================================
                    ONEMAP STAGING DATABASE STATUS CHECK
                          ${new Date().toISOString()}
================================================================================
`);

  try {
    // 1. Check staging collection
    console.log('📊 STAGING COLLECTION OVERVIEW');
    console.log('================================\n');
    
    const stagingSnapshot = await db.collection('onemap-processing-staging').get();
    console.log(`Total records in staging: ${stagingSnapshot.size}`);
    
    if (stagingSnapshot.size === 0) {
      console.log('\n❌ No records found in staging database.');
      console.log('   The staging database appears to be empty.');
      return;
    }
    
    // 2. Analyze status distribution
    console.log('\n📈 STATUS DISTRIBUTION');
    console.log('========================');
    
    const statusCounts = {};
    let missingPoleCount = 0;
    let missingAgentCount = 0;
    const importIds = new Set();
    
    stagingSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.Status || 'No Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (!data['Pole Number']) missingPoleCount++;
      if (!data['Field Agent']) missingAgentCount++;
      if (data.importId) importIds.add(data.importId);
    });
    
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stagingSnapshot.size) * 100).toFixed(1);
        console.log(`- ${status}: ${count} records (${percentage}%)`);
      });
    
    // 3. Data quality metrics
    console.log('\n📋 DATA QUALITY METRICS');
    console.log('=========================');
    console.log(`Records with pole numbers: ${stagingSnapshot.size - missingPoleCount} (${((1 - missingPoleCount/stagingSnapshot.size) * 100).toFixed(1)}%)`);
    console.log(`Records with field agents: ${stagingSnapshot.size - missingAgentCount} (${((1 - missingAgentCount/stagingSnapshot.size) * 100).toFixed(1)}%)`);
    console.log(`Records missing pole numbers: ${missingPoleCount} (${((missingPoleCount/stagingSnapshot.size) * 100).toFixed(1)}%)`);
    console.log(`Records missing field agents: ${missingAgentCount} (${((missingAgentCount/stagingSnapshot.size) * 100).toFixed(1)}%)`);
    
    // 4. Import batch analysis
    console.log('\n📦 IMPORT BATCHES');
    console.log('===================');
    console.log(`Total unique import IDs: ${importIds.size}`);
    
    if (importIds.size > 0) {
      console.log('\nImport IDs found:');
      Array.from(importIds).sort().forEach(id => {
        console.log(`- ${id}`);
      });
    }
    
    // 5. Check imports collection for metadata
    console.log('\n📋 IMPORT METADATA');
    console.log('====================');
    
    const importsSnapshot = await db.collection('onemap-processing-imports')
      .orderBy('importDate', 'desc')
      .limit(10)
      .get();
    
    if (!importsSnapshot.empty) {
      console.log(`\nRecent imports (last 10):`);
      importsSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.importDate?.toDate?.() || data.importDate;
        const dateStr = date ? new Date(date).toLocaleString() : 'Unknown';
        console.log(`\n- Import ID: ${data.importId}`);
        console.log(`  File: ${data.fileName || 'Unknown'}`);
        console.log(`  Date: ${dateStr}`);
        console.log(`  Records: ${data.recordCount || 0}`);
        console.log(`  Status: ${data.status || 'Unknown'}`);
      });
    }
    
    // 6. Look for June 3rd specific data
    console.log('\n🔍 JUNE 3RD DATA CHECK');
    console.log('========================');
    
    const june3ImportIds = Array.from(importIds).filter(id => 
      id.includes('2025-06-03') || id.includes('2025-07-22_1753169450662')
    );
    
    if (june3ImportIds.length > 0) {
      console.log(`\n✅ June 3rd data found!`);
      console.log(`Import IDs: ${june3ImportIds.join(', ')}`);
      
      // Count June 3rd records
      let june3Count = 0;
      stagingSnapshot.forEach(doc => {
        if (june3ImportIds.includes(doc.data().importId)) {
          june3Count++;
        }
      });
      
      console.log(`Total June 3rd records in staging: ${june3Count}`);
    } else {
      console.log('\n⚠️  No June 3rd import IDs found in staging data.');
      console.log('   June 3rd data may have been synced to production or not yet imported to staging.');
    }
    
    // 7. Sample records
    console.log('\n📄 SAMPLE RECORDS');
    console.log('===================');
    console.log('First 3 records in staging:\n');
    
    const sampleDocs = stagingSnapshot.docs.slice(0, 3);
    sampleDocs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Record ${index + 1}:`);
      console.log(`- Property ID: ${data['Property ID'] || 'N/A'}`);
      console.log(`- Pole Number: ${data['Pole Number'] || 'N/A'}`);
      console.log(`- Status: ${data.Status || 'N/A'}`);
      console.log(`- Field Agent: ${data['Field Agent'] || 'N/A'}`);
      console.log(`- Import ID: ${data.importId || 'N/A'}`);
      console.log('');
    });
    
    // 8. Summary and recommendations
    console.log('\n📌 SUMMARY & RECOMMENDATIONS');
    console.log('================================');
    
    if (stagingSnapshot.size > 0) {
      console.log(`\n✅ Staging database contains ${stagingSnapshot.size} records`);
      
      const approvedCount = statusCounts['Pole Permission: Approved'] || 0;
      if (approvedCount > 0) {
        console.log(`✅ ${approvedCount} records are approved and ready for production sync`);
      }
      
      if (missingPoleCount > stagingSnapshot.size * 0.3) {
        console.log(`\n⚠️  High percentage of records missing pole numbers (${((missingPoleCount/stagingSnapshot.size) * 100).toFixed(1)}%)`);
        console.log('   Consider data cleanup before syncing to production.');
      }
      
      console.log('\n📋 Next Steps:');
      console.log('1. To sync approved records to production:');
      console.log('   node sync-to-production.js');
      console.log('\n2. To import new CSV files:');
      console.log('   node import-csv-efficient.js');
      console.log('\n3. To check sync status:');
      console.log('   node check-sync-status.js');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking staging status:', error);
  }
}

// Run the check
checkStagingStatus().then(() => {
  console.log('\n✅ Status check complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});