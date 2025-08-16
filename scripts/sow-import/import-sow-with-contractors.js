#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

// Simple progress tracking
let processed = 0;
let total = 0;

function showProgress(message) {
  process.stdout.write(`\r${message} ${processed}/${total} (${Math.round(processed/total*100)}%)`);
}

async function setupTables() {
  console.log('📋 Setting up tables with contractor fields...');
  
  try {
    // Add designer field to poles and drops (for cmpownr)
    await sql`ALTER TABLE sow_poles ADD COLUMN IF NOT EXISTS designer VARCHAR(255)`;
    await sql`ALTER TABLE sow_drops ADD COLUMN IF NOT EXISTS designer VARCHAR(255)`;
    
    // Ensure contractor field exists in fibre
    await sql`ALTER TABLE sow_fibre ADD COLUMN IF NOT EXISTS contractor VARCHAR(255)`;
    
    console.log('✓ Tables ready\n');
  } catch (error) {
    console.error('Error setting up tables:', error.message);
    // Continue anyway - columns might already exist
  }
}

async function importSOW(projectId, polesFile, dropsFile, fibreFile) {
  console.log('\n🚀 SOW IMPORT WITH CONTRACTOR INFO');
  console.log('=' .repeat(60));
  console.log(`Project: ${projectId}`);
  console.log(`Poles: ${path.basename(polesFile)}`);
  console.log(`Drops: ${path.basename(dropsFile)}`);
  console.log(`Fibre: ${fibreFile ? path.basename(fibreFile) : 'None'}`);
  console.log('=' .repeat(60) + '\n');

  try {
    // Setup tables
    await setupTables();
    
    // Clear existing data if requested
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('🗑️  Clearing existing data for project...');
      await sql`DELETE FROM sow_fibre WHERE project_id = ${projectId}`;
      await sql`DELETE FROM sow_drops WHERE project_id = ${projectId}`;
      await sql`DELETE FROM sow_poles WHERE project_id = ${projectId}`;
      console.log('✓ Cleared\n');
    }

    // 1. IMPORT POLES
    console.log('📍 Importing Poles with designer info...');
    const polesWB = XLSX.readFile(polesFile);
    const polesSheet = polesWB.Sheets[polesWB.SheetNames[0]];
    const polesData = XLSX.utils.sheet_to_json(polesSheet);
    
    total = polesData.length;
    processed = 0;
    
    const poleBatch = [];
    for (const row of polesData) {
      const poleNumber = row.label_1 || row.pole_number || row.label || '';
      if (!poleNumber) continue;
      
      poleBatch.push([
        projectId,
        poleNumber,
        row.status || 'Unknown',
        parseFloat(row.latitude || row.lat) || null,
        parseFloat(row.longitude || row.lon) || null,
        row.pon_no || null,
        row.zone_no || null,
        row.cmpownr || null, // Designer (PlanNet)
        row.created_date || row.datecrtd ? new Date(row.created_date || row.datecrtd) : null
      ]);
      
      processed++;
      if (processed % 100 === 0) showProgress('Poles:');
    }
    
    if (poleBatch.length > 0) {
      await sql`
        INSERT INTO sow_poles (
          project_id, pole_number, status, latitude, longitude, 
          pon_no, zone_no, designer, created_date
        ) 
        VALUES ${sql(poleBatch)}
        ON CONFLICT (project_id, pole_number) DO UPDATE SET
          status = EXCLUDED.status,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          designer = EXCLUDED.designer,
          imported_at = CURRENT_TIMESTAMP
      `;
    }
    console.log(`\n✓ Imported ${poleBatch.length} poles (Designer: PlanNet)\n`);

    // 2. IMPORT DROPS
    console.log('💧 Importing Drops with designer info...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsSheet = dropsWB.Sheets[dropsWB.SheetNames[0]];
    const dropsData = XLSX.utils.sheet_to_json(dropsSheet);
    
    total = dropsData.length;
    processed = 0;
    
    const dropBatch = [];
    for (const row of dropsData) {
      const dropNumber = row.label || row.drop_number || '';
      const poleRef = row.strtfeat || row.endfeat || row.pole || '';
      if (!dropNumber) continue;
      
      // Extract distance from dim2
      let distance = 0;
      if (row.dim2) {
        const match = String(row.dim2).match(/(\d+(?:\.\d+)?)/);
        if (match) distance = parseFloat(match[1]);
      }
      
      dropBatch.push([
        projectId,
        dropNumber,
        poleRef,
        row.premises_id || '',
        row.address || row.strtfeat || '',
        row.type || row.status || 'Cable',
        parseFloat(row.latitude) || null,
        parseFloat(row.longitude) || null,
        distance,
        row.cmpownr || null // Designer (PlanNet)
      ]);
      
      processed++;
      if (processed % 500 === 0) showProgress('Drops:');
    }
    
    // Insert drops in chunks
    const chunkSize = 1000;
    for (let i = 0; i < dropBatch.length; i += chunkSize) {
      const chunk = dropBatch.slice(i, i + chunkSize);
      await sql`
        INSERT INTO sow_drops (
          project_id, drop_number, pole_number, premises_id,
          address, status, latitude, longitude, distance_to_pole, designer
        )
        VALUES ${sql(chunk)}
        ON CONFLICT (project_id, drop_number) DO UPDATE SET
          pole_number = EXCLUDED.pole_number,
          address = EXCLUDED.address,
          status = EXCLUDED.status,
          designer = EXCLUDED.designer,
          imported_at = CURRENT_TIMESTAMP
      `;
      showProgress('Drops:');
    }
    console.log(`\n✓ Imported ${dropBatch.length} drops (Designer: PlanNet)\n`);

    // 3. IMPORT FIBRE (if provided)
    if (fibreFile) {
      console.log('🔌 Importing Fibre with contractor info...');
      const fibreWB = XLSX.readFile(fibreFile);
      const fibreSheet = fibreWB.Sheets[fibreWB.SheetNames[0]];
      const fibreData = XLSX.utils.sheet_to_json(fibreSheet);
      
      total = fibreData.length;
      processed = 0;
      
      const fibreBatch = [];
      const contractors = new Set();
      
      for (const row of fibreData) {
        const segmentId = row.label || row.segment_id || '';
        if (!segmentId) continue;
        
        if (row.Contractor) contractors.add(row.Contractor);
        
        // Parse cable size to extract fiber count
        let fibreType = row['cable size'] || '';
        
        // Add layer info to fibre type
        if (row.layer) {
          fibreType = `${fibreType} - ${row.layer}`;
        }
        
        fibreBatch.push([
          projectId,
          segmentId,
          null, // from_point
          null, // to_point
          parseFloat(row.length) || null, // distance (cable length)
          fibreType,
          row.Contractor || null, // Actual installation contractor
          row.Complete || row.completed || null,
          row['Date Comp'] ? new Date(row['Date Comp']) : null,
          row.pon_no || null,
          row.zone_no || null
        ]);
        
        processed++;
      }
      
      if (fibreBatch.length > 0) {
        await sql`
          INSERT INTO sow_fibre (
            project_id, segment_id, from_point, to_point, distance,
            fibre_type, contractor, completed, date_completed,
            pon_no, zone_no
          )
          VALUES ${sql(fibreBatch)}
          ON CONFLICT (project_id, segment_id) DO UPDATE SET
            distance = EXCLUDED.distance,
            fibre_type = EXCLUDED.fibre_type,
            contractor = EXCLUDED.contractor,
            completed = EXCLUDED.completed,
            imported_at = CURRENT_TIMESTAMP
        `;
      }
      console.log(`✓ Imported ${fibreBatch.length} fibre segments`);
      console.log(`✓ Contractors found: ${Array.from(contractors).join(', ')}\n`);
    }

    // 4. FINAL SUMMARY
    console.log('📊 IMPORT COMPLETE - FINAL SUMMARY:');
    console.log('=' .repeat(60));
    
    const finalPoles = await sql`
      SELECT COUNT(*) as count, COUNT(DISTINCT designer) as designers 
      FROM sow_poles WHERE project_id = ${projectId}
    `;
    const finalDrops = await sql`
      SELECT COUNT(*) as count 
      FROM sow_drops WHERE project_id = ${projectId}
    `;
    const finalFibre = await sql`
      SELECT COUNT(*) as count, COUNT(DISTINCT contractor) as contractors 
      FROM sow_fibre WHERE project_id = ${projectId}
    `;
    
    console.log(`Poles: ${finalPoles[0].count} (Designer: PlanNet)`);
    console.log(`Drops: ${finalDrops[0].count} (Designer: PlanNet)`);
    console.log(`Fibre: ${finalFibre[0].count} (Contractors: ${finalFibre[0].contractors})`);
    
    // Check drop-pole relationships
    const orphanDrops = await sql`
      SELECT COUNT(*) as count 
      FROM sow_drops d
      WHERE d.project_id = ${projectId}
      AND d.pole_number != ''
      AND NOT EXISTS (
        SELECT 1 FROM sow_poles p 
        WHERE p.project_id = d.project_id 
        AND p.pole_number = d.pole_number
      )
    `;
    
    if (orphanDrops[0].count > 0) {
      console.log(`\n⚠️  Warning: ${orphanDrops[0].count} drops reference non-existent poles`);
    }
    
    // Show contractor summary
    const contractorSummary = await sql`
      SELECT contractor, COUNT(*) as segments, SUM(distance) as total_length
      FROM sow_fibre 
      WHERE project_id = ${projectId}
      GROUP BY contractor
    `;
    
    console.log('\n📋 Contractor Summary:');
    contractorSummary.forEach(c => {
      console.log(`  ${c.contractor}: ${c.segments} segments, ${Math.round(c.total_length || 0)} meters`);
    });
    
    console.log('\n✅ Import completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
if (args.length < 3) {
  console.log('Usage: node import-sow-with-contractors.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx] [--clear]');
  console.log('\nOptions:');
  console.log('  --clear    Clear existing data for project before import');
  console.log('\nExample:');
  console.log('  node import-sow-with-contractors.js oAigmUjSbjWHmH80AMxc poles.xlsx drops.xlsx fibre.xlsx --clear');
  process.exit(1);
}

importSOW(args[0], args[1], args[2], args[3]).catch(console.error);