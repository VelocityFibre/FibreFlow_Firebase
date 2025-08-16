#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function importSOW(projectId, polesFile, dropsFile, fibreFile) {
  console.log('\n🚀 FINAL SOW IMPORT');
  console.log('=' .repeat(60));
  
  try {
    // 1. Setup tables
    console.log('Setting up tables...');
    try {
      await sql`ALTER TABLE sow_poles ADD COLUMN IF NOT EXISTS designer VARCHAR(255)`;
      await sql`ALTER TABLE sow_drops ADD COLUMN IF NOT EXISTS designer VARCHAR(255)`;
    } catch (e) {
      // Columns might already exist
    }
    
    // 2. Clear if requested
    if (process.argv.includes('--clear')) {
      console.log('Clearing existing data...');
      await sql`DELETE FROM sow_fibre WHERE project_id = ${projectId}`;
      await sql`DELETE FROM sow_drops WHERE project_id = ${projectId}`;
      await sql`DELETE FROM sow_poles WHERE project_id = ${projectId}`;
    }
    
    // 3. Import Poles
    console.log('\n📍 IMPORTING POLES...');
    const polesWB = XLSX.readFile(polesFile);
    const polesData = XLSX.utils.sheet_to_json(polesWB.Sheets[polesWB.SheetNames[0]]);
    
    let poleCount = 0;
    for (const row of polesData) {
      const poleNumber = row.label_1 || row.pole_number || '';
      if (!poleNumber) continue;
      
      try {
        await sql`
          INSERT INTO sow_poles (
            project_id, pole_number, status, latitude, longitude, 
            pon_no, zone_no, designer, created_date
          ) VALUES (
            ${projectId}, ${poleNumber}, ${row.status || 'Unknown'},
            ${parseFloat(row.lat) || null}, ${parseFloat(row.lon) || null},
            ${row.pon_no || null}, ${row.zone_no || null},
            ${row.cmpownr || null}, ${row.datecrtd ? new Date(row.datecrtd) : null}
          )
          ON CONFLICT (project_id, pole_number) DO UPDATE SET
            status = EXCLUDED.status,
            designer = EXCLUDED.designer
        `;
        poleCount++;
        if (poleCount % 100 === 0) process.stdout.write(`\rPoles: ${poleCount}`);
      } catch (e) {
        // Skip errors
      }
    }
    console.log(`\n✓ Imported ${poleCount} poles`);
    
    // 4. Import Drops
    console.log('\n💧 IMPORTING DROPS...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
    
    let dropCount = 0;
    for (const row of dropsData) {
      const dropNumber = row.label || '';
      const poleRef = row.strtfeat || '';
      if (!dropNumber) continue;
      
      let distance = 0;
      if (row.dim2) {
        const match = String(row.dim2).match(/(\d+)/);
        if (match) distance = parseInt(match[1]);
      }
      
      try {
        await sql`
          INSERT INTO sow_drops (
            project_id, drop_number, pole_number, address, status,
            distance_to_pole, designer
          ) VALUES (
            ${projectId}, ${dropNumber}, ${poleRef},
            ${row.endfeat || ''}, ${row.type || 'Cable'},
            ${distance}, ${row.cmpownr || null}
          )
          ON CONFLICT (project_id, drop_number) DO UPDATE SET
            pole_number = EXCLUDED.pole_number,
            designer = EXCLUDED.designer
        `;
        dropCount++;
        if (dropCount % 500 === 0) process.stdout.write(`\rDrops: ${dropCount}`);
      } catch (e) {
        // Skip errors
      }
    }
    console.log(`\n✓ Imported ${dropCount} drops`);
    
    // 5. Import Fibre
    if (fibreFile) {
      console.log('\n🔌 IMPORTING FIBRE...');
      const fibreWB = XLSX.readFile(fibreFile);
      const fibreData = XLSX.utils.sheet_to_json(fibreWB.Sheets[fibreWB.SheetNames[0]]);
      
      let fibreCount = 0;
      const contractors = new Set();
      
      for (const row of fibreData) {
        const segmentId = row.label || '';
        if (!segmentId) continue;
        
        if (row.Contractor) contractors.add(row.Contractor);
        
        try {
          await sql`
            INSERT INTO sow_fibre (
              project_id, segment_id, distance, fibre_type, contractor,
              completed, date_completed, pon_no, zone_no
            ) VALUES (
              ${projectId}, ${segmentId}, ${parseFloat(row.length) || null},
              ${row['cable size'] || ''}, ${row.Contractor || null},
              ${row.Complete || null}, ${row['Date Comp'] ? new Date(row['Date Comp']) : null},
              ${row.pon_no || null}, ${row.zone_no || null}
            )
            ON CONFLICT (project_id, segment_id) DO UPDATE SET
              distance = EXCLUDED.distance,
              contractor = EXCLUDED.contractor
          `;
          fibreCount++;
        } catch (e) {
          // Skip errors
        }
      }
      console.log(`✓ Imported ${fibreCount} fibre segments`);
      console.log(`✓ Contractors: ${Array.from(contractors).join(', ')}`);
    }
    
    // 6. Final Summary
    console.log('\n\n📊 IMPORT COMPLETE!');
    console.log('=' .repeat(60));
    
    const summary = await sql`
      SELECT 
        (SELECT COUNT(*) FROM sow_poles WHERE project_id = ${projectId}) as poles,
        (SELECT COUNT(*) FROM sow_drops WHERE project_id = ${projectId}) as drops,
        (SELECT COUNT(*) FROM sow_fibre WHERE project_id = ${projectId}) as fibre
    `;
    
    console.log(`Total Poles: ${summary[0].poles}`);
    console.log(`Total Drops: ${summary[0].drops}`);
    console.log(`Total Fibre: ${summary[0].fibre}`);
    
    // Check fibre contractors
    const contractors = await sql`
      SELECT contractor, COUNT(*) as count, SUM(distance) as total_distance
      FROM sow_fibre 
      WHERE project_id = ${projectId} AND contractor IS NOT NULL
      GROUP BY contractor
    `;
    
    if (contractors.length > 0) {
      console.log('\nContractor Summary:');
      contractors.forEach(c => {
        console.log(`  ${c.contractor}: ${c.count} segments, ${Math.round(c.total_distance || 0)}m`);
      });
    }
    
    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main
const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
if (args.length < 3) {
  console.log('Usage: node simple-import-final.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx] [--clear]');
  process.exit(1);
}

importSOW(args[0], args[1], args[2], args[3]).catch(console.error);