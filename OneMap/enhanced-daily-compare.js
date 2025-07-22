#!/usr/bin/env node

/**
 * Enhanced Daily CSV Comparison with Graph Analysis
 * 
 * Combines your fast CSV processing with graph-based relationship analysis
 * to catch issues that simple field comparison might miss.
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

// Import your existing functions (assuming they're modular)
// const { compareCSVs } = require('./compare-split-csvs');
// const { splitByPole } = require('./split-csv-by-pole');

async function parseCSV(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const cleanContent = content.replace(/^\uFEFF/, '');
  
  return csv.parse(cleanContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true
  });
}

function extractEntities(record) {
  const entities = {
    pole: record['Pole Number'] || null,
    drop: record['Drop Number'] || null,
    address: record['Location Address'] || null,
    property: record['Property ID'] || null,
    agent: record['Field Agent Name'] || 'Unknown',
    status: record['Status'] || 'Unknown'
  };
  
  return entities;
}

function findNewRecords(day1Records, day2Records) {
  const day1PropertyIds = new Set(day1Records.map(r => r['Property ID']));
  
  return day2Records.filter(record => 
    !day1PropertyIds.has(record['Property ID'])
  );
}

function analyzeRelationships(records) {
  const relationships = {
    poleToAddresses: new Map(),
    addressToProperties: new Map(),
    agentToPoles: new Map()
  };
  
  for (const record of records) {
    const entities = extractEntities(record);
    
    // Track pole -> address relationships
    if (entities.pole && entities.address) {
      if (!relationships.poleToAddresses.has(entities.pole)) {
        relationships.poleToAddresses.set(entities.pole, new Set());
      }
      relationships.poleToAddresses.get(entities.pole).add(entities.address);
    }
    
    // Track address -> properties
    if (entities.address && entities.property) {
      if (!relationships.addressToProperties.has(entities.address)) {
        relationships.addressToProperties.set(entities.address, new Set());
      }
      relationships.addressToProperties.get(entities.address).add(entities.property);
    }
    
    // Track agent -> poles
    if (entities.agent !== 'Unknown' && entities.pole) {
      if (!relationships.agentToPoles.has(entities.agent)) {
        relationships.agentToPoles.set(entities.agent, new Set());
      }
      relationships.agentToPoles.get(entities.agent).add(entities.pole);
    }
  }
  
  return relationships;
}

function findRelationshipConflicts(relationships) {
  const conflicts = [];
  
  // Find poles at multiple addresses (major issue)
  for (const [pole, addresses] of relationships.poleToAddresses) {
    if (addresses.size > 1) {
      conflicts.push({
        type: 'pole_multiple_addresses',
        pole: pole,
        addresses: Array.from(addresses),
        severity: 'HIGH'
      });
    }
  }
  
  // Find agents claiming same pole (payment issue)
  const poleToAgents = new Map();
  for (const [agent, poles] of relationships.agentToPoles) {
    for (const pole of poles) {
      if (!poleToAgents.has(pole)) {
        poleToAgents.set(pole, new Set());
      }
      poleToAgents.get(pole).add(agent);
    }
  }
  
  for (const [pole, agents] of poleToAgents) {
    if (agents.size > 1) {
      conflicts.push({
        type: 'multiple_agents_same_pole',
        pole: pole,
        agents: Array.from(agents),
        severity: 'MEDIUM'
      });
    }
  }
  
  return conflicts;
}

async function enhancedDailyCompare(day1Path, day2Path) {
  console.log('🔍 Enhanced Daily Comparison Starting...\n');
  
  // Step 1: Load and parse CSVs
  console.log('📊 Loading CSV files...');
  const day1Records = await parseCSV(day1Path);
  const day2Records = await parseCSV(day2Path);
  
  console.log(`Day 1: ${day1Records.length} records`);
  console.log(`Day 2: ${day2Records.length} records\n`);
  
  // Step 2: Fast CSV comparison (your existing approach)
  console.log('⚡ Fast CSV comparison...');
  const newRecords = findNewRecords(day1Records, day2Records);
  console.log(`Found ${newRecords.length} new records\n`);
  
  // Step 3: Relationship analysis (graph-enhanced)
  console.log('🕸️  Analyzing relationships...');
  const day1Relationships = analyzeRelationships(day1Records);
  const day2Relationships = analyzeRelationships(day2Records);
  
  // Step 4: Find conflicts in new data
  console.log('⚠️  Checking for conflicts...');
  const newRecordRelationships = analyzeRelationships(newRecords);
  const conflicts = findRelationshipConflicts(newRecordRelationships);
  
  // Step 5: Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      day1Records: day1Records.length,
      day2Records: day2Records.length,
      newRecords: newRecords.length,
      conflicts: conflicts.length
    },
    newRecords: newRecords.slice(0, 5), // Sample of new records
    conflicts: conflicts,
    relationshipStats: {
      day1: {
        uniquePoles: day1Relationships.poleToAddresses.size,
        uniqueAddresses: day1Relationships.addressToProperties.size,
        uniqueAgents: day1Relationships.agentToPoles.size
      },
      day2: {
        uniquePoles: day2Relationships.poleToAddresses.size,
        uniqueAddresses: day2Relationships.addressToProperties.size,
        uniqueAgents: day2Relationships.agentToPoles.size
      }
    }
  };
  
  // Step 6: Save report
  const reportPath = `reports/enhanced_daily_report_${Date.now()}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Step 7: Console summary
  console.log('📈 Summary:');
  console.log(`✅ New records: ${newRecords.length}`);
  console.log(`⚠️  Conflicts found: ${conflicts.length}`);
  
  if (conflicts.length > 0) {
    console.log('\n🚨 Issues requiring attention:');
    for (const conflict of conflicts) {
      console.log(`- ${conflict.severity}: ${conflict.type} - ${JSON.stringify(conflict).slice(0, 100)}...`);
    }
  }
  
  console.log(`\n📄 Full report saved: ${reportPath}`);
  
  return report;
}

// CLI usage
if (require.main === module) {
  const [,, day1Path, day2Path] = process.argv;
  
  if (!day1Path || !day2Path) {
    console.error('Usage: node enhanced-daily-compare.js <day1.csv> <day2.csv>');
    process.exit(1);
  }
  
  enhancedDailyCompare(day1Path, day2Path)
    .then(() => console.log('\n✅ Enhanced comparison complete!'))
    .catch(console.error);
}

module.exports = { enhancedDailyCompare };