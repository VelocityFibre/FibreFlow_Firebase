#!/usr/bin/env node

/**
 * Analyze changes between June 3rd and June 5th data
 * Shows what changed in terms of new records and status progressions
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Key workflow milestones to track
const KEY_MILESTONES = [
  'Pole Permission: Approved',
  'Pole Permission: Planted',
  'Home Sign Ups: Approved & Installation Scheduled',
  'Home Sign Ups: Installed'
];

async function analyzeChanges() {
  console.log('🔍 Analyzing Changes from June 3rd to June 5th\n');
  
  // Parse both CSV files
  console.log('📖 Reading CSV files...');
  const june3Content = await fs.readFile('downloads/Lawley Raw Stats/Lawley June Week 1 03062025.csv', 'utf-8');
  const june5Content = await fs.readFile('downloads/Lawley Raw Stats/Lawley June  Week 1 05062025.csv', 'utf-8');
  
  const june3Records = csv.parse(june3Content.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  const june5Records = csv.parse(june5Content.replace(/^\uFEFF/, ''), {
    columns: true,
    delimiter: ';'
  });
  
  console.log(`📊 June 3: ${june3Records.length} records`);
  console.log(`📊 June 5: ${june5Records.length} records\n`);
  
  // Create maps for comparison
  const june3Map = new Map();
  const june5Map = new Map();
  
  // Process June 3 data
  june3Records.forEach(record => {
    june3Map.set(record['Property ID'], record);
  });
  
  // Process June 5 data
  june5Records.forEach(record => {
    june5Map.set(record['Property ID'], record);
  });
  
  // Find differences
  const newProperties = [];
  const changedProperties = [];
  const missingProperties = [];
  
  // Check what's new or changed in June 5
  june5Map.forEach((record, propertyId) => {
    if (!june3Map.has(propertyId)) {
      newProperties.push(record);
    } else {
      const june3Record = june3Map.get(propertyId);
      // Check if key fields changed
      if (june3Record['Status'] !== record['Status'] ||
          june3Record['Flow Name Groups'] !== record['Flow Name Groups']) {
        changedProperties.push({
          propertyId,
          june3: june3Record,
          june5: record,
          statusChange: `${june3Record['Status']} → ${record['Status']}`
        });
      }
    }
  });
  
  // Check what's missing in June 5
  june3Map.forEach((record, propertyId) => {
    if (!june5Map.has(propertyId)) {
      missingProperties.push(record);
    }
  });
  
  // Analyze milestone progressions
  const milestoneProgress = {};
  KEY_MILESTONES.forEach(milestone => {
    milestoneProgress[milestone] = {
      june3Count: 0,
      june5Count: 0,
      newCount: 0
    };
  });
  
  // Count milestones
  june3Records.forEach(record => {
    const flowGroups = record['Flow Name Groups'] || '';
    KEY_MILESTONES.forEach(milestone => {
      if (flowGroups.includes(milestone)) {
        milestoneProgress[milestone].june3Count++;
      }
    });
  });
  
  june5Records.forEach(record => {
    const flowGroups = record['Flow Name Groups'] || '';
    KEY_MILESTONES.forEach(milestone => {
      if (flowGroups.includes(milestone)) {
        milestoneProgress[milestone].june5Count++;
      }
    });
  });
  
  // Calculate new milestone achievements
  KEY_MILESTONES.forEach(milestone => {
    milestoneProgress[milestone].newCount = 
      milestoneProgress[milestone].june5Count - milestoneProgress[milestone].june3Count;
  });
  
  // Generate comprehensive report
  const report = `
# OneMap Change Analysis: June 3rd to June 5th

## Overview
- June 3rd records: ${june3Records.length}
- June 5th records: ${june5Records.length}
- Net change: ${june5Records.length - june3Records.length}

## Property Changes
- 🆕 New properties: ${newProperties.length}
- 📝 Changed properties: ${changedProperties.length}
- ❌ Missing properties: ${missingProperties.length}

## Milestone Progress (First Instance Tracking)
${Object.entries(milestoneProgress).map(([milestone, stats]) => `
### ${milestone}
- June 3rd total: ${stats.june3Count}
- June 5th total: ${stats.june5Count}
- New achievements: ${stats.newCount} ${stats.newCount > 0 ? '📈' : ''}`).join('\n')}

## Sample New Properties (First 10)
${newProperties.slice(0, 10).map(p => 
  `- ${p['Property ID']}: ${p['Location Address']} (${p['Status']})`
).join('\n')}

## Sample Status Changes (First 10)
${changedProperties.slice(0, 10).map(c => 
  `- ${c.propertyId}: ${c.statusChange}`
).join('\n')}

## Key Insights
1. Overall ${june5Records.length > june3Records.length ? 'growth' : 'reduction'} of ${Math.abs(june5Records.length - june3Records.length)} records
2. ${newProperties.length} completely new properties added
3. ${changedProperties.length} properties progressed in workflow
4. ${missingProperties.length} properties no longer in dataset

## Data Quality Notes
- Missing properties might indicate data cleanup or removals
- New properties show expansion of coverage area
- Status changes indicate workflow progression

Generated: ${new Date().toISOString()}
`;
  
  console.log(report);
  
  // Save detailed reports
  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile('reports/june3_to_june5_analysis.md', report);
  
  // Save detailed CSV of changes
  if (changedProperties.length > 0) {
    const changesCSV = [
      'Property ID,June 3 Status,June 5 Status,Pole Number,Location Address',
      ...changedProperties.map(c => 
        `${c.propertyId},"${c.june3.Status}","${c.june5.Status}","${c.june5['Pole Number']}","${c.june5['Location Address']}"`
      )
    ].join('\n');
    
    await fs.writeFile('reports/june3_to_june5_changes.csv', changesCSV);
    console.log('\n📄 Detailed changes saved to: reports/june3_to_june5_changes.csv');
  }
  
  console.log('📄 Analysis report saved to: reports/june3_to_june5_analysis.md');
  
  return {
    newCount: newProperties.length,
    changedCount: changedProperties.length,
    missingCount: missingProperties.length
  };
}

analyzeChanges().catch(console.error);