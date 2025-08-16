#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function batchDropsImport(projectId, dropsFile) {
  console.log('\n🚀 BATCH DROPS IMPORT (Neon)');
  console.log('=' .repeat(60));
  
  try {
    // Wake up database
    await sql`SELECT 1`;
    console.log('✅ Database connected\n');
    
    // Get current count
    const currentCount = await sql`
      SELECT COUNT(*) as count FROM sow_drops WHERE project_id = ${projectId}
    `;
    console.log(`Current drops: ${currentCount[0].count}`);
    
    // Read Excel
    console.log('Reading Excel file...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
    console.log(`Total drops in Excel: ${dropsData.length}\n`);
    
    // Process in smaller batches for Neon serverless
    const BATCH_SIZE = 100;
    let imported = 0;
    let skipped = 0;
    const startTime = Date.now();
    
    // Process each batch
    for (let i = 0; i < dropsData.length; i += BATCH_SIZE) {
      const batch = dropsData.slice(i, i + BATCH_SIZE);
      
      // Process each drop in the batch
      const promises = batch.map(async (row) => {
        const dropNumber = row.label || '';
        if (!dropNumber) return null;
        
        const poleRef = row.strtfeat || '';
        
        // Extract distance
        let distance = 0;
        if (row.dim2) {
          const match = String(row.dim2).match(/(\d+)/);
          if (match) distance = parseInt(match[1]);
        }
        
        try {
          const result = await sql`
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
            RETURNING drop_number
          `;
          return result.length > 0 ? 1 : 0;
        } catch (e) {
          return 0;
        }
      });
      
      // Wait for batch to complete
      const results = await Promise.all(promises);
      const batchImported = results.filter(r => r === 1).length;
      imported += batchImported;
      skipped += results.filter(r => r === 0).length;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const progress = Math.round((i + batch.length) / dropsData.length * 100);
      const rate = elapsed > 0 ? Math.round(imported / elapsed) : 0;
      
      console.log(`Progress: ${progress}% | Imported: ${imported} | Skipped: ${skipped} | Rate: ${rate}/sec`);
    }
    
    // Final count
    const finalCount = await sql`
      SELECT COUNT(*) as count FROM sow_drops WHERE project_id = ${projectId}
    `;
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ IMPORT COMPLETE!`);
    console.log(`Total drops in database: ${finalCount[0].count}`);
    console.log(`New drops imported: ${imported}`);
    console.log(`Duplicates skipped: ${skipped}`);
    console.log(`Time taken: ${totalTime} seconds`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node batch-drops-neon.js <projectId> <drops.xlsx>');
  process.exit(1);
}

batchDropsImport(args[0], args[1]).catch(console.error);