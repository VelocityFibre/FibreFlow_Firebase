#!/usr/bin/env node
const { Client } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const pgConfig = {
  connectionString: process.env.NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
};

async function fastDropsBatch(projectId, dropsFile) {
  console.log('\n🚀 FAST BATCH DROPS IMPORT');
  console.log('=' .repeat(60));
  
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to Neon\n');
    
    // Get existing drops
    console.log('Loading existing drops...');
    const existing = await client.query(
      `SELECT drop_number FROM sow_drops WHERE project_id = $1`,
      [projectId]
    );
    const existingSet = new Set(existing.rows.map(r => r.drop_number));
    console.log(`Found ${existingSet.size} existing drops\n`);
    
    // Read Excel
    console.log('Reading Excel file...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
    
    // Filter remaining drops
    const remainingDrops = dropsData.filter(row => {
      const dropNumber = row.label || '';
      return dropNumber && !existingSet.has(dropNumber);
    });
    
    console.log(`Total drops in Excel: ${dropsData.length}`);
    console.log(`Drops to import: ${remainingDrops.length}\n`);
    
    // Process in batches
    const BATCH_SIZE = 1000;
    let totalImported = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < remainingDrops.length; i += BATCH_SIZE) {
      const batch = remainingDrops.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      
      let valueIndex = 1;
      batch.forEach((row) => {
        const dropNumber = row.label || '';
        const poleRef = row.strtfeat || '';
        
        // Extract distance
        let distance = 0;
        if (row.dim2) {
          const match = String(row.dim2).match(/(\d+)/);
          if (match) distance = parseInt(match[1]);
        }
        
        // Build placeholders for this row
        const rowPlaceholders = [];
        for (let j = 0; j < 10; j++) {
          rowPlaceholders.push(`$${valueIndex++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
        
        // Add values
        values.push(
          projectId,
          dropNumber,
          poleRef,
          row.premises_id || '',
          row.endfeat || '',
          row.type || 'Cable',
          parseFloat(row.latitude) || null,
          parseFloat(row.longitude) || null,
          distance,
          row.cmpownr || null
        );
      });
      
      if (placeholders.length > 0) {
        const query = `
          INSERT INTO sow_drops (
            project_id, drop_number, pole_number, premises_id,
            address, status, latitude, longitude, distance_to_pole, designer
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (project_id, drop_number) DO NOTHING
        `;
        
        const result = await client.query(query, values);
        totalImported += result.rowCount;
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = Math.round(totalImported / elapsed);
        const progress = Math.round((i + batch.length) / remainingDrops.length * 100);
        
        console.log(`✅ Batch: ${totalImported} drops imported (${progress}% complete, ${rate}/sec)`);
      }
    }
    
    // Final summary
    const finalCount = await client.query(
      `SELECT COUNT(*) as count FROM sow_drops WHERE project_id = $1`,
      [projectId]
    );
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ IMPORT COMPLETE!`);
    console.log(`Total drops in database: ${finalCount.rows[0].count}`);
    console.log(`New drops imported: ${totalImported}`);
    console.log(`Time taken: ${totalTime} seconds`);
    console.log(`Average rate: ${Math.round(totalImported / totalTime)} drops/sec`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node fast-drops-batch.js <projectId> <drops.xlsx>');
  process.exit(1);
}

fastDropsBatch(args[0], args[1]).catch(console.error);