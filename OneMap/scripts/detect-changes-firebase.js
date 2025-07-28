#!/usr/bin/env node

/**
 * Detect changes between May 22 and May 23 data in vf-onemap-data
 * Uses import batch IDs to compare data
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function detectChanges() {
  try {
    console.log('🔍 Detecting changes between imports in vf-onemap-data...\n');
    
    // Get import batches
    const batchesSnapshot = await db.collection('vf-onemap-import-batches')
      .orderBy('importedAt', 'asc')
      .get();
    
    if (batchesSnapshot.size < 2) {
      console.log('❌ Need at least 2 imports to compare changes');
      await admin.app().delete();
      return;
    }
    
    const batches = [];
    batchesSnapshot.forEach(doc => {
      batches.push(doc.data());
    });
    
    // Get the two imports (May 22 and May 23)
    const batch1 = batches[0]; // May 22
    const batch2 = batches[1]; // May 23
    
    console.log(`📋 Comparing imports:`);
    console.log(`- Import 1: ${batch1.fileName} (${batch1.batchId})`);
    console.log(`- Import 2: ${batch2.fileName} (${batch2.batchId})\n`);
    
    // Get all records and organize by import batch
    const allRecordsSnapshot = await db.collection('vf-onemap-processed-records').get();
    
    const recordsByProperty = new Map();
    const batch1Properties = new Set();
    const batch2Properties = new Set();
    
    allRecordsSnapshot.forEach(doc => {
      const data = doc.data();
      const propertyId = data.propertyId;
      
      if (!recordsByProperty.has(propertyId)) {
        recordsByProperty.set(propertyId, {});
      }
      
      if (data.importBatchId === batch1.batchId) {
        recordsByProperty.get(propertyId).batch1 = data;
        batch1Properties.add(propertyId);
      } else if (data.importBatchId === batch2.batchId) {
        recordsByProperty.get(propertyId).batch2 = data;
        batch2Properties.add(propertyId);
      }
    });
    
    console.log(`📊 Import 1: ${batch1Properties.size} unique properties`);
    console.log(`📊 Import 2: ${batch2Properties.size} unique properties\n`);
    
    // Analyze changes
    const newRecords = [];
    const changedRecords = [];
    const deletedRecords = [];
    const unchangedCount = {count: 0};
    
    // Check for new and changed records
    for (const propertyId of batch2Properties) {
      const record = recordsByProperty.get(propertyId);
      
      if (!batch1Properties.has(propertyId)) {
        // New record in batch2
        newRecords.push(record.batch2);
      } else {
        // Check for changes
        const changes = detectFieldChanges(record.batch1, record.batch2);
        
        if (changes.length > 0) {
          changedRecords.push({
            propertyId,
            changes,
            oldRecord: record.batch1,
            newRecord: record.batch2
          });
        } else {
          unchangedCount.count++;
        }
      }
    }
    
    // Check for deleted records (in batch1 but not batch2)
    for (const propertyId of batch1Properties) {
      if (!batch2Properties.has(propertyId)) {
        const record = recordsByProperty.get(propertyId);
        deletedRecords.push(record.batch1);
      }
    }
    
    // Generate report
    console.log('📋 CHANGE DETECTION REPORT');
    console.log('========================\n');
    
    console.log(`✨ NEW RECORDS: ${newRecords.length}`);
    if (newRecords.length > 0) {
      console.log('\nFirst 10 new records:');
      newRecords.slice(0, 10).forEach(record => {
        console.log(`- Property ${record.propertyId}: ${record.status || 'No status'} (${record.poleNumber || 'No pole'})`);
      });
    }
    
    console.log(`\n🔄 CHANGED RECORDS: ${changedRecords.length}`);
    if (changedRecords.length > 0) {
      console.log('\nFirst 10 changed records:');
      changedRecords.slice(0, 10).forEach(({propertyId, changes}) => {
        console.log(`\n- Property ${propertyId}:`);
        changes.forEach(change => {
          console.log(`  ${change.field}: "${change.oldValue}" → "${change.newValue}"`);
        });
      });
    }
    
    console.log(`\n❌ DELETED RECORDS: ${deletedRecords.length}`);
    if (deletedRecords.length > 0) {
      console.log('\nFirst 10 deleted records:');
      deletedRecords.slice(0, 10).forEach(record => {
        console.log(`- Property ${record.propertyId}: ${record.status || 'No status'}`);
      });
    }
    
    console.log(`\n✓ UNCHANGED RECORDS: ${unchangedCount.count}`);
    
    // Summary by change type
    if (changedRecords.length > 0) {
      const changeTypes = {};
      changedRecords.forEach(({changes}) => {
        changes.forEach(change => {
          changeTypes[change.field] = (changeTypes[change.field] || 0) + 1;
        });
      });
      
      console.log('\n📊 CHANGES BY TYPE:');
      Object.entries(changeTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([field, count]) => {
          console.log(`- ${field}: ${count} changes`);
        });
    }
    
    // Generate detailed report
    const detailedReport = await generateDetailedReport({
      batch1,
      batch2,
      newRecords,
      changedRecords,
      deletedRecords,
      unchangedCount: unchangedCount.count,
      batch1Count: batch1Properties.size,
      batch2Count: batch2Properties.size
    });
    
    // Save report
    const reportsDir = path.join(__dirname, '../reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, `change-detection-firebase-${Date.now()}.md`);
    await fs.writeFile(reportPath, detailedReport);
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function detectFieldChanges(oldRecord, newRecord) {
  const changes = [];
  const fieldsToCheck = [
    'status',
    'poleNumber',
    'fieldAgentName',
    'dropNumber',
    'locationAddress',
    'latitude',
    'longitude',
    'flowNameGroups'
  ];
  
  fieldsToCheck.forEach(field => {
    const oldValue = oldRecord[field] || '';
    const newValue = newRecord[field] || '';
    
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue
      });
    }
  });
  
  return changes;
}

async function generateDetailedReport(data) {
  const report = `# VF-ONEMAP-DATA CHANGE DETECTION REPORT
========================================

Generated: ${new Date().toISOString()}
Database: vf-onemap-data

## Import Comparison
-------------------
**Import 1**: ${data.batch1.fileName}
- Batch ID: ${data.batch1.batchId}
- Records: ${data.batch1Count}
- Date: ${data.batch1.importedAt ? new Date(data.batch1.importedAt._seconds * 1000).toISOString() : 'Unknown'}

**Import 2**: ${data.batch2.fileName}
- Batch ID: ${data.batch2.batchId}
- Records: ${data.batch2Count}
- Date: ${data.batch2.importedAt ? new Date(data.batch2.importedAt._seconds * 1000).toISOString() : 'Unknown'}

## Change Summary
----------------
- **New Records**: ${data.newRecords.length}
- **Changed Records**: ${data.changedRecords.length}
- **Deleted Records**: ${data.deletedRecords.length}
- **Unchanged Records**: ${data.unchangedCount}

## New Records Detail
--------------------
${data.newRecords.length > 0 ? 
  data.newRecords.slice(0, 20).map((r, i) => `
### ${i + 1}. Property: ${r.propertyId}
- Status: ${r.status || 'N/A'}
- Pole: ${r.poleNumber || 'N/A'}
- Drop: ${r.dropNumber || 'N/A'}
- Agent: ${r.fieldAgentName || 'N/A'}
- Address: ${r.locationAddress || 'N/A'}`).join('\n') : 
  'No new records found.'}
${data.newRecords.length > 20 ? `\n... and ${data.newRecords.length - 20} more new records` : ''}

## Changed Records Detail
------------------------
${data.changedRecords.length > 0 ?
  data.changedRecords.slice(0, 20).map((r, i) => `
### ${i + 1}. Property: ${r.propertyId}
**Changes:**
${r.changes.map(c => `- ${c.field}: "${c.oldValue}" → "${c.newValue}"`).join('\n')}
`).join('\n') :
  'No changed records found.'}
${data.changedRecords.length > 20 ? `\n... and ${data.changedRecords.length - 20} more changed records` : ''}

## Deleted Records Detail
------------------------
${data.deletedRecords.length > 0 ?
  data.deletedRecords.slice(0, 20).map((r, i) => `
### ${i + 1}. Property: ${r.propertyId}
- Status: ${r.status || 'N/A'}
- Pole: ${r.poleNumber || 'N/A'}
- Agent: ${r.fieldAgentName || 'N/A'}`).join('\n') :
  'No deleted records found.'}
${data.deletedRecords.length > 20 ? `\n... and ${data.deletedRecords.length - 20} more deleted records` : ''}

## Change Analysis
-----------------
${(() => {
  if (data.changedRecords.length === 0) return 'No changes to analyze.';
  
  const changeTypes = {};
  data.changedRecords.forEach(({changes}) => {
    changes.forEach(change => {
      changeTypes[change.field] = (changeTypes[change.field] || 0) + 1;
    });
  });
  
  return Object.entries(changeTypes)
    .sort(([,a], [,b]) => b - a)
    .map(([field, count]) => `- ${field}: ${count} changes`)
    .join('\n');
})()}

## Data Quality Notes
--------------------
- Total unique properties across both imports: ${data.batch1Count + data.newRecords.length}
- Properties removed between imports: ${data.deletedRecords.length}
- Net change in records: ${data.newRecords.length - data.deletedRecords.length > 0 ? '+' : ''}${data.newRecords.length - data.deletedRecords.length}

---
*This report compares sequential imports in vf-onemap-data*
*Use this to track data evolution and quality improvements*
`;

  return report;
}

// Run the change detection
detectChanges();