#!/usr/bin/env node
const { Client } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const pgConfig = {
  connectionString: process.env.NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
};

async function resumeImport(projectId, polesFile, dropsFile, fibreFile) {
  console.log('\n🚀 RESUMING SOW BATCH IMPORT');
  console.log('=' .repeat(60));
  
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to Neon\n');
    
    // Check what we already have
    const existingPoles = await client.query(
      `SELECT pole_number FROM sow_poles WHERE project_id = $1`,
      [projectId]
    );
    const existingPoleSet = new Set(existingPoles.rows.map(r => r.pole_number));
    console.log(`Found ${existingPoleSet.size} existing poles\n`);
    
    // 1. COMPLETE POLES IMPORT
    console.log('📍 IMPORTING REMAINING POLES...');
    const polesWB = XLSX.readFile(polesFile);
    const polesData = XLSX.utils.sheet_to_json(polesWB.Sheets[polesWB.SheetNames[0]]);
    
    // Filter out already imported poles
    const remainingPoles = polesData.filter(row => {
      const poleNumber = row.label_1 || row.pole_number || '';
      return poleNumber && !existingPoleSet.has(poleNumber);
    });
    
    console.log(`${remainingPoles.length} poles to import (out of ${polesData.length} total)\n`);
    
    const BATCH_SIZE = 500;
    let polesImported = 0;
    
    for (let i = 0; i < remainingPoles.length; i += BATCH_SIZE) {
      const batch = remainingPoles.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      
      let valueIndex = 1;
      batch.forEach((row) => {
        const poleNumber = row.label_1 || row.pole_number || '';
        
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
          ON CONFLICT (project_id, pole_number) DO NOTHING
        `;
        
        const result = await client.query(query, values);
        polesImported += result.rowCount;
        console.log(`✅ Batch: ${polesImported} new poles imported`);
      }
    }
    
    console.log(`✓ Poles complete: ${existingPoleSet.size + polesImported} total\n`);
    
    // 2. IMPORT DROPS
    console.log('💧 IMPORTING DROPS...');
    const dropsWB = XLSX.readFile(dropsFile);
    const dropsData = XLSX.utils.sheet_to_json(dropsWB.Sheets[dropsWB.SheetNames[0]]);
    
    let dropsImported = 0;
    
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
        console.log(`✅ Batch: ${dropsImported} drops imported`);
      }
    }
    
    console.log(`✓ Total Drops: ${dropsImported}\n`);
    
    // 3. IMPORT FIBRE
    if (fibreFile) {
      console.log('🔌 IMPORTING FIBRE...');
      const fibreWB = XLSX.readFile(fibreFile);
      const fibreData = XLSX.utils.sheet_to_json(fibreWB.Sheets[fibreWB.SheetNames[0]]);
      
      let fibreImported = 0;
      const contractors = new Set();
      
      // Process in one big batch for fibre (usually smaller dataset)
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
    
    // 4. Final Summary
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
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node resume-batch-import.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx]');
  process.exit(1);
}

resumeImport(args[0], args[1], args[2], args[3]).catch(console.error);