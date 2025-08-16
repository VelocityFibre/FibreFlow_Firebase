#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const sql = neon(process.env.NEON_CONNECTION_STRING);

async function showSummary() {
  console.log('\n📊 SOW IMPORT SUMMARY');
  console.log('=' .repeat(60));
  
  try {
    // Get counts
    const counts = await sql`
      SELECT 
        'Poles' as type,
        COUNT(*) as imported,
        4471 as total,
        ROUND(COUNT(*) * 100.0 / 4471, 1) as percentage
      FROM sow_poles 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      UNION ALL
      SELECT 
        'Drops' as type,
        COUNT(*) as imported,
        23708 as total,
        ROUND(COUNT(*) * 100.0 / 23708, 1) as percentage
      FROM sow_drops 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      UNION ALL
      SELECT 
        'Fibre' as type,
        COUNT(*) as imported,
        686 as total,
        ROUND(COUNT(*) * 100.0 / 686, 1) as percentage
      FROM sow_fibre 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
    `;
    
    console.log('\n📈 Import Progress:');
    counts.forEach(row => {
      const bar = '█'.repeat(Math.floor(row.percentage / 5)) + '░'.repeat(20 - Math.floor(row.percentage / 5));
      console.log(`${row.type.padEnd(6)} [${bar}] ${row.imported}/${row.total} (${row.percentage}%)`);
    });
    
    // Get contractors info
    const designers = await sql`
      SELECT designer, COUNT(*) as count
      FROM sow_poles 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc' 
        AND designer IS NOT NULL
      GROUP BY designer
      ORDER BY count DESC
    `;
    
    if (designers.length > 0) {
      console.log('\n👷 Pole Designers (PlanNet):');
      designers.forEach(d => {
        console.log(`  ${d.designer}: ${d.count} poles`);
      });
    }
    
    // Get fibre contractors
    const contractors = await sql`
      SELECT contractor, COUNT(*) as count, SUM(distance) as total_distance
      FROM sow_fibre 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc' 
        AND contractor IS NOT NULL
      GROUP BY contractor
      ORDER BY count DESC
    `;
    
    if (contractors.length > 0) {
      console.log('\n🏗️ Fibre Contractors:');
      contractors.forEach(c => {
        console.log(`  ${c.contractor}: ${c.count} segments, ${Math.round(c.total_distance || 0)}m total`);
      });
    }
    
    // Sample data
    console.log('\n📍 Sample Pole Data:');
    const samplePoles = await sql`
      SELECT pole_number, status, designer, pon_no, zone_no
      FROM sow_poles 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      ORDER BY pole_number
      LIMIT 5
    `;
    
    samplePoles.forEach(p => {
      console.log(`  ${p.pole_number} - ${p.status} (Designer: ${p.designer || 'N/A'})`);
    });
    
    console.log('\n💧 Sample Drop Data:');
    const sampleDrops = await sql`
      SELECT drop_number, pole_number, premises_id, distance_to_pole
      FROM sow_drops 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      ORDER BY drop_number
      LIMIT 5
    `;
    
    sampleDrops.forEach(d => {
      console.log(`  ${d.drop_number} → ${d.pole_number} (${d.distance_to_pole}m)`);
    });
    
    console.log('\n🔌 Sample Fibre Data:');
    const sampleFibre = await sql`
      SELECT segment_id, distance, fibre_type, contractor
      FROM sow_fibre 
      WHERE project_id = 'oAigmUjSbjWHmH80AMxc'
      ORDER BY segment_id
      LIMIT 5
    `;
    
    sampleFibre.forEach(f => {
      console.log(`  ${f.segment_id} - ${f.distance}m of ${f.fibre_type} (${f.contractor || 'N/A'})`);
    });
    
    console.log('\n✅ Import Complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

showSummary();