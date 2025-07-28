#!/usr/bin/env node

/**
 * Generate comprehensive duplicate pole report
 * Shows statistics, patterns, and recommendations
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function generateDuplicateReport() {
  console.log('📊 COMPREHENSIVE DUPLICATE POLE ANALYSIS');
  console.log('Database: vf-onemap-data');
  console.log('Generated:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');

  const report = {
    generatedAt: new Date().toISOString(),
    database: 'vf-onemap-data',
    collection: 'vf-onemap-processed-records',
    statistics: {
      totalRecords: 0,
      recordsWithPoles: 0,
      uniquePoles: 0,
      duplicatePoles: 0,
      affectedRecords: 0,
      maxDuplicatesPerPole: 0,
      avgDuplicatesPerPole: 0
    },
    patterns: {
      bySite: new Map(),
      byAgent: new Map(),
      byMonth: new Map(),
      byDuplicateCount: new Map()
    },
    samples: [],
    recommendations: []
  };

  try {
    // Map to store pole numbers and their documents
    const poleMap = new Map();
    const siteStats = new Map();
    const agentStats = new Map();
    const monthStats = new Map();
    
    console.log('📊 Phase 1: Scanning database...\n');
    
    // Process all records
    let lastDocId = null;
    let batchCount = 0;
    const batchSize = 1000;
    
    while (true) {
      let query = db.collection('vf-onemap-processed-records')
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(batchSize);
      
      if (lastDocId) {
        query = query.startAfter(lastDocId);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) break;
      
      batchCount++;
      process.stdout.write(`\rProcessing batch ${batchCount}... (${report.statistics.totalRecords} records)`);
      
      snapshot.forEach(doc => {
        report.statistics.totalRecords++;
        const data = doc.data();
        const poleNumber = data.poleNumber || data['Pole Number'] || '';
        
        // Track site statistics
        const site = data.site || 'Unknown';
        siteStats.set(site, (siteStats.get(site) || 0) + 1);
        
        // Track agent statistics
        const agent = data.fieldAgentNamePolePermission || 'Unknown';
        agentStats.set(agent, (agentStats.get(agent) || 0) + 1);
        
        // Track month statistics
        const lastModified = data.lastModifiedDate || data.csvDate || '';
        if (lastModified) {
          const month = lastModified.substring(0, 7); // YYYY-MM
          monthStats.set(month, (monthStats.get(month) || 0) + 1);
        }
        
        if (poleNumber && poleNumber.trim()) {
          report.statistics.recordsWithPoles++;
          const normalizedPole = poleNumber.trim().toUpperCase();
          
          if (!poleMap.has(normalizedPole)) {
            poleMap.set(normalizedPole, []);
            report.statistics.uniquePoles++;
          }
          
          poleMap.get(normalizedPole).push({
            id: doc.id,
            propertyId: data.propertyId,
            site: site,
            agent: agent,
            lastModified: lastModified,
            status: data.statusUpdate || 'Unknown',
            dropNumber: data.dropNumber || '',
            address: data.locationAddress || ''
          });
        }
      });
      
      lastDocId = snapshot.docs[snapshot.docs.length - 1].id;
    }
    
    console.log('\n\n✅ Scan complete!\n');
    
    // Phase 2: Analyze duplicates
    console.log('🔍 Phase 2: Analyzing duplicates...\n');
    
    const duplicatePoles = [];
    let maxDuplicates = 0;
    
    for (const [poleNumber, docs] of poleMap.entries()) {
      if (docs.length > 1) {
        duplicatePoles.push({ poleNumber, documents: docs });
        report.statistics.duplicatePoles++;
        report.statistics.affectedRecords += docs.length;
        maxDuplicates = Math.max(maxDuplicates, docs.length);
        
        // Count by duplicate count
        const count = docs.length;
        report.patterns.byDuplicateCount.set(count, 
          (report.patterns.byDuplicateCount.get(count) || 0) + 1);
        
        // Analyze by site
        docs.forEach(doc => {
          const site = doc.site;
          report.patterns.bySite.set(site,
            (report.patterns.bySite.get(site) || 0) + 1);
        });
      }
    }
    
    report.statistics.maxDuplicatesPerPole = maxDuplicates;
    report.statistics.avgDuplicatesPerPole = report.statistics.duplicatePoles > 0
      ? (report.statistics.affectedRecords / report.statistics.duplicatePoles).toFixed(2)
      : 0;
    
    // Get sample duplicates
    report.samples = duplicatePoles.slice(0, 20).map(({ poleNumber, documents }) => ({
      poleNumber,
      duplicateCount: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        propertyId: doc.propertyId,
        site: doc.site,
        agent: doc.agent,
        status: doc.status,
        lastModified: doc.lastModified
      }))
    }));
    
    // Display results
    console.log('📈 SUMMARY STATISTICS:');
    console.log('-'.repeat(40));
    console.log(`Total records: ${report.statistics.totalRecords.toLocaleString()}`);
    console.log(`Records with poles: ${report.statistics.recordsWithPoles.toLocaleString()}`);
    console.log(`Unique pole numbers: ${report.statistics.uniquePoles.toLocaleString()}`);
    console.log(`\n⚠️  DUPLICATE ISSUES:`);
    console.log(`Poles with duplicates: ${report.statistics.duplicatePoles.toLocaleString()}`);
    console.log(`Total duplicate records: ${report.statistics.affectedRecords.toLocaleString()}`);
    console.log(`Maximum duplicates per pole: ${report.statistics.maxDuplicatesPerPole}`);
    console.log(`Average duplicates per pole: ${report.statistics.avgDuplicatesPerPole}`);
    
    // Pattern Analysis
    console.log('\n\n🔍 DUPLICATE PATTERNS:');
    console.log('-'.repeat(40));
    
    console.log('\nDuplicate frequency:');
    const sortedCounts = Array.from(report.patterns.byDuplicateCount.entries())
      .sort((a, b) => a[0] - b[0]);
    for (const [count, poles] of sortedCounts) {
      const percentage = ((poles / report.statistics.duplicatePoles) * 100).toFixed(1);
      console.log(`  ${count} duplicates: ${poles} poles (${percentage}%)`);
    }
    
    console.log('\nTop 10 sites with duplicates:');
    const sortedSites = Array.from(report.patterns.bySite.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [site, count] of sortedSites) {
      console.log(`  ${site}: ${count} duplicate records`);
    }
    
    // Recommendations
    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(40));
    
    if (report.statistics.duplicatePoles > 0) {
      console.log('1. IMMEDIATE ACTION REQUIRED:');
      console.log(`   - Run cleanup script to merge ${report.statistics.duplicatePoles} duplicate poles`);
      console.log(`   - This will remove ${report.statistics.affectedRecords - report.statistics.duplicatePoles} duplicate records`);
      console.log('   Command: node cleanup-duplicate-poles.js --live');
      
      console.log('\n2. PREVENT FUTURE DUPLICATES:');
      console.log('   - Update import scripts to use bulk-import-with-duplicate-prevention.js');
      console.log('   - This checks for existing poles before creating new records');
      
      console.log('\n3. LONG-TERM IMPROVEMENTS:');
      console.log('   - Consider using pole number as document ID');
      console.log('   - Add unique index on poleNumber field');
      console.log('   - Implement real-time duplicate detection');
      
      if (maxDuplicates > 5) {
        console.log('\n4. CRITICAL: Some poles have ' + maxDuplicates + ' duplicates!');
        console.log('   - Investigate import process for these poles');
        console.log('   - May indicate repeated imports of same data');
      }
    } else {
      console.log('✨ No duplicates found! Database is clean.');
    }
    
    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, '..', 'reports', `duplicate-analysis-${timestamp}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Convert Maps to objects for JSON serialization
    const jsonReport = {
      ...report,
      patterns: {
        bySite: Object.fromEntries(report.patterns.bySite),
        byAgent: Object.fromEntries(report.patterns.byAgent),
        byMonth: Object.fromEntries(report.patterns.byMonth),
        byDuplicateCount: Object.fromEntries(report.patterns.byDuplicateCount)
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`\n\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate CSV for easy viewing
    const csvPath = reportPath.replace('.json', '.csv');
    const csvHeader = 'Pole Number,Duplicate Count,Property IDs,Sites,Agents,Statuses\n';
    const csvRows = duplicatePoles.slice(0, 1000).map(({ poleNumber, documents }) => {
      const propIds = documents.map(d => d.propertyId).join(';');
      const sites = [...new Set(documents.map(d => d.site))].join(';');
      const agents = [...new Set(documents.map(d => d.agent))].join(';');
      const statuses = [...new Set(documents.map(d => d.status))].join(';');
      return `"${poleNumber}",${documents.length},"${propIds}","${sites}","${agents}","${statuses}"`;
    }).join('\n');
    
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`📄 CSV export saved to: ${csvPath}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await admin.app().delete();
  }
}

// Run the report
generateDuplicateReport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});