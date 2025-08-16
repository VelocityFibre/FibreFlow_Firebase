#!/usr/bin/env node

/**
 * Import SOW Excel files to Neon Database
 * Usage: node import-sow-to-neon.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx]
 */

const XLSX = require('xlsx');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Get connection string from environment
const connectionString = process.env.NEON_CONNECTION_STRING;
if (!connectionString) {
  console.error('ERROR: NEON_CONNECTION_STRING not found in .env.local');
  process.exit(1);
}

const sql = neon(connectionString);

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node import-sow-to-neon.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx]');
  process.exit(1);
}

const [projectId, polesFile, dropsFile, fibreFile] = args;

// Verify files exist
if (!fs.existsSync(polesFile)) {
  console.error(`ERROR: Poles file not found: ${polesFile}`);
  process.exit(1);
}
if (!fs.existsSync(dropsFile)) {
  console.error(`ERROR: Drops file not found: ${dropsFile}`);
  process.exit(1);
}

console.log('=== SOW Import to Neon ===');
console.log(`Project ID: ${projectId}`);
console.log(`Poles file: ${polesFile}`);
console.log(`Drops file: ${dropsFile}`);
console.log(`Fibre file: ${fibreFile || 'Not provided'}`);
console.log('');

// Create tables if they don't exist
async function createTables() {
  console.log('Creating tables if needed...');
  
  try {
    // SOW Poles table
    await sql`
      CREATE TABLE IF NOT EXISTS sow_poles (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        pole_number VARCHAR(100) NOT NULL,
        status VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        pon_no VARCHAR(50),
        zone_no VARCHAR(50),
        created_date TIMESTAMP,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, pole_number)
      )
    `;
    
    // SOW Drops table
    await sql`
      CREATE TABLE IF NOT EXISTS sow_drops (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        drop_number VARCHAR(100) NOT NULL,
        pole_number VARCHAR(100),
        premises_id VARCHAR(100),
        address TEXT,
        status VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        distance_to_pole DECIMAL(10, 2),
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, drop_number)
      )
    `;
    
    // SOW Fibre table
    await sql`
      CREATE TABLE IF NOT EXISTS sow_fibre (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        segment_id VARCHAR(100) NOT NULL,
        from_point VARCHAR(100),
        to_point VARCHAR(100),
        distance DECIMAL(10, 2),
        fibre_type VARCHAR(100),
        contractor VARCHAR(255),
        completed VARCHAR(50),
        date_completed DATE,
        pon_no VARCHAR(50),
        zone_no VARCHAR(50),
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, segment_id)
      )
    `;
    
    console.log('✓ Tables ready');
  } catch (error) {
    console.error('ERROR creating tables:', error.message);
    process.exit(1);
  }
}

