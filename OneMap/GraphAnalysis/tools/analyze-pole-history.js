#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

async function analyzePoleHistory(poleNumber) {
  try {
    // Read master CSV
    const csvPath = path.join(__dirname, '../data/master/master_csv_latest_validated.csv');
    const content = await fs.readFile(csvPath, 'utf-8');
    
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      relax_quotes: true,
      relax_column_count: true
    });

    // Filter for this pole
    const poleRecords = records.filter(r => r['Pole Number'] === poleNumber);
    
    if (poleRecords.length === 0) {
      console.log(`No records found for pole: ${poleNumber}`);
      return;
    }

    console.log(`\n=== POLE ${poleNumber} COMPLETE HISTORY ===\n`);
    console.log(`Total records found: ${poleRecords.length}`);

    // Extract and analyze dates
    const dateEvents = [];
    
    poleRecords.forEach(record => {
      // Add first seen date
      if (record._first_seen_date) {
        dateEvents.push({
          date: record._first_seen_date,
          type: 'First Seen',
          record: record
        });
      }
      
      // Add status change date if different
      if (record.date_status_changed && record.date_status_changed !== record._first_seen_date) {
        dateEvents.push({
          date: record.date_status_changed,
          type: 'Status Changed',
          record: record
        });
      }
    });

    // Sort by date
    dateEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Show first appearance
    const firstDate = dateEvents[0]?.date;
    const lastDate = dateEvents[dateEvents.length - 1]?.date;
    
    console.log(`\nFirst appeared: ${firstDate}`);
    console.log(`Last update: ${lastDate}`);
    
    // Calculate days between first and last
    if (firstDate && lastDate) {
      const days = Math.floor((new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24));
      console.log(`Time span: ${days} days`);
    }

    // Show timeline
    console.log('\n=== CHRONOLOGICAL TIMELINE ===');
    
    let lastStatus = '';
    dateEvents.forEach(event => {
      const r = event.record;
      console.log(`\n${event.date} (${event.type}):`);
      console.log(`  Drop: ${r['Drop Number'] || 'N/A'}`);
      console.log(`  Status: ${r.Status}`);
      
      if (r.Status !== lastStatus) {
        console.log(`  ** Status changed from: ${lastStatus || 'N/A'} → ${r.Status}`);
        lastStatus = r.Status;
      }
      
      console.log(`  Workflow: ${r['Flow Name Groups'] || 'N/A'}`);
      console.log(`  Property: ${r['Property ID']}`);
      console.log(`  Agent: ${r['Field Agent Name (pole permission)'] || r['Field Agent Name (Home Sign Ups)'] || r['Field Agent Name & Surname(sales)'] || 'Unknown'}`);
    });

    // Analyze drops
    console.log('\n=== CONNECTED DROPS ANALYSIS ===');
    
    const dropMap = new Map();
    poleRecords.forEach(r => {
      const drop = r['Drop Number'];
      if (drop && !dropMap.has(drop)) {
        dropMap.set(drop, {
          firstSeen: r._first_seen_date,
          lastSeen: r.date_status_changed || r._first_seen_date,
          statuses: new Set(),
          properties: new Set(),
          records: []
        });
      }
      
      if (drop) {
        const dropData = dropMap.get(drop);
        dropData.statuses.add(r.Status);
        dropData.properties.add(r['Property ID']);
        dropData.records.push(r);
        
        // Update dates
        const recordDate = r.date_status_changed || r._first_seen_date;
        if (new Date(recordDate) < new Date(dropData.firstSeen)) {
          dropData.firstSeen = recordDate;
        }
        if (new Date(recordDate) > new Date(dropData.lastSeen)) {
          dropData.lastSeen = recordDate;
        }
      }
    });

    console.log(`\nTotal connected drops: ${dropMap.size}`);
    
    dropMap.forEach((data, drop) => {
      console.log(`\nDrop ${drop}:`);
      console.log(`  First seen: ${data.firstSeen}`);
      console.log(`  Last seen: ${data.lastSeen}`);
      console.log(`  Properties: ${data.properties.size}`);
      console.log(`  Status history: ${Array.from(data.statuses).join(' → ')}`);
    });

    // Status progression summary
    console.log('\n=== STATUS PROGRESSION SUMMARY ===');
    
    const statusChanges = [];
    let currentStatus = null;
    
    dateEvents.forEach(event => {
      if (event.record.Status !== currentStatus) {
        statusChanges.push({
          date: event.date,
          from: currentStatus,
          to: event.record.Status,
          drop: event.record['Drop Number']
        });
        currentStatus = event.record.Status;
      }
    });

    statusChanges.forEach((change, idx) => {
      if (idx === 0) {
        console.log(`\n${change.date}: Initial status → "${change.to}"`);
      } else {
        console.log(`\n${change.date}: "${change.from}" → "${change.to}"`);
      }
      console.log(`  Drop involved: ${change.drop || 'N/A'}`);
    });

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Pole ${poleNumber} was:`);
    console.log(`- First recorded on ${firstDate}`);
    console.log(`- Last updated on ${lastDate}`);
    console.log(`- Associated with ${dropMap.size} drops`);
    console.log(`- Had ${statusChanges.length} status changes`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const poleNumber = process.argv[2];
  if (!poleNumber) {
    console.log('Usage: node analyze-pole-history.js <pole_number>');
    process.exit(1);
  }
  analyzePoleHistory(poleNumber);
}

module.exports = { analyzePoleHistory };