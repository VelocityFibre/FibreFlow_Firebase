#!/usr/bin/env node

/**
 * Verify Pole Drops Data Integrity
 * 
 * This script analyzes the July 21, 2025 CSV data to verify:
 * 1. Actual number of unique poles
 * 2. Drops per pole distribution
 * 3. Capacity violations (>12 drops)
 * 4. Duplicate drop assignments across poles
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const SOURCE_FILE = path.join(__dirname, 'split_data/2025-07-21/Lawley July Week 4 21072025_pole_records.csv');

// Data structures for analysis
const poleDrops = new Map(); // pole -> Set of drop numbers
const dropPoles = new Map(); // drop -> Set of poles
const poleCounts = new Map(); // pole -> record count
let totalRecords = 0;
let recordsWithPoleAndDrop = 0;

// Column indices (0-based)
const COLS = {
  POLE_NUMBER: 16,
  DROP_NUMBER: 17,
  STATUS: 3
};

console.log('📊 Analyzing pole drops data integrity...\n');

// Check if file exists
if (!fs.existsSync(SOURCE_FILE)) {
  console.error('❌ Source file not found:', SOURCE_FILE);
  process.exit(1);
}

// Read and process CSV
const readStream = fs.createReadStream(SOURCE_FILE);
let isFirstLine = true;

readStream
  .on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Skip header
      if (isFirstLine) {
        isFirstLine = false;
        return;
      }
      
      totalRecords++;
      
      // Parse CSV line (semicolon-delimited)
      const fields = line.split(';');
      const poleNumber = fields[COLS.POLE_NUMBER]?.trim();
      const dropNumber = fields[COLS.DROP_NUMBER]?.trim();
      
      // Only process records with both pole and drop
      if (poleNumber && dropNumber && 
          poleNumber !== '' && dropNumber !== '' &&
          !dropNumber.toLowerCase().includes('no drop')) {
        
        recordsWithPoleAndDrop++;
        
        // Track pole->drops mapping
        if (!poleDrops.has(poleNumber)) {
          poleDrops.set(poleNumber, new Set());
        }
        poleDrops.get(poleNumber).add(dropNumber);
        
        // Track drop->poles mapping
        if (!dropPoles.has(dropNumber)) {
          dropPoles.set(dropNumber, new Set());
        }
        dropPoles.get(dropNumber).add(poleNumber);
        
        // Track pole counts
        poleCounts.set(poleNumber, (poleCounts.get(poleNumber) || 0) + 1);
      }
    });
  })
  .on('end', () => {
    console.log('✅ Analysis complete!\n');
    generateReport();
  })
  .on('error', (err) => {
    console.error('❌ Error reading file:', err);
    process.exit(1);
  });

function generateReport() {
  console.log('=== POLE DROPS INTEGRITY REPORT ===\n');
  
  // Basic statistics
  console.log('📈 OVERALL STATISTICS:');
  console.log(`Total records in file: ${totalRecords.toLocaleString()}`);
  console.log(`Records with pole AND drop: ${recordsWithPoleAndDrop.toLocaleString()}`);
  console.log(`Unique poles with drops: ${poleDrops.size.toLocaleString()}`);
  console.log(`Total unique drops: ${dropPoles.size.toLocaleString()}`);
  
  // Calculate average drops per pole
  let totalDrops = 0;
  poleDrops.forEach(drops => totalDrops += drops.size);
  const avgDropsPerPole = (totalDrops / poleDrops.size).toFixed(2);
  console.log(`Average drops per pole: ${avgDropsPerPole}`);
  
  // Drops per pole distribution
  const distribution = new Map();
  let maxDropsPerPole = 0;
  let poleWithMaxDrops = '';
  
  poleDrops.forEach((drops, pole) => {
    const count = drops.size;
    distribution.set(count, (distribution.get(count) || 0) + 1);
    
    if (count > maxDropsPerPole) {
      maxDropsPerPole = count;
      poleWithMaxDrops = pole;
    }
  });
  
  console.log(`\n📊 DROPS PER POLE DISTRIBUTION:`);
  const sortedDist = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);
  sortedDist.forEach(([drops, count]) => {
    const percentage = ((count / poleDrops.size) * 100).toFixed(1);
    console.log(`${drops} drops: ${count} poles (${percentage}%)`);
  });
  
  console.log(`\n🔝 MAXIMUM DROPS:`);
  console.log(`Highest: ${poleWithMaxDrops} with ${maxDropsPerPole} drops`);
  
  // Check capacity violations (>12 drops)
  console.log(`\n⚠️  CAPACITY ANALYSIS (12-drop limit):`);
  const overCapacity = [];
  const atCapacity = [];
  const nearCapacity = [];
  
  poleDrops.forEach((drops, pole) => {
    const count = drops.size;
    if (count > 12) overCapacity.push({ pole, count });
    else if (count === 12) atCapacity.push({ pole, count });
    else if (count >= 10) nearCapacity.push({ pole, count });
  });
  
  console.log(`Over capacity (>12): ${overCapacity.length} poles`);
  if (overCapacity.length > 0) {
    overCapacity.forEach(({ pole, count }) => {
      console.log(`  - ${pole}: ${count} drops (${count - 12} over limit)`);
    });
  }
  
  console.log(`At capacity (12): ${atCapacity.length} poles`);
  console.log(`Near capacity (10-11): ${nearCapacity.length} poles`);
  
  // Check LAW.P.A788 specifically
  console.log(`\n🔍 LAW.P.A788 VERIFICATION:`);
  if (poleDrops.has('LAW.P.A788')) {
    const drops = Array.from(poleDrops.get('LAW.P.A788'));
    console.log(`Actual drops: ${drops.length}`);
    console.log(`Drop numbers: ${drops.join(', ')}`);
  } else {
    console.log('Pole LAW.P.A788 not found in data');
  }
  
  // Duplicate drop analysis
  console.log(`\n🔄 DUPLICATE DROP ASSIGNMENTS:`);
  const duplicateDrops = [];
  dropPoles.forEach((poles, drop) => {
    if (poles.size > 1) {
      duplicateDrops.push({ drop, poles: Array.from(poles) });
    }
  });
  
  console.log(`Total drops assigned to multiple poles: ${duplicateDrops.length}`);
  
  if (duplicateDrops.length > 0) {
    console.log(`\nTop 10 duplicate drop examples:`);
    duplicateDrops.slice(0, 10).forEach(({ drop, poles }) => {
      console.log(`  - ${drop} appears on ${poles.length} poles: ${poles.join(', ')}`);
    });
  }
  
  // Summary comparison with report claims
  console.log(`\n📋 COMPARISON WITH REPORT CLAIMS:`);
  console.log('┌─────────────────────────┬──────────────┬──────────────┬─────────────┐');
  console.log('│ Metric                  │ Report Claim │ Actual Data  │ Discrepancy │');
  console.log('├─────────────────────────┼──────────────┼──────────────┼─────────────┤');
  console.log(`│ Unique poles            │ 3,771        │ ${poleDrops.size.toLocaleString().padEnd(12)} │ ${(3771 - poleDrops.size).toLocaleString().padEnd(11)} │`);
  console.log(`│ Avg drops/pole          │ 2.74         │ ${avgDropsPerPole.padEnd(12)} │ ${(2.74 - parseFloat(avgDropsPerPole)).toFixed(2).padEnd(11)} │`);
  console.log(`│ LAW.P.A788 drops        │ 16           │ ${(poleDrops.get('LAW.P.A788')?.size || 0).toString().padEnd(12)} │ ${(16 - (poleDrops.get('LAW.P.A788')?.size || 0)).toString().padEnd(11)} │`);
  console.log(`│ Max drops per pole      │ 16           │ ${maxDropsPerPole.toString().padEnd(12)} │ ${(16 - maxDropsPerPole).toString().padEnd(11)} │`);
  console.log(`│ Poles over capacity     │ 6            │ ${overCapacity.length.toString().padEnd(12)} │ ${(6 - overCapacity.length).toString().padEnd(11)} │`);
  console.log('└─────────────────────────┴──────────────┴──────────────┴─────────────┘');
  
  // Export detailed findings
  const findings = {
    summary: {
      totalRecords,
      recordsWithPoleAndDrop,
      uniquePoles: poleDrops.size,
      uniqueDrops: dropPoles.size,
      avgDropsPerPole: parseFloat(avgDropsPerPole),
      maxDropsPerPole,
      poleWithMaxDrops
    },
    capacityAnalysis: {
      overCapacity: overCapacity.length,
      atCapacity: atCapacity.length,
      nearCapacity: nearCapacity.length,
      violations: overCapacity
    },
    duplicateDrops: {
      total: duplicateDrops.length,
      examples: duplicateDrops.slice(0, 20)
    },
    law_p_a788: {
      dropCount: poleDrops.get('LAW.P.A788')?.size || 0,
      drops: Array.from(poleDrops.get('LAW.P.A788') || [])
    },
    reportDiscrepancies: {
      poles: { claimed: 3771, actual: poleDrops.size },
      avgDrops: { claimed: 2.74, actual: parseFloat(avgDropsPerPole) },
      law_p_a788: { claimed: 16, actual: poleDrops.get('LAW.P.A788')?.size || 0 },
      maxDrops: { claimed: 16, actual: maxDropsPerPole },
      overCapacity: { claimed: 6, actual: overCapacity.length }
    }
  };
  
  // Save findings
  const outputFile = path.join(__dirname, 'reports', 'pole_drops_integrity_verification.json');
  fs.writeFileSync(outputFile, JSON.stringify(findings, null, 2));
  console.log(`\n💾 Detailed findings saved to: ${outputFile}`);
}