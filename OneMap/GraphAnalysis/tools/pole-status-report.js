#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

async function generatePoleReport(poleNumber) {
  try {
    console.log(`\n📊 Generating Report for Pole: ${poleNumber}`);
    console.log('='.repeat(60));

    // Read the master CSV
    const masterCsvPath = path.join(__dirname, '../data/master/master_csv_latest_validated.csv');
    const csvContent = await fs.readFile(masterCsvPath, 'utf-8');
    
    // Parse CSV
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      relax_quotes: true,
      relax_column_count: true
    });

    // Filter records for this pole
    const poleRecords = records.filter(r => r['Pole Number'] === poleNumber);
    
    if (poleRecords.length === 0) {
      console.log(`❌ No records found for pole number: ${poleNumber}`);
      console.log('\nAvailable pole numbers (first 20):');
      const uniquePoles = [...new Set(records.map(r => r['Pole Number']).filter(p => p))].slice(0, 20);
      uniquePoles.forEach(p => console.log(`  - ${p}`));
      return;
    }

    console.log(`\n✅ Found ${poleRecords.length} records for pole ${poleNumber}\n`);

    // Get unique addresses
    const addresses = [...new Set(poleRecords.map(r => r['Location Address']))];
    console.log('📍 Addresses:');
    addresses.forEach(addr => console.log(`  - ${addr}`));

    // Get unique drops
    const drops = [...new Set(poleRecords.map(r => r['Drop Number']).filter(d => d))];
    console.log(`\n💧 Connected Drops (${drops.length}):`);
    drops.forEach(drop => console.log(`  - ${drop}`));

    // Status timeline
    console.log('\n📅 Status Timeline:');
    
    // Group by property ID to track individual property statuses
    const propertiesMap = new Map();
    
    poleRecords.forEach(record => {
      const propId = record['Property ID'];
      if (!propertiesMap.has(propId)) {
        propertiesMap.set(propId, []);
      }
      propertiesMap.get(propId).push(record);
    });

    // Track all status changes
    const statusChanges = [];
    
    for (const [propId, propRecords] of propertiesMap) {
      // Get the status change date and first seen date
      propRecords.forEach(record => {
        const statusDate = record['date_status_changed'] || record['_first_seen_date'];
        const status = record['Status'];
        const flowName = record['Flow Name Groups'];
        
        if (statusDate && status) {
          statusChanges.push({
            date: statusDate,
            propertyId: propId,
            status: status,
            flowName: flowName,
            address: record['Location Address'],
            drop: record['Drop Number'],
            agent: record['Field Agent Name (pole permission)'] || 
                   record['Field Agent Name (Home Sign Ups)'] || 
                   record['Field Agent Name & Surname(sales)'] || 
                   'Unknown'
          });
        }
      });
    }

    // Sort by date
    statusChanges.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Display timeline
    statusChanges.forEach(change => {
      console.log(`\n  ${change.date}:`);
      console.log(`    Property: ${change.propertyId}`);
      console.log(`    Status: ${change.status}`);
      console.log(`    Drop: ${change.drop || 'N/A'}`);
      console.log(`    Agent: ${change.agent}`);
      if (change.flowName) {
        console.log(`    Workflow: ${change.flowName}`);
      }
    });

    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log(`  - Total Properties: ${propertiesMap.size}`);
    console.log(`  - Total Drops: ${drops.length}`);
    console.log(`  - Total Addresses: ${addresses.length}`);
    
    // Status distribution
    const statusCounts = {};
    poleRecords.forEach(r => {
      const status = r['Status'] || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\n📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    // GPS Coordinates (if available)
    const gpsCoords = poleRecords
      .map(r => ({
        lat: r['Actual Device Location (Latitude)'] || r['Latitude'],
        lng: r['Actual Device Location (Longitude)'] || r['Longitude']
      }))
      .filter(coord => coord.lat && coord.lng);
    
    if (gpsCoords.length > 0) {
      console.log('\n🗺️  GPS Coordinates:');
      const uniqueCoords = Array.from(new Set(gpsCoords.map(c => `${c.lat},${c.lng}`)));
      uniqueCoords.forEach(coord => {
        console.log(`  - ${coord}`);
      });
    }

    // Field agents involved
    const agents = new Set();
    poleRecords.forEach(r => {
      const agentFields = [
        'Field Agent Name (pole permission)',
        'Field Agent Name (Home Sign Ups)',
        'Field Agent Name & Surname(sales)',
        'Installer Name'
      ];
      
      agentFields.forEach(field => {
        if (r[field]) agents.add(r[field]);
      });
    });
    
    if (agents.size > 0) {
      console.log('\n👥 Field Agents Involved:');
      agents.forEach(agent => console.log(`  - ${agent}`));
    }

    // Export detailed report
    const reportPath = path.join(__dirname, `../reports/pole_report_${poleNumber.replace(/\./g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    
    const detailedReport = {
      poleNumber,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRecords: poleRecords.length,
        totalProperties: propertiesMap.size,
        totalDrops: drops.length,
        addresses: addresses,
        statusCounts
      },
      timeline: statusChanges,
      rawRecords: poleRecords
    };
    
    await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

// Main execution
const poleNumber = process.argv[2];

if (!poleNumber) {
  console.log('Usage: node pole-status-report.js <pole_number>');
  console.log('Example: node pole-status-report.js LAW.P.C132');
  process.exit(1);
}

generatePoleReport(poleNumber);