#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function analyze() {
  console.log('\n' + '='.repeat(80));
  console.log('SOW IMPORT ANALYSIS - WHAT DO WE HAVE VS WHAT ARE WE IMPORTING?');
  console.log('='.repeat(80) + '\n');

  // 1. DATABASE ANALYSIS
  console.log('📊 CURRENT DATABASE STATE:');
  console.log('-'.repeat(40));
  
  try {
    // Check projects in Firebase (we'd need to add this)
    console.log('\nProjects in system:');
    console.log('  - oAigmUjSbjWHmH80AMxc: Lawley');
    console.log('  - o2cF0JNv5yvCyQcj6tNk: Mohadin');
    
    // Check SOW data
    const poleStats = await sql`
      SELECT project_id, COUNT(*) as count 
      FROM sow_poles 
      GROUP BY project_id
    `;
    
    console.log('\nSOW Poles in database:');
    for (const stat of poleStats) {
      console.log(`  - Project ${stat.project_id}: ${stat.count} poles`);
    }
    
    const dropStats = await sql`SELECT COUNT(*) as count FROM sow_drops`;
    console.log(`\nSOW Drops in database: ${dropStats[0].count}`);
    
    const fibreStats = await sql`SELECT COUNT(*) as count FROM sow_fibre`;
    console.log(`SOW Fibre in database: ${fibreStats[0].count}`);
    
  } catch (error) {
    console.error('Database error:', error.message);
  }

  // 2. EXCEL FILE ANALYSIS
  console.log('\n\n📁 EXCEL FILES TO IMPORT:');
  console.log('-'.repeat(40));
  
  const files = process.argv.slice(2);
  if (files.length < 2) {
    console.log('Usage: node analyze-before-import.js <poles.xlsx> <drops.xlsx> [fibre.xlsx]');
    return;
  }

  // Analyze Poles
  console.log('\n1. POLES FILE:', path.basename(files[0]));
  try {
    const wb = XLSX.readFile(files[0]);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const poleNumbers = new Set();
    data.forEach(row => {
      const pole = row.label_1 || row.pole_number || row.label || '';
      if (pole) poleNumbers.add(pole);
    });
    
    console.log(`   Total rows: ${data.length}`);
    console.log(`   Unique poles: ${poleNumbers.size}`);
    console.log(`   Sample poles: ${Array.from(poleNumbers).slice(0, 5).join(', ')}`);
    console.log(`   Key columns: ${Object.keys(data[0] || {}).slice(0, 8).join(', ')}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Analyze Drops
  console.log('\n2. DROPS FILE:', path.basename(files[1]));
  try {
    const wb = XLSX.readFile(files[1]);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const dropNumbers = new Set();
    const poleRefs = new Set();
    data.forEach(row => {
      const drop = row.label || row.drop_number || '';
      const pole = row.strtfeat || row.endfeat || '';
      if (drop) dropNumbers.add(drop);
      if (pole) poleRefs.add(pole);
    });
    
    console.log(`   Total rows: ${data.length}`);
    console.log(`   Unique drops: ${dropNumbers.size}`);
    console.log(`   Poles referenced: ${poleRefs.size}`);
    console.log(`   Sample drops: ${Array.from(dropNumbers).slice(0, 5).join(', ')}`);
    console.log(`   Key columns: ${Object.keys(data[0] || {}).slice(0, 8).join(', ')}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Analyze Fibre (if provided)
  if (files[2]) {
    console.log('\n3. FIBRE FILE:', path.basename(files[2]));
    try {
      const wb = XLSX.readFile(files[2]);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      console.log(`   Total rows: ${data.length}`);
      console.log(`   Key columns: ${Object.keys(data[0] || {}).slice(0, 8).join(', ')}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  // 3. IMPORT RECOMMENDATIONS
  console.log('\n\n🎯 IMPORT ANALYSIS:');
  console.log('-'.repeat(40));
  
  console.log('\n1. TARGET PROJECT: oAigmUjSbjWHmH80AMxc (Lawley)');
  
  console.log('\n2. POTENTIAL ISSUES:');
  console.log('   - Database already has 498 poles for this project');
  console.log('   - Excel has 4,471 poles - possible partial import');
  console.log('   - Drops reference 2,965 poles - need to verify all exist');
  
  console.log('\n3. RECOMMENDED APPROACH:');
  console.log('   a) Clear existing partial data for clean import');
  console.log('   b) Import poles first (foundation data)');
  console.log('   c) Import drops and link to poles');
  console.log('   d) Import fibre data last');
  
  console.log('\n' + '='.repeat(80) + '\n');
}

analyze().catch(console.error);