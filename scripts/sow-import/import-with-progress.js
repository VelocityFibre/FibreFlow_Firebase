#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function importWithProgress(projectId, polesFile, dropsFile, fibreFile) {
  console.log('\n🚀 SOW IMPORT WITH PROGRESS TRACKING');
  console.log('=' .repeat(60));
  console.log(`Project: ${projectId}\n`);
  
  try {
    // Check current status
    console.log('📊 Checking current status...');
    const status = await sql`
      SELECT 
        'sow_poles' as table_name, COUNT(*) as count 
      FROM sow_poles WHERE project_id = ${projectId}
      UNION ALL
      SELECT 'sow_drops', COUNT(*) FROM sow_drops WHERE project_id = ${projectId}
      UNION ALL
      SELECT 'sow_fibre', COUNT(*) FROM sow_fibre WHERE project_id = ${projectId}
    `;
    
    status.forEach(row => {
      console.log(`${row.table_name}: ${row.count} existing records`);
    });
    console.log();
    
    const existingPoles = parseInt(status[0].count);
    const existingDrops = parseInt(status[1].count);
    const existingFibre = parseInt(status[2].count);
    
    // 1. COMPLETE POLES IF NEEDED
    if (existingPoles < 4471) {
      console.log('📍 CONTINUING POLES IMPORT...');
      
      // Get existing pole numbers
      const existing = await sql`
        SELECT pole_number FROM sow_poles WHERE project_id = ${projectId}
      `;
      const existingSet = new Set(existing.map(r => r.pole_number));
      
      const polesWB = XLSX.readFile(polesFile);
      const polesData = XLSX.utils.sheet_to_json(polesWB.Sheets[polesWB.SheetNames[0]]);
      
      let imported = 0;
      let skipped = 0;
      
      for (const row of polesData) {
        const poleNumber = row.label_1 || row.pole_number || '';
        if (!poleNumber) continue;
        
        if (existingSet.has(poleNumber)) {
          skipped++;
          continue;
        }
        
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
            ON CONFLICT (project_id, pole_number) DO NOTHING
          `;
          imported++;
          
          if (imported % 100 === 0) {
            console.log(`Progress: ${imported} new poles imported (${skipped} skipped)`);
          }
        } catch (e) {
          // Skip errors
        }
      }
      
      console.log(`✓ Poles complete: ${imported} new, ${skipped} existing, ${existingPoles + imported} total\n`);
    }
    
    // 2. IMPORT DROPS IF NEEDED
    if (existingDrops === 0) {
      console.log('💧 IMPORTING DROPS...');
      const dropsWB = XLSX.readFile(dropsFile);
      const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
      
      let imported = 0;
      const startTime = Date.now();
      
      // Process in smaller batches to avoid timeouts
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < dropsData.length; i += BATCH_SIZE) {
        const batch = dropsData.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          const dropNumber = row.label || '';
          const poleRef = row.strtfeat || '';
          if (!dropNumber) continue;
          
          // Extract distance
          let distance = 0;
          if (row.dim2) {
            const match = String(row.dim2).match(/(\d+)/);
            if (match) distance = parseInt(match[1]);
          }
          
          try {
            await sql`
              INSERT INTO sow_drops (
                project_id, drop_number, pole_number, premises_id,
                address, status, latitude, longitude, distance_to_pole, designer
              ) VALUES (
                ${projectId}, ${dropNumber}, ${poleRef}, ${row.premises_id || ''},
                ${row.endfeat || ''}, ${row.type || 'Cable'},
                ${parseFloat(row.latitude) || null}, ${parseFloat(row.longitude) || null},
                ${distance}, ${row.cmpownr || null}
              )
              ON CONFLICT (project_id, drop_number) DO UPDATE SET
                pole_number = EXCLUDED.pole_number
            `;
            imported++;
          } catch (e) {
            // Skip errors
          }
        }
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`Progress: ${imported}/${dropsData.length} drops (${elapsed}s elapsed)`);
      }
      
      console.log(`✓ Drops complete: ${imported} imported\n`);
    }
    
    // 3. IMPORT FIBRE IF NEEDED
    if (existingFibre === 0 && fibreFile) {
      console.log('🔌 IMPORTING FIBRE...');
      const fibreWB = XLSX.readFile(fibreFile);
      const fibreData = XLSX.utils.sheet_to_json(fibreWB.Sheets[fibreWB.SheetNames[0]]);
      
      let imported = 0;
      const contractors = new Set();
      
      for (const row of fibreData) {
        const segmentId = row.label || '';
        if (!segmentId) continue;
        
        if (row.Contractor) contractors.add(row.Contractor);
        
        try {
          await sql`
            INSERT INTO sow_fibre (
              project_id, segment_id, from_point, to_point, distance,
              fibre_type, contractor, completed, date_completed,
              pon_no, zone_no
            ) VALUES (
              ${projectId}, ${segmentId}, ${null}, ${null},
              ${parseFloat(row.length) || null}, ${row['cable size'] || ''},
              ${row.Contractor || null}, ${row.Complete || null},
              ${row['Date Comp'] ? new Date(row['Date Comp']) : null},
              ${row.pon_no || null}, ${row.zone_no || null}
            )
            ON CONFLICT (project_id, segment_id) DO NOTHING
          `;
          imported++;
          
          if (imported % 100 === 0) {
            console.log(`Progress: ${imported} fibre segments`);
          }
        } catch (e) {
          // Skip errors
        }
      }
      
      console.log(`✓ Fibre complete: ${imported} imported`);
      console.log(`✓ Contractors: ${Array.from(contractors).join(', ')}\n`);
    }
    
    // Final summary
    console.log('📊 FINAL SUMMARY');
    console.log('=' .repeat(60));
    
    const final = await sql`
      SELECT 
        (SELECT COUNT(*) FROM sow_poles WHERE project_id = ${projectId}) as poles,
        (SELECT COUNT(*) FROM sow_drops WHERE project_id = ${projectId}) as drops,
        (SELECT COUNT(*) FROM sow_fibre WHERE project_id = ${projectId}) as fibre
    `;
    
    console.log(`Total Poles: ${final[0].poles}`);
    console.log(`Total Drops: ${final[0].drops}`);
    console.log(`Total Fibre: ${final[0].fibre}`);
    
    console.log('\n✅ Import complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node import-with-progress.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx]');
  process.exit(1);
}

importWithProgress(args[0], args[1], args[2], args[3]).catch(console.error);