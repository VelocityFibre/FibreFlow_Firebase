#!/usr/bin/env node

/**
 * Generate Pole Report from Firestore Data
 * Reads from onemap-processing-staging collection
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Collections
const STAGING_COLLECTION = 'onemap-processing-staging';

async function generatePoleReport(poleNumber) {
  try {
    console.log(`\n📊 Generating Report for Pole: ${poleNumber}`);
    console.log('='.repeat(60));
    console.log('📡 Data Source: Firestore (onemap-processing-staging)\n');

    // Query Firestore for pole records (without orderBy to avoid index requirement)
    const poleQuery = await db.collection(STAGING_COLLECTION)
      .where('Pole Number', '==', poleNumber)
      .get();
    
    if (poleQuery.empty) {
      console.log(`❌ No records found for pole number: ${poleNumber}`);
      
      // Show some available poles
      console.log('\nChecking for available poles in Firestore...');
      const samplePoles = await db.collection(STAGING_COLLECTION)
        .where('Pole Number', '!=', '')
        .limit(20)
        .get();
      
      const uniquePoles = new Set();
      samplePoles.forEach(doc => {
        const pole = doc.data()['Pole Number'];
        if (pole) uniquePoles.add(pole);
      });
      
      console.log('\nAvailable pole numbers (sample):');
      Array.from(uniquePoles).slice(0, 10).forEach(p => console.log(`  - ${p}`));
      return;
    }

    const poleRecords = [];
    poleQuery.forEach(doc => {
      poleRecords.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Found ${poleRecords.length} records for pole ${poleNumber}\n`);

    // Get unique addresses
    const addresses = [...new Set(poleRecords.map(r => r['Location Address']))].filter(a => a);
    console.log('📍 Addresses:');
    addresses.forEach(addr => console.log(`  - ${addr}`));

    // Get unique drops
    const drops = [...new Set(poleRecords.map(r => r['Drop Number']).filter(d => d))];
    console.log(`\n💧 Connected Drops (${drops.length}):`);
    drops.forEach(drop => console.log(`  - ${drop}`));

    // Status timeline
    console.log('\n📅 Status Timeline:');
    
    // Track all status changes
    const statusChanges = [];
    
    poleRecords.forEach(record => {
      const statusDate = record['date_status_changed'] || 
                        record['_first_seen_date'] || 
                        record['_import_timestamp']?.toDate?.()?.toISOString();
      const status = record['Status'];
      const flowName = record['Flow Name Groups'];
      
      if (statusDate && status) {
        statusChanges.push({
          date: statusDate,
          propertyId: record['Property ID'],
          status: status,
          flowName: flowName,
          address: record['Location Address'],
          drop: record['Drop Number'],
          agent: record['Field Agent Name (pole permission)'] || 
                 record['Field Agent Name (Home Sign Ups)'] || 
                 record['Field Agent Name & Surname(sales)'] || 
                 'Unknown',
          importBatch: record['import_batch_id']
        });
      }
    });

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
    console.log(`  - Total Records: ${poleRecords.length}`);
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
        if (r[field] && r[field] !== 'Unknown') agents.add(r[field]);
      });
    });
    
    if (agents.size > 0) {
      console.log('\n👥 Field Agents Involved:');
      agents.forEach(agent => console.log(`  - ${agent}`));
    }

    // Export detailed report
    const reportPath = path.join(__dirname, `../generated/pole_report_${poleNumber.replace(/\./g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    
    const detailedReport = {
      poleNumber,
      generatedAt: new Date().toISOString(),
      dataSource: 'Firestore',
      collection: STAGING_COLLECTION,
      summary: {
        totalRecords: poleRecords.length,
        totalDrops: drops.length,
        addresses: addresses,
        statusCounts
      },
      timeline: statusChanges,
      rawRecords: poleRecords.map(r => {
        // Remove Firestore-specific fields for cleaner export
        const cleaned = { ...r };
        delete cleaned._import_timestamp;
        delete cleaned._processing_timestamp;
        return cleaned;
      })
    };
    
    await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Show data freshness
    console.log('\n📅 Data Freshness:');
    const importBatches = [...new Set(poleRecords.map(r => r.import_batch_id))];
    console.log(`  - Import batches: ${importBatches.join(', ')}`);
    
    const latestImport = poleRecords
      .map(r => r._import_timestamp?.toDate?.())
      .filter(d => d)
      .sort((a, b) => b - a)[0];
    
    if (latestImport) {
      console.log(`  - Latest import: ${latestImport.toISOString()}`);
    }

  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

// Main execution
const poleNumber = process.argv[2];

if (!poleNumber) {
  console.log('Usage: node generate-pole-report-from-firestore.js <pole_number>');
  console.log('Example: node generate-pole-report-from-firestore.js LAW.P.C132');
  process.exit(1);
}

generatePoleReport(poleNumber);