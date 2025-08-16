#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function continueDropsImport(projectId, dropsFile) {
  console.log('\n💧 CONTINUING DROPS IMPORT');
  console.log('=' .repeat(60));
  
  try {
    // Check current drops
    const existingCount = await sql`
      SELECT COUNT(*) as count FROM sow_drops WHERE project_id = ${projectId}
    `;
    console.log(`Current drops in database: ${existingCount[0].count}\n`);
    
    // Get existing drop numbers to avoid duplicates
    console.log('Loading existing drop numbers...');
    const existing = await sql`
      SELECT drop_number FROM sow_drops WHERE project_id = ${projectId}
    `;
    const existingSet = new Set(existing.map(r => r.drop_number));
    console.log(`Found ${existingSet.size} existing drops\n`);
    
    // Read Excel file
    console.log('Reading Excel file...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
    console.log(`Total drops in Excel: ${dropsData.length}`);
    
    // Filter out already imported drops
    const remainingDrops = dropsData.filter(row => {
      const dropNumber = row.label || '';
      return dropNumber && !existingSet.has(dropNumber);
    });
    
    console.log(`Drops to import: ${remainingDrops.length}\n`);
    
    // Import in batches
    const BATCH_SIZE = 50;
    let imported = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < remainingDrops.length; i += BATCH_SIZE) {
      const batch = remainingDrops.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        const dropNumber = row.label || '';
        const poleRef = row.strtfeat || '';
        
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
            ON CONFLICT (project_id, drop_number) DO NOTHING
          `;
          imported++;
        } catch (e) {
          console.error(`Error importing drop ${dropNumber}:`, e.message);
        }
      }
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = Math.round(imported / elapsed);
      const eta = Math.round((remainingDrops.length - imported) / rate);
      
      console.log(`Progress: ${imported}/${remainingDrops.length} drops (${elapsed}s elapsed, ${rate}/sec, ETA: ${eta}s)`);
    }
    
    // Final check
    const finalCount = await sql`
      SELECT COUNT(*) as count FROM sow_drops WHERE project_id = ${projectId}
    `;
    
    console.log(`\n✅ Import complete!`);
    console.log(`Total drops in database: ${finalCount[0].count}`);
    console.log(`New drops imported: ${imported}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node continue-drops-import.js <projectId> <drops.xlsx>');
  process.exit(1);
}

continueDropsImport(args[0], args[1]).catch(console.error);