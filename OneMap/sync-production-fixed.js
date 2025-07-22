#!/usr/bin/env node

/**
 * Fixed sync to production script
 * Handles undefined values properly
 */

const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = require('../fibreflow-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://fibreflow-73daf.firebaseio.com'
  });
}

const db = admin.firestore();

// IMPORTANT: Each pole can serve up to 8 houses
// Duplicates are expected and normal
const MAX_HOUSES_PER_POLE = 8;

async function syncToProduction(importId) {
  const syncId = `SYNC_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
  
  console.log(`\n🚀 Starting production sync for import: ${importId}`);
  console.log(`📋 Sync ID: ${syncId}`);
  
  try {
    // Get staged records for this import
    const staged = await db.collection('onemap-processing-staging')
      .where('import_id', '==', importId)
      .get();
    
    console.log(`📊 Found ${staged.size} records to sync`);
    
    const stats = {
      total: staged.size,
      synced: 0,
      skipped: 0,
      errors: 0,
      withPoles: 0,
      withoutPoles: 0,
      poleConnections: {} // Track houses per pole
    };
    
    // Process in batches
    const BATCH_SIZE = 100;
    const docs = staged.docs;
    
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      const writeBatch = db.batch();
      
      for (const doc of batch) {
        try {
          const data = doc.data();
          const mapped = data.mapped_data || {};
          
          // Clean data - remove undefined values
          const cleanData = {};
          Object.entries(mapped).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              cleanData[key] = value;
            }
          });
          
          // Add metadata
          cleanData.import_id = importId;
          cleanData.sync_id = syncId;
          cleanData.synced_at = Timestamp.now();
          
          // Track pole connections
          if (cleanData.poleNumber) {
            stats.withPoles++;
            stats.poleConnections[cleanData.poleNumber] = 
              (stats.poleConnections[cleanData.poleNumber] || 0) + 1;
          } else {
            stats.withoutPoles++;
          }
          
          // Determine collection based on status
          const collection = cleanData.status === 'Home Installation: Installed' 
            ? 'pole-trackers' 
            : 'planned-poles';
          
          // Use property ID as document ID
          const docId = `PROP_${cleanData.propertyId}`;
          const docRef = db.collection(collection).doc(docId);
          
          writeBatch.set(docRef, cleanData, { merge: true });
          stats.synced++;
          
        } catch (error) {
          console.error(`❌ Error processing ${doc.id}:`, error.message);
          stats.errors++;
        }
      }
      
      await writeBatch.commit();
      console.log(`✅ Synced ${stats.synced}/${stats.total} records...`);
    }
    
    // Generate pole analysis
    const poleAnalysis = analyzePoleConnections(stats.poleConnections);
    
    // Save sync record
    await db.collection('sync-logs').doc(syncId).set({
      import_id: importId,
      sync_date: Timestamp.now(),
      stats: stats,
      pole_analysis: poleAnalysis
    });
    
    // Generate report
    const report = generateSyncReport(importId, syncId, stats, poleAnalysis);
    console.log(report);
    
    // Save report
    const fs = require('fs').promises;
    const reportPath = `OneMap/reports/SYNC_REPORT_${importId}.md`;
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

function analyzePoleConnections(poleConnections) {
  const analysis = {
    total_poles: Object.keys(poleConnections).length,
    max_connections: 0,
    over_capacity: [],
    distribution: {}
  };
  
  Object.entries(poleConnections).forEach(([pole, count]) => {
    // Track distribution
    analysis.distribution[count] = (analysis.distribution[count] || 0) + 1;
    
    // Track max
    if (count > analysis.max_connections) {
      analysis.max_connections = count;
    }
    
    // Track over capacity (more than 8 houses)
    if (count > MAX_HOUSES_PER_POLE) {
      analysis.over_capacity.push({ pole, count });
    }
  });
  
  return analysis;
}

function generateSyncReport(importId, syncId, stats, poleAnalysis) {
  const now = new Date().toISOString();
  
  return `# PRODUCTION SYNC REPORT

Generated: ${now}  
Import ID: ${importId}  
Sync ID: ${syncId}

## Sync Summary
- **Total Records**: ${stats.total}
- **Successfully Synced**: ${stats.synced}
- **Errors**: ${stats.errors}
- **Skipped**: ${stats.skipped}

## Data Analysis
- **Records with Poles**: ${stats.withPoles} (${((stats.withPoles/stats.total)*100).toFixed(1)}%)
- **Records without Poles**: ${stats.withoutPoles} (${((stats.withoutPoles/stats.total)*100).toFixed(1)}%)

## Pole Connection Analysis
- **Total Unique Poles**: ${poleAnalysis.total_poles}
- **Max Houses per Pole**: ${poleAnalysis.max_connections}
- **Average Houses per Pole**: ${(stats.withPoles / poleAnalysis.total_poles).toFixed(1)}

### Houses per Pole Distribution
${Object.entries(poleAnalysis.distribution)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .map(([houses, count]) => `- ${houses} house(s): ${count} poles`)
  .join('\n')}

${poleAnalysis.over_capacity.length > 0 ? `
### ⚠️ POLES OVER CAPACITY (>8 houses)
${poleAnalysis.over_capacity
  .sort((a, b) => b.count - a.count)
  .map(({pole, count}) => `- **${pole}**: ${count} houses`)
  .join('\n')}
` : '### ✅ All poles within capacity (≤8 houses)'}

## Status
- ✅ Data synced to production collections
- 📊 Records available in: planned-poles, pole-trackers

---
*Sync completed at ${new Date().toLocaleString()}*
`;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node sync-production-fixed.js <import-id>');
  process.exit(1);
}

syncToProduction(args[0]).then(() => process.exit(0));