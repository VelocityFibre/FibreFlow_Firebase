#!/usr/bin/env node

/**
 * Efficient dry run summary for production sync
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function dryRunSummary() {
  console.log('🔍 Running Production Sync Dry Run Analysis...\n');
  
  try {
    // Get all staged records
    const snapshot = await db.collection('onemap-processing-staging').get();
    console.log(`Total records in staging: ${snapshot.size}\n`);
    
    const stats = {
      total: 0,
      withPoleNumbers: 0,
      withoutPoleNumbers: 0,
      byStatus: {},
      byTargetCollection: {
        'planned-poles': 0,
        'pole-trackers': 0,
        'skipped': 0
      },
      duplicatePoles: {},
      projectMapping: {
        'LAW': 0,
        'MO': 0,
        'OTHER': 0
      }
    };
    
    // Analyze each record
    snapshot.forEach(doc => {
      const data = doc.data();
      stats.total++;
      
      // Check pole numbers
      if (data.poleNumber) {
        stats.withPoleNumbers++;
        
        // Track duplicates
        if (!stats.duplicatePoles[data.poleNumber]) {
          stats.duplicatePoles[data.poleNumber] = [];
        }
        stats.duplicatePoles[data.poleNumber].push(data.propertyId);
        
        // Project mapping
        const prefix = data.poleNumber.split('.')[0];
        if (prefix === 'LAW') stats.projectMapping.LAW++;
        else if (prefix === 'MO') stats.projectMapping.MO++;
        else stats.projectMapping.OTHER++;
        
        // Target collection based on status
        if (data.status?.includes('Installed') || 
            data.status?.includes('Completed') ||
            data.status?.includes('Active')) {
          stats.byTargetCollection['pole-trackers']++;
        } else {
          stats.byTargetCollection['planned-poles']++;
        }
      } else {
        stats.withoutPoleNumbers++;
        stats.byTargetCollection['skipped']++;
      }
      
      // Status breakdown
      const status = data.status || 'No Status';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });
    
    // Find actual duplicates
    const trueDuplicates = {};
    Object.entries(stats.duplicatePoles).forEach(([pole, properties]) => {
      if (properties.length > 1) {
        trueDuplicates[pole] = properties;
      }
    });
    
    // Generate report
    console.log('📊 DRY RUN SUMMARY REPORT');
    console.log('========================\n');
    
    console.log('RECORDS ANALYSIS:');
    console.log(`- Total in staging: ${stats.total}`);
    console.log(`- Ready to sync (have poles): ${stats.withPoleNumbers}`);
    console.log(`- Will be skipped (no poles): ${stats.withoutPoleNumbers}`);
    console.log(`- Flagged as Missing: ${stats.byStatus['Missing'] || 0}\n`);
    
    console.log('TARGET COLLECTIONS:');
    console.log(`- To planned-poles: ${stats.byTargetCollection['planned-poles']}`);
    console.log(`- To pole-trackers: ${stats.byTargetCollection['pole-trackers']}`);
    console.log(`- Skipped: ${stats.byTargetCollection['skipped']}\n`);
    
    console.log('PROJECT MAPPING:');
    console.log(`- Lawley (LAW): ${stats.projectMapping.LAW} poles`);
    console.log(`- Mohadin (MO): ${stats.projectMapping.MO} poles`);
    console.log(`- Other/Unknown: ${stats.projectMapping.OTHER} poles\n`);
    
    console.log('STATUS BREAKDOWN:');
    Object.entries(stats.byStatus)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`- ${status}: ${count}`);
      });
    
    console.log('\nDUPLICATE POLES:');
    console.log(`- Total unique poles: ${Object.keys(stats.duplicatePoles).length}`);
    console.log(`- Poles at multiple properties: ${Object.keys(trueDuplicates).length}`);
    
    if (Object.keys(trueDuplicates).length > 0) {
      console.log('\nTop 10 duplicate poles:');
      Object.entries(trueDuplicates)
        .sort(([,a], [,b]) => b.length - a.length)
        .slice(0, 10)
        .forEach(([pole, props]) => {
          console.log(`- ${pole}: ${props.length} properties (${props.slice(0, 3).join(', ')}${props.length > 3 ? '...' : ''})`);
        });
    }
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('1. This is a DRY RUN - no changes will be made');
    console.log('2. Duplicate poles will ALL be created (may need manual cleanup)');
    console.log('3. Records without pole numbers will be skipped');
    console.log(`4. All ${stats.projectMapping.LAW} LAW poles will link to Lawley project`);
    
    console.log('\n✅ READY TO SYNC?');
    console.log(`- ${stats.withPoleNumbers} records ready`);
    console.log(`- ${stats.withoutPoleNumbers} will be skipped`);
    console.log(`- ${Object.keys(trueDuplicates).length} duplicate pole issues to note`);
    
    // Save detailed report
    const fs = require('fs').promises;
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: stats,
      duplicatePoles: trueDuplicates,
      recommendations: [
        'Review duplicate poles before syncing',
        'Consider deduplication strategy',
        'Verify project mappings are correct'
      ]
    };
    
    await fs.writeFile(
      'reports/dry-run-analysis.json', 
      JSON.stringify(detailedReport, null, 2)
    );
    console.log('\n📄 Detailed report saved to: reports/dry-run-analysis.json');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

dryRunSummary();