// Parse Excel file
function parseExcelFile(filePath) {
  console.log(`\nParsing ${path.basename(filePath)}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (data.length === 0) {
    console.warn('WARNING: No data found in file');
    return { headers: [], rows: [] };
  }
  
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const rows = data.slice(1).filter(row => row.some(cell => cell !== ''));
  
  console.log(`✓ Found ${rows.length} data rows`);
  console.log(`  Headers: ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`);
  
  return { headers, rows };
}

// Import poles
async function importPoles(filePath) {
  const { headers, rows } = parseExcelFile(filePath);
  if (rows.length === 0) return 0;
  
  console.log('\nImporting poles...');
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    
    // Extract pole data (adjust field names based on actual Excel)
    const poleNumber = obj.label_1 || obj.label || obj.pole_number || obj['pole number'] || '';
    
    if (!poleNumber) {
      skipped++;
      continue;
    }
    
    try {
      await sql`
        INSERT INTO sow_poles (
          project_id, pole_number, status, latitude, longitude, 
          pon_no, zone_no, created_date
        ) VALUES (
          ${projectId}, ${poleNumber}, ${obj.status || 'Unknown'}, 
          ${parseFloat(obj.latitude) || null}, ${parseFloat(obj.longitude) || null},
          ${obj.pon_no || ''}, ${obj.zone_no || ''}, ${obj.created_date || null}
        )
        ON CONFLICT (project_id, pole_number) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          imported_at = CURRENT_TIMESTAMP
      `;
      imported++;
    } catch (error) {
      console.error(`ERROR importing pole ${poleNumber}:`, error.message);
    }
  }
  
  console.log(`✓ Imported ${imported} poles (skipped ${skipped})`);
  return imported;
}

// Import drops
async function importDrops(filePath) {
  const { headers, rows } = parseExcelFile(filePath);
  if (rows.length === 0) return 0;
  
  console.log('\nImporting drops...');
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    
    // Extract drop data
    const dropNumber = obj.label || obj.drop_number || obj.drop_id || '';
    const poleRef = obj.strtfeat || obj.endfeat || obj.pole_number || '';
    
    if (!dropNumber) {
      skipped++;
      continue;
    }
    
    // Extract distance from dim2 field
    let distance = 0;
    if (obj.dim2) {
      const match = String(obj.dim2).match(/(\d+(?:\.\d+)?)/);
      if (match) {
        distance = parseFloat(match[1]);
      }
    }
    
    try {
      await sql`
        INSERT INTO sow_drops (
          project_id, drop_number, pole_number, premises_id, 
          address, status, latitude, longitude, distance_to_pole
        ) VALUES (
          ${projectId}, ${dropNumber}, ${poleRef}, ${obj.premises_id || ''},
          ${obj.strtfeat || obj.address || ''}, ${obj.type || obj.status || 'Home Sign Up'},
          ${parseFloat(obj.latitude) || null}, ${parseFloat(obj.longitude) || null},
          ${distance}
        )
        ON CONFLICT (project_id, drop_number) 
        DO UPDATE SET 
          pole_number = EXCLUDED.pole_number,
          address = EXCLUDED.address,
          status = EXCLUDED.status,
          distance_to_pole = EXCLUDED.distance_to_pole,
          imported_at = CURRENT_TIMESTAMP
      `;
      imported++;
    } catch (error) {
      console.error(`ERROR importing drop ${dropNumber}:`, error.message);
    }
  }
  
  console.log(`✓ Imported ${imported} drops (skipped ${skipped})`);
  return imported;
}

// Import fibre
async function importFibre(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.log('\nSkipping fibre import (no file provided)');
    return 0;
  }
  
  const { headers, rows } = parseExcelFile(filePath);
  if (rows.length === 0) return 0;
  
  console.log('\nImporting fibre segments...');
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    
    // Extract fibre data
    const segmentId = obj.label || obj.segment_id || '';
    
    if (!segmentId) {
      skipped++;
      continue;
    }
    
    const cableSize = obj['cable size'] || obj.cable_size || '';
    const fibreType = cableSize ? `${cableSize} Core` : (obj.fibre_type || 'Unknown');
    
    try {
      await sql`
        INSERT INTO sow_fibre (
          project_id, segment_id, from_point, to_point, 
          distance, fibre_type, contractor, completed, 
          date_completed, pon_no, zone_no
        ) VALUES (
          ${projectId}, ${segmentId}, ${obj.from_point || 'Start'}, ${obj.to_point || 'End'},
          ${parseFloat(obj.length) || 0}, ${fibreType}, ${obj.contractor || ''},
          ${obj.complete || ''}, ${obj['date comp'] || null},
          ${obj.pon_no || ''}, ${obj.zone_no || ''}
        )
        ON CONFLICT (project_id, segment_id) 
        DO UPDATE SET 
          distance = EXCLUDED.distance,
          fibre_type = EXCLUDED.fibre_type,
          contractor = EXCLUDED.contractor,
          imported_at = CURRENT_TIMESTAMP
      `;
      imported++;
    } catch (error) {
      console.error(`ERROR importing fibre ${segmentId}:`, error.message);
    }
  }
  
  console.log(`✓ Imported ${imported} fibre segments (skipped ${skipped})`);
  return imported;
}

// Generate summary
async function generateSummary() {
  console.log('\n=== Import Summary ===');
  
  try {
    const poleSummary = await sql`
      SELECT COUNT(*) as count 
      FROM sow_poles 
      WHERE project_id = ${projectId}
    `;
    
    const dropSummary = await sql`
      SELECT COUNT(*) as count 
      FROM sow_drops 
      WHERE project_id = ${projectId}
    `;
    
    const fibreSummary = await sql`
      SELECT COUNT(*) as count 
      FROM sow_fibre 
      WHERE project_id = ${projectId}
    `;
    
    console.log(`Total poles in database: ${poleSummary[0].count}`);
    console.log(`Total drops in database: ${dropSummary[0].count}`);
    console.log(`Total fibre segments in database: ${fibreSummary[0].count}`);
    
    // Check for drops without poles
    const orphanDrops = await sql`
      SELECT COUNT(*) as count 
      FROM sow_drops d
      WHERE d.project_id = ${projectId}
      AND d.pole_number IS NOT NULL 
      AND d.pole_number != ''
      AND NOT EXISTS (
        SELECT 1 FROM sow_poles p 
        WHERE p.project_id = d.project_id 
        AND p.pole_number = d.pole_number
      )
    `;
    
    if (orphanDrops[0].count > 0) {
      console.warn(`\nWARNING: ${orphanDrops[0].count} drops reference non-existent poles`);
    }
    
  } catch (error) {
    console.error('ERROR generating summary:', error.message);
  }
}

// Main execution
async function main() {
  try {
    // Test connection
    console.log('Testing Neon connection...');
    const test = await sql`SELECT NOW() as time`;
    console.log(`✓ Connected to Neon at ${test[0].time}`);
    
    // Create tables
    await createTables();
    
    // Import data
    await importPoles(polesFile);
    await importDrops(dropsFile);
    if (fibreFile) {
      await importFibre(fibreFile);
    }
    
    // Generate summary
    await generateSummary();
    
    console.log('\n✓ Import completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run the import
main();