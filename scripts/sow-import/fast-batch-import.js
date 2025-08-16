#!/usr/bin/env node
const { Client } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// PostgreSQL connection using pg library
const pgConfig = {
  connectionString: process.env.NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
};

async function fastBatchImport(projectId, polesFile, dropsFile, fibreFile) {
  console.log('\n🚀 FAST BATCH SOW IMPORT (Using Proven Method)');
  console.log('=' .repeat(60));
  console.log(`Project: ${projectId}`);
  console.log(`Poles: ${path.basename(polesFile)}`);
  console.log(`Drops: ${path.basename(dropsFile)}`);
  console.log(`Fibre: ${fibreFile ? path.basename(fibreFile) : 'None'}`);
  console.log('=' .repeat(60) + '\n');

  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✓ Connected to Neon\n');
    
    // 1. Setup tables
    console.log('Setting up tables...');
    await client.query(`ALTER TABLE sow_poles ADD COLUMN IF NOT EXISTS designer VARCHAR(255)`);
    await client.query(`ALTER TABLE sow_drops ADD COLUMN IF NOT EXISTS designer VARCHAR(255)`);
    console.log('✓ Tables ready\n');
    
    // 2. Clear if requested
    if (process.argv.includes('--clear')) {
      console.log('Clearing existing data...');
      await client.query(`DELETE FROM sow_fibre WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM sow_drops WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM sow_poles WHERE project_id = $1`, [projectId]);
      console.log('✓ Cleared\n');
    }
    
    // 3. IMPORT POLES WITH BATCH INSERT
    console.log('📍 IMPORTING POLES (Batch Mode)...');
    const polesWB = XLSX.readFile(polesFile);
    const polesData = XLSX.utils.sheet_to_json(polesWB.Sheets[polesWB.SheetNames[0]]);
    
    const BATCH_SIZE = 1000;
    let polesImported = 0;
    const startTime = Date.now();
    
    // Process poles in batches
    for (let i = 0; i < polesData.length; i += BATCH_SIZE) {
      const batch = polesData.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      
      let valueIndex = 1;
      batch.forEach((row, rowIndex) => {
        const poleNumber = row.label_1 || row.pole_number || '';
        if (!poleNumber) return;
        
        // Build placeholders for this row
        const rowPlaceholders = [];
        for (let j = 0; j < 9; j++) {
          rowPlaceholders.push(`$${valueIndex++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
        
        // Add values
        values.push(
          projectId,
          poleNumber,
          row.status || 'Unknown',
          parseFloat(row.lat) || null,
          parseFloat(row.lon) || null,
          row.pon_no || null,
          row.zone_no || null,
          row.cmpownr || null,
          row.datecrtd ? new Date(row.datecrtd) : null
        );
      });
      
      if (placeholders.length > 0) {
        const query = `
          INSERT INTO sow_poles (
            project_id, pole_number, status, latitude, longitude,
            pon_no, zone_no, designer, created_date
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (project_id, pole_number) DO UPDATE SET
            status = EXCLUDED.status,
            designer = EXCLUDED.designer
        `;
        
        const result = await client.query(query, values);
        polesImported += result.rowCount;
        
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = Math.round(polesImported / elapsed);
        console.log(`✅ Batch: ${polesImported} poles imported (${rate}/sec)`);
      }
    }
    console.log(`✓ Total Poles: ${polesImported}\n`);
    
    // 4. IMPORT DROPS WITH BATCH INSERT
    console.log('💧 IMPORTING DROPS (Batch Mode)...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
    
    let dropsImported = 0;
    const dropStartTime = Date.now();
    
    // Process drops in batches
    for (let i = 0; i < dropsData.length; i += BATCH_SIZE) {
      const batch = dropsData.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      
      let valueIndex = 1;
      batch.forEach((row) => {
        const dropNumber = row.label || '';
        const poleRef = row.strtfeat || '';
        if (!dropNumber) return;
        
        // Extract distance
        let distance = 0;
        if (row.dim2) {
          const match = String(row.dim2).match(/(\d+)/);
          if (match) distance = parseInt(match[1]);
        }
        
        // Build placeholders
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
          ON CONFLICT (project_id, drop_number) DO UPDATE SET
            pole_number = EXCLUDED.pole_number,
            designer = EXCLUDED.designer
        `;
        
        const result = await client.query(query, values);
        dropsImported += result.rowCount;
        
        const elapsed = (Date.now() - dropStartTime) / 1000;
        const rate = Math.round(dropsImported / elapsed);
        console.log(`✅ Batch: ${dropsImported} drops imported (${rate}/sec)`);
      }
    }
    console.log(`✓ Total Drops: ${dropsImported}\n`);
    
    // 5. IMPORT FIBRE WITH BATCH INSERT
    if (fibreFile) {
      console.log('🔌 IMPORTING FIBRE (Batch Mode)...');
      const fibreWB = XLSX.readFile(fibreFile);
      const fibreData = XLSX.utils.sheet_to_json(fibreWB.Sheets[fibreWB.SheetNames[0]]);
      
      let fibreImported = 0;
      const contractors = new Set();
      
      const values = [];
      const placeholders = [];
      let valueIndex = 1;
      
      fibreData.forEach((row) => {
        const segmentId = row.label || '';
        if (!segmentId) return;
        
        if (row.Contractor) contractors.add(row.Contractor);
        
        // Build placeholders
        const rowPlaceholders = [];
        for (let j = 0; j < 11; j++) {
          rowPlaceholders.push(`$${valueIndex++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
        
        // Add values
        values.push(
          projectId,
          segmentId,
          null, // from_point
          null, // to_point
          parseFloat(row.length) || null,
          row['cable size'] || '',
          row.Contractor || null,
          row.Complete || null,
          row['Date Comp'] ? new Date(row['Date Comp']) : null,
          row.pon_no || null,
          row.zone_no || null
        );
      });
      
      if (placeholders.length > 0) {
        const query = `
          INSERT INTO sow_fibre (
            project_id, segment_id, from_point, to_point, distance,
            fibre_type, contractor, completed, date_completed,
            pon_no, zone_no
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (project_id, segment_id) DO UPDATE SET
            distance = EXCLUDED.distance,
            contractor = EXCLUDED.contractor
        `;
        
        const result = await client.query(query, values);
        fibreImported = result.rowCount;
      }
      
      console.log(`✓ Total Fibre: ${fibreImported}`);
      console.log(`✓ Contractors: ${Array.from(contractors).join(', ')}\n`);
    }
    
    // 6. Final Summary
    console.log('📊 IMPORT COMPLETE!');
    console.log('=' .repeat(60));
    
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM sow_poles WHERE project_id = $1) as poles,
        (SELECT COUNT(*) FROM sow_drops WHERE project_id = $1) as drops,
        (SELECT COUNT(*) FROM sow_fibre WHERE project_id = $1) as fibre
    `, [projectId]);
    
    console.log(`Total Poles: ${summary.rows[0].poles}`);
    console.log(`Total Drops: ${summary.rows[0].drops}`);
    console.log(`Total Fibre: ${summary.rows[0].fibre}`);
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\nTime taken: ${totalTime} seconds`);
    
    // Check contractors
    const contractors = await client.query(`
      SELECT contractor, COUNT(*) as count, SUM(distance) as total_distance
      FROM sow_fibre 
      WHERE project_id = $1 AND contractor IS NOT NULL
      GROUP BY contractor
    `, [projectId]);
    
    if (contractors.rows.length > 0) {
      console.log('\nContractor Summary:');
      contractors.rows.forEach(c => {
        console.log(`  ${c.contractor}: ${c.count} segments, ${Math.round(c.total_distance || 0)}m`);
      });
    }
    
    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Main
const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
if (args.length < 3) {
  console.log('Usage: node fast-batch-import.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx] [--clear]');
  process.exit(1);
}

fastBatchImport(args[0], args[1], args[2], args[3]).catch(console.error);