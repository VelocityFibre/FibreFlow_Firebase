#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function showEverything() {
  console.log('\n' + '='.repeat(100));
  console.log('COMPLETE NEON DATABASE ANALYSIS - EVERYTHING WE HAVE');
  console.log('='.repeat(100) + '\n');

  try {
    // 1. ALL TABLES IN NEON
    console.log('📊 ALL TABLES IN NEON DATABASE:');
    console.log('-'.repeat(50));
    
    const allTables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('\nTotal tables:', allTables.length);
    for (const table of allTables) {
      // Get row count for each table
      try {
        const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(table.table_name)}`;
        console.log(`  - ${table.table_name}: ${countResult[0].count} rows`);
      } catch (e) {
        console.log(`  - ${table.table_name}: (can't count)`);
      }
    }

    // 2. SOW TABLES STRUCTURE
    console.log('\n\n📋 SOW TABLES STRUCTURE:');
    console.log('-'.repeat(50));
    
    const sowTables = ['sow_poles', 'sow_drops', 'sow_fibre'];
    for (const tableName of sowTables) {
      console.log(`\n${tableName.toUpperCase()}:`);
      const columns = await sql`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      
      columns.forEach(col => {
        const type = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})` 
          : col.data_type;
        console.log(`  - ${col.column_name}: ${type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }

    // 3. WHAT'S IN SOW TABLES NOW
    console.log('\n\n📦 CURRENT SOW DATA BY PROJECT:');
    console.log('-'.repeat(50));
    
    // Get all unique projects
    const projects = await sql`
      SELECT DISTINCT project_id FROM (
        SELECT project_id FROM sow_poles
        UNION
        SELECT project_id FROM sow_drops  
        UNION
        SELECT project_id FROM sow_fibre
      ) combined
    `;
    
    for (const proj of projects) {
      console.log(`\nProject: ${proj.project_id}`);
      
      // Poles detail
      const polesDetail = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT pole_number) as unique_poles,
          MIN(pole_number) as first_pole,
          MAX(pole_number) as last_pole,
          COUNT(DISTINCT status) as status_types,
          COUNT(DISTINCT pon_no) as pon_count,
          COUNT(DISTINCT zone_no) as zone_count
        FROM sow_poles 
        WHERE project_id = ${proj.project_id}
      `;
      
      console.log('  POLES:', polesDetail[0].total);
      console.log(`    - Unique pole numbers: ${polesDetail[0].unique_poles}`);
      console.log(`    - Range: ${polesDetail[0].first_pole} to ${polesDetail[0].last_pole}`);
      console.log(`    - PONs: ${polesDetail[0].pon_count}, Zones: ${polesDetail[0].zone_count}`);
      
      // Show statuses
      const statuses = await sql`
        SELECT status, COUNT(*) as count 
        FROM sow_poles 
        WHERE project_id = ${proj.project_id}
        GROUP BY status
        ORDER BY count DESC
        LIMIT 5
      `;
      console.log('    - Top statuses:');
      statuses.forEach(s => console.log(`      • ${s.status}: ${s.count}`));
      
      // Drops detail
      const dropsDetail = await sql`
        SELECT COUNT(*) as total FROM sow_drops WHERE project_id = ${proj.project_id}
      `;
      console.log(`  DROPS: ${dropsDetail[0].total}`);
      
      // Fibre detail
      const fibreDetail = await sql`
        SELECT COUNT(*) as total FROM sow_fibre WHERE project_id = ${proj.project_id}
      `;
      console.log(`  FIBRE: ${fibreDetail[0].total}`);
    }

    // 4. LAWLEY PROJECT SPECIFIC
    console.log('\n\n🎯 LAWLEY PROJECT (oAigmUjSbjWHmH80AMxc) DETAILED ANALYSIS:');
    console.log('-'.repeat(50));
    
    const lawleyPoles = await sql`
      SELECT * FROM sow_poles 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc' 
      LIMIT 3
    `;
    
    console.log('\nSample pole records:');
    lawleyPoles.forEach(pole => {
      console.log(`  ${pole.pole_number}:`);
      console.log(`    - Status: ${pole.status}`);
      console.log(`    - PON: ${pole.pon_no}, Zone: ${pole.zone_no}`);
      console.log(`    - Location: ${pole.latitude || 'No GPS'}, ${pole.longitude || 'No GPS'}`);
      console.log(`    - Imported: ${pole.imported_at}`);
    });

    // 5. EXCEL FILES ANALYSIS
    console.log('\n\n📁 EXCEL FILES - WHAT WE\'RE TRYING TO IMPORT:');
    console.log('-'.repeat(50));
    
    // Poles Excel
    console.log('\n1. LAWLEY POLES.XLSX:');
    const polesWB = XLSX.readFile('/home/ldp/Downloads/Lawley Poles.xlsx');
    const polesSheet = polesWB.Sheets[polesWB.SheetNames[0]];
    const polesData = XLSX.utils.sheet_to_json(polesSheet);
    
    console.log(`   Total rows: ${polesData.length}`);
    console.log(`   All columns: ${Object.keys(polesData[0]).join(', ')}`);
    console.log('\n   Sample data (first row):');
    const firstPole = polesData[0];
    Object.entries(firstPole).slice(0, 10).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    
    // Drops Excel
    console.log('\n\n2. LAWLEY DROPS.XLSX:');
    const dropsWB = XLSX.readFile('/home/ldp/Downloads/Lawley Drops.xlsx');
    const dropsSheet = dropsWB.Sheets[dropsWB.SheetNames[0]];
    const dropsData = XLSX.utils.sheet_to_json(dropsSheet);
    
    console.log(`   Total rows: ${dropsData.length}`);
    console.log(`   All columns: ${Object.keys(dropsData[0]).join(', ')}`);
    console.log('\n   Sample data (first row):');
    const firstDrop = dropsData[0];
    Object.entries(firstDrop).slice(0, 10).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });

    // 6. IMPORT PLAN
    console.log('\n\n📝 CLEAR IMPORT PLAN:');
    console.log('='.repeat(100));
    
    console.log('\nWHAT WE HAVE:');
    console.log('  - Neon has SOW tables ready (sow_poles, sow_drops, sow_fibre)');
    console.log('  - Lawley project already has 498 poles (partial import from previous attempt)');
    console.log('  - No drops or fibre data yet');
    
    console.log('\nWHAT WE NEED TO DO:');
    console.log('  1. CLEAR the existing 498 poles (they are incomplete)');
    console.log('  2. IMPORT all 4,471 poles from Excel');
    console.log('  3. IMPORT all 23,708 drops from Excel');
    console.log('  4. IMPORT all 686 fibre records from Excel');
    
    console.log('\nEXACT MAPPING:');
    console.log('  POLES Excel → sow_poles table:');
    console.log('    - label_1 → pole_number');
    console.log('    - status → status');
    console.log('    - pon_no → pon_no');
    console.log('    - zone_no → zone_no');
    console.log('    - latitude/longitude → latitude/longitude');
    
    console.log('\n  DROPS Excel → sow_drops table:');
    console.log('    - label → drop_number');
    console.log('    - strtfeat → pole_number (link to poles)');
    console.log('    - type → status');
    console.log('    - dim2 → distance_to_pole (extract number)');
    
    console.log('\n  FIBRE Excel → sow_fibre table:');
    console.log('    - label → segment_id');
    console.log('    - cable size → cable_size');
    console.log('    - pon_no → pon_no');
    console.log('    - Complete → is_complete (Y/N to boolean)');
    
    console.log('\n\n✅ READY TO IMPORT!');
    console.log('Run: node simple-sow-import.js oAigmUjSbjWHmH80AMxc poles.xlsx drops.xlsx fibre.xlsx --clear');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showEverything().catch(console.error);