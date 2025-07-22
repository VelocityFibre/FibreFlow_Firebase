#!/usr/bin/env node

/**
 * Generate detailed import report after 1Map sync
 * Separate from sync-to-production report
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

class ImportReportGenerator {
  async generateReport(importId) {
    console.log('📊 Generating import report...');
    
    // Get import metadata
    const importDoc = await db
      .collection('onemap-processing-imports')
      .doc(importId)
      .get();
    
    if (!importDoc.exists) {
      throw new Error(`Import ${importId} not found`);
    }
    
    const importData = importDoc.data();
    
    // Get staged records stats
    const stagedRecords = await this.analyzeStaged(importId);
    
    // Generate report
    const report = await this.buildReport(importData, stagedRecords);
    
    // Save report
    const filename = await this.saveReport(importId, report);
    
    console.log(`✅ Report saved: ${filename}`);
    return filename;
  }
  
  async analyzeStaged(importId) {
    const stats = {
      total: 0,
      byStatus: {},
      byPole: {},
      byAgent: {},
      missingData: {
        noPole: 0,
        noAgent: 0,
        noGPS: 0
      },
      samples: []
    };
    
    // Query staged records
    const staged = await db
      .collection('onemap-processing-staging')
      .where('_meta.importId', '==', importId)
      .get();
    
    staged.forEach(doc => {
      const data = doc.data();
      stats.total++;
      
      // By status
      const status = data.status || 'No Status';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // By pole
      if (data.poleNumber) {
        stats.byPole[data.poleNumber] = (stats.byPole[data.poleNumber] || 0) + 1;
      } else {
        stats.missingData.noPole++;
      }
      
      // By agent
      const agent = data.fieldAgentPolePermission || 'No Agent';
      if (agent === 'No Agent') {
        stats.missingData.noAgent++;
      } else {
        stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;
      }
      
      // GPS data
      if (!data.gpsLatitude || !data.gpsLongitude) {
        stats.missingData.noGPS++;
      }
      
      // Collect samples
      if (stats.samples.length < 5) {
        stats.samples.push({
          propertyId: data.propertyId,
          poleNumber: data.poleNumber,
          status: data.status,
          address: data.locationAddress
        });
      }
    });
    
    return stats;
  }
  
  async buildReport(importData, stats) {
    const now = new Date().toISOString();
    
    let report = `
# 1MAP IMPORT REPORT
==================

Generated: ${now}
Import ID: ${importData.importId}

## Import Summary
- **File**: ${importData.fileName}
- **Import Date**: ${importData.importDate.toDate().toISOString()}
- **Total Records**: ${importData.recordCount}
- **Status**: ${importData.status}
- **Processing Time**: ${importData.processedAt ? 
    Math.round((importData.processedAt.toDate() - importData.importDate.toDate()) / 1000) + ' seconds' : 
    'In Progress'}

## Processing Results
- **Successfully Staged**: ${stats.total}
- **Failed**: ${importData.stats?.errors || 0}
- **Skipped**: ${importData.stats?.skipped || 0}

## Data Analysis

### By Status
${Object.entries(stats.byStatus)
  .sort((a, b) => b[1] - a[1])
  .map(([status, count]) => `- ${status}: ${count}`)
  .join('\n')}

### Missing Data
- **No Pole Number**: ${stats.missingData.noPole} records
- **No Field Agent**: ${stats.missingData.noAgent} records
- **No GPS Coordinates**: ${stats.missingData.noGPS} records

### Top Poles (by record count)
${Object.entries(stats.byPole)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([pole, count]) => `- ${pole}: ${count} records`)
  .join('\n')}

### Field Agents Activity
${Object.entries(stats.byAgent)
  .filter(([agent]) => agent !== 'No Agent')
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([agent, count]) => `- ${agent}: ${count} permissions`)
  .join('\n')}

## Sample Records
${stats.samples.map((s, i) => `
${i + 1}. Property: ${s.propertyId}
   - Pole: ${s.poleNumber || 'N/A'}
   - Status: ${s.status || 'N/A'}
   - Address: ${s.address || 'N/A'}
`).join('\n')}

## Data Quality Score
${this.calculateQualityScore(stats, importData)}

## Next Steps
1. Review data quality issues above
2. Check for duplicate poles if any
3. Verify field agent assignments
4. When ready, run sync to production

---
*This report covers the import from 1Map to staging database only.*
*A separate report will be generated when syncing to production.*
`;

    return report;
  }
  
  calculateQualityScore(stats, importData) {
    const total = stats.total;
    let score = 100;
    let issues = [];
    
    // Deduct for missing poles
    const missingPolePercent = (stats.missingData.noPole / total) * 100;
    if (missingPolePercent > 10) {
      score -= 20;
      issues.push(`- Missing pole numbers: ${missingPolePercent.toFixed(1)}%`);
    }
    
    // Deduct for missing agents
    const missingAgentPercent = (stats.missingData.noAgent / total) * 100;
    if (missingAgentPercent > 30) {
      score -= 15;
      issues.push(`- Missing field agents: ${missingAgentPercent.toFixed(1)}%`);
    }
    
    // Deduct for missing GPS
    const missingGPSPercent = (stats.missingData.noGPS / total) * 100;
    if (missingGPSPercent > 20) {
      score -= 10;
      issues.push(`- Missing GPS coordinates: ${missingGPSPercent.toFixed(1)}%`);
    }
    
    let quality = score >= 90 ? '🟢 Excellent' :
                  score >= 70 ? '🟡 Good' :
                  score >= 50 ? '🟠 Fair' :
                  '🔴 Poor';
    
    return `
**Quality Score: ${score}/100 ${quality}**

${issues.length > 0 ? 'Issues found:\n' + issues.join('\n') : 'No major issues found.'}
`;
  }
  
  async saveReport(importId, report) {
    const filename = `import_report_${importId}.md`;
    const filepath = path.join('OneMap/reports', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, report);
    
    return filepath;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Get latest import
    const imports = await db
      .collection('onemap-processing-imports')
      .orderBy('importDate', 'desc')
      .limit(1)
      .get();
    
    if (imports.empty) {
      console.error('No imports found');
      process.exit(1);
    }
    
    const importId = imports.docs[0].id;
    console.log(`Generating report for latest import: ${importId}`);
    
    const generator = new ImportReportGenerator();
    await generator.generateReport(importId);
  } else {
    // Use provided import ID
    const importId = args[0];
    const generator = new ImportReportGenerator();
    await generator.generateReport(importId);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}