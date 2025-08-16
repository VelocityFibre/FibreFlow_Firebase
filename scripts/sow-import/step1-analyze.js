#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function analyze(projectId, polesFile, dropsFile, fibreFile) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: ANALYZE - What\'s in Neon vs What\'s in Excel?');
  console.log('='.repeat(80) + '\n');

  // 1. WHAT'S IN NEON NOW?
  console.log('📊 CURRENT NEON DATABASE STATE:');
  console.log('-'.repeat(40));
  
  try {
    // Get all projects with SOW data
    const projects = await sql`
      SELECT DISTINCT project_id FROM (
        SELECT project_id FROM sow_poles
        UNION
        SELECT project_id FROM sow_drops
        UNION
        SELECT project_id FROM sow_fibre
      ) combined
    `;
    
    console.log('\nProjects with SOW data:');
    for (const proj of projects) {
      const poles = await sql`SELECT COUNT(*) as count FROM sow_poles WHERE project_id = ${proj.project_id}`;
      const drops = await sql`SELECT COUNT(*) as count FROM sow_drops WHERE project_id = ${proj.project_id}`;
      const fibre = await sql`SELECT COUNT(*) as count FROM sow_fibre WHERE project_id = ${proj.project_id}`;
      
      console.log(`\nProject: ${proj.project_id}`);
      console.log(`  - Poles: ${poles[0].count}`);
      console.log(`  - Drops: ${drops[0].count}`);
      console.log(`  - Fibre: ${fibre[0].count}`);
      
      // Show sample data
      if (proj.project_id === projectId) {
        const samplePoles = await sql`
          SELECT pole_number, status 
          FROM sow_poles 
          WHERE project_id = ${projectId} 
          ORDER BY pole_number 
          LIMIT 5
        `;
        console.log(`  - Sample poles: ${samplePoles.map(p => p.pole_number).join(', ')}`);
      }
    }
    
    // Specific project analysis
    console.log(`\n\nTarget Project Analysis: ${projectId}`);
    const targetPoles = await sql`SELECT COUNT(*) as count FROM sow_poles WHERE project_id = ${projectId}`;
    const targetDrops = await sql`SELECT COUNT(*) as count FROM sow_drops WHERE project_id = ${projectId}`;
    const targetFibre = await sql`SELECT COUNT(*) as count FROM sow_fibre WHERE project_id = ${projectId}`;
    
    if (targetPoles[0].count > 0) {
      console.log(`⚠️  This project already has ${targetPoles[0].count} poles in database!`);
      console.log(`   Drops: ${targetDrops[0].count}, Fibre: ${targetFibre[0].count}`);
    } else {
      console.log('✅ No existing SOW data for this project');
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  }

  // 2. WHAT'S IN THE EXCEL FILES?
  console.log('\n\n📁 EXCEL FILES ANALYSIS:');
  console.log('-'.repeat(40));
  
  // Analyze Poles
  console.log('\n1. POLES FILE:', path.basename(polesFile));
  let excelPoleNumbers = new Set();
  try {
    const wb = XLSX.readFile(polesFile);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    data.forEach(row => {
      const pole = row.label_1 || row.pole_number || row.label || '';
      if (pole) excelPoleNumbers.add(pole);
    });
    
    console.log(`   Total rows: ${data.length}`);
    console.log(`   Unique poles: ${excelPoleNumbers.size}`);
    console.log(`   Sample poles: ${Array.from(excelPoleNumbers).slice(0, 5).join(', ')}`);
    
    // Show column mapping
    console.log(`   Column mapping detected:`);
    console.log(`     - Pole Number: ${data[0].label_1 ? 'label_1' : data[0].pole_number ? 'pole_number' : 'label'}`);
    console.log(`     - Status: ${data[0].status ? 'status' : 'NOT FOUND'}`);
    console.log(`     - PON: ${data[0].pon_no ? 'pon_no' : data[0].pon ? 'pon' : 'NOT FOUND'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Analyze Drops
  console.log('\n2. DROPS FILE:', path.basename(dropsFile));
  let excelDropNumbers = new Set();
  let excelPoleRefs = new Set();
  try {
    const wb = XLSX.readFile(dropsFile);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    data.forEach(row => {
      const drop = row.label || row.drop_number || '';
      const pole = row.strtfeat || row.endfeat || '';
      if (drop) excelDropNumbers.add(drop);
      if (pole) excelPoleRefs.add(pole);
    });
    
    console.log(`   Total rows: ${data.length}`);
    console.log(`   Unique drops: ${excelDropNumbers.size}`);
    console.log(`   Poles referenced: ${excelPoleRefs.size}`);
    console.log(`   Sample drops: ${Array.from(excelDropNumbers).slice(0, 5).join(', ')}`);
    
    // Show column mapping
    console.log(`   Column mapping detected:`);
    console.log(`     - Drop Number: ${data[0].label ? 'label' : data[0].drop_number ? 'drop_number' : 'NOT FOUND'}`);
    console.log(`     - Pole Reference: ${data[0].strtfeat ? 'strtfeat' : data[0].endfeat ? 'endfeat' : 'NOT FOUND'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // 3. COMPARISON & RECOMMENDATIONS
  console.log('\n\n🔍 COMPARISON ANALYSIS:');
  console.log('-'.repeat(40));
  
  // Check for duplicates
  if (excelPoleNumbers.size > 0) {
    const existingPoles = await sql`
      SELECT pole_number 
      FROM sow_poles 
      WHERE project_id = ${projectId}
      AND pole_number = ANY(${Array.from(excelPoleNumbers)})
    `;
    
    if (existingPoles.length > 0) {
      console.log(`\n⚠️  DUPLICATES FOUND:`);
      console.log(`   ${existingPoles.length} poles from Excel already exist in database`);
      console.log(`   Sample duplicates: ${existingPoles.slice(0, 5).map(p => p.pole_number).join(', ')}`);
    } else {
      console.log('\n✅ No duplicate poles found');
    }
  }
  
  // Check pole references
  const missingPoles = Array.from(excelPoleRefs).filter(p => !excelPoleNumbers.has(p));
  if (missingPoles.length > 0) {
    console.log(`\n⚠️  MISSING POLE REFERENCES:`);
    console.log(`   ${missingPoles.length} poles referenced by drops but not in poles file`);
    console.log(`   Sample missing: ${missingPoles.slice(0, 5).join(', ')}`);
  }

  // 4. RECOMMENDATIONS
  console.log('\n\n💡 RECOMMENDATIONS:');
  console.log('-'.repeat(40));
  
  const targetPolesCount = (await sql`SELECT COUNT(*) as count FROM sow_poles WHERE project_id = ${projectId}`)[0].count;
  
  if (targetPolesCount > 0) {
    console.log('\n1. Project already has data. Options:');
    console.log('   a) Clear existing data and import fresh (--clear flag)');
    console.log('   b) Skip existing poles and only import new ones');
    console.log('   c) Update existing poles with new data');
    console.log('\n   Recommended: Use --clear for clean import');
  } else {
    console.log('\n1. Project has no existing SOW data - safe to import');
  }
  
  console.log('\n2. Import order:');
  console.log('   a) Import poles first (foundation data)');
  console.log('   b) Import drops (links to poles)');
  console.log('   c) Import fibre (optional)');
  
  console.log('\n3. Data quality:');
  if (missingPoles.length > 0) {
    console.log(`   ⚠️  ${missingPoles.length} drops reference non-existent poles`);
    console.log('   Consider reviewing the pole references in drops file');
  } else {
    console.log('   ✅ All drop pole references exist in poles file');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Next step: Run import with appropriate options based on analysis above');
  console.log('Example: node simple-sow-import.js ' + projectId + ' poles.xlsx drops.xlsx --clear');
  console.log('='.repeat(80) + '\n');
}

// Main execution
if (process.argv.length < 5) {
  console.log('Usage: node step1-analyze.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx]');
  console.log('\nExample:');
  console.log('  node step1-analyze.js oAigmUjSbjWHmH80AMxc "Lawley Poles.xlsx" "Lawley Drops.xlsx"');
  process.exit(1);
}

const [,, projectId, polesFile, dropsFile, fibreFile] = process.argv;
analyze(projectId, polesFile, dropsFile, fibreFile).catch(console.error);