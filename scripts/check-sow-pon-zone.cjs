#!/usr/bin/env node

/**
 * Check SOW PON and Zone data in Neon database
 */

const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.NEON_CONNECTION_STRING;
if (!connectionString) {
  console.error('ERROR: NEON_CONNECTION_STRING not found in .env.local');
  process.exit(1);
}

const sql = neon(connectionString);

async function checkSOWData() {
  console.log('=== Checking SOW PON and Zone Data ===\n');
  
  try {
    // Check poles with PON/Zone data
    console.log('1. Checking SOW Poles:');
    const polesWithData = await sql`
      SELECT 
        COUNT(*) as total_poles,
        COUNT(CASE WHEN pon_no IS NOT NULL AND pon_no != '' THEN 1 END) as poles_with_pon,
        COUNT(CASE WHEN zone_no IS NOT NULL AND zone_no != '' THEN 1 END) as poles_with_zone,
        COUNT(CASE WHEN (pon_no IS NOT NULL AND pon_no != '') AND (zone_no IS NOT NULL AND zone_no != '') THEN 1 END) as poles_with_both
      FROM sow_poles
    `;
    console.log(polesWithData[0]);
    
    // Sample some poles with PON/Zone
    console.log('\n2. Sample poles with PON/Zone data:');
    const samplePoles = await sql`
      SELECT pole_number, pon_no, zone_no, status
      FROM sow_poles
      WHERE (pon_no IS NOT NULL AND pon_no != '') 
         OR (zone_no IS NOT NULL AND zone_no != '')
      LIMIT 10
    `;
    
    if (samplePoles.length > 0) {
      console.table(samplePoles);
    } else {
      console.log('No poles found with PON or Zone data');
    }
    
    // Check unique PON/Zone values
    console.log('\n3. Unique PON values:');
    const uniquePONs = await sql`
      SELECT DISTINCT pon_no, COUNT(*) as count
      FROM sow_poles
      WHERE pon_no IS NOT NULL AND pon_no != ''
      GROUP BY pon_no
      ORDER BY pon_no
    `;
    
    if (uniquePONs.length > 0) {
      console.table(uniquePONs);
    } else {
      console.log('No PON values found');
    }
    
    console.log('\n4. Unique Zone values:');
    const uniqueZones = await sql`
      SELECT DISTINCT zone_no, COUNT(*) as count
      FROM sow_poles
      WHERE zone_no IS NOT NULL AND zone_no != ''
      GROUP BY zone_no
      ORDER BY zone_no
    `;
    
    if (uniqueZones.length > 0) {
      console.table(uniqueZones);
    } else {
      console.log('No Zone values found');
    }
    
    // Check fibre table too
    console.log('\n5. Checking SOW Fibre:');
    const fibreWithData = await sql`
      SELECT 
        COUNT(*) as total_fibre,
        COUNT(CASE WHEN pon_no IS NOT NULL AND pon_no != '' THEN 1 END) as fibre_with_pon,
        COUNT(CASE WHEN zone_no IS NOT NULL AND zone_no != '' THEN 1 END) as fibre_with_zone
      FROM sow_fibre
    `;
    console.log(fibreWithData[0]);
    
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

checkSOWData();