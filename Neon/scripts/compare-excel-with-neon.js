#!/usr/bin/env node

/**
 * Compare Excel file with Neon database to see what changes exist
 */

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool',
  ssl: { rejectUnauthorized: false }
};

async function compareExcelWithNeon(filePath) {
  const client = new Client(NEON_CONFIG);
  const filename = path.basename(filePath);
  
  let comparison = {
    total: 0,
    identical: 0,
    statusChanged: 0,
    newRecords: 0,
    missingInExcel: 0,
    changes: []
  };
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    console.log('🔍 COMPARISON: EXCEL vs NEON DATABASE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`File: ${filename}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    comparison.total = excelData.length;
    console.log(`📊 Excel file contains ${excelData.length} rows\n`);
    
    // Get existing data from Neon
    console.log('📥 Loading data from Neon...');
    const neonQuery = `SELECT property_id, status, pole_number, agent_name FROM status_changes`;
    const neonResult = await client.query(neonQuery);
    const neonMap = new Map();
    neonResult.rows.forEach(row => {
      neonMap.set(row.property_id, {
        status: row.status,
        pole_number: row.pole_number,
        agent_name: row.agent_name
      });
    });
    console.log(`   Found ${neonMap.size} records in Neon\n`);
    
    console.log('🔄 Comparing records...\n');
    
    // Compare each Excel row with Neon
    for (let i = 0; i < excelData.length; i++) {
      const excelRow = excelData[i];
      const propertyId = String(excelRow['Property ID']);
      
      if (!propertyId) continue;
      
      const neonRecord = neonMap.get(propertyId);
      
      if (!neonRecord) {
        // New record
        comparison.newRecords++;
        if (comparison.changes.length < 20) {
          comparison.changes.push({
            type: 'NEW',
            property_id: propertyId,
            excel_status: excelRow['Status'],
            excel_pole: excelRow['Pole Number']
          });
        }
      } else {
        // Compare status
        const excelStatus = excelRow['Status'];
        const neonStatus = neonRecord.status;
        
        if (excelStatus !== neonStatus) {
          comparison.statusChanged++;
          if (comparison.changes.length < 20) {
            comparison.changes.push({
              type: 'STATUS_CHANGE',
              property_id: propertyId,
              pole_number: excelRow['Pole Number'] || neonRecord.pole_number,
              neon_status: neonStatus,
              excel_status: excelStatus
            });
          }
        } else {
          comparison.identical++;
        }
      }
    }
    
    // Check for records in Neon that aren't in Excel
    const excelPropertyIds = new Set(excelData.map(row => String(row['Property ID'])).filter(id => id));
    neonMap.forEach((record, propertyId) => {
      if (!excelPropertyIds.has(propertyId)) {
        comparison.missingInExcel++;
      }
    });
    
    // Results
    console.log('📊 COMPARISON RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Excel Records: ${comparison.total}`);
    console.log(`Identical Records: ${comparison.identical}`);
    console.log(`Status Changes: ${comparison.statusChanged}`);
    console.log(`New Records: ${comparison.newRecords}`);
    console.log(`Missing in Excel: ${comparison.missingInExcel}`);
    
    if (comparison.changes.length > 0) {
      console.log('\n📋 Sample Changes (first 20):');
      console.log('─────────────────────────────────────────────────────────────');
      comparison.changes.forEach(change => {
        switch (change.type) {
          case 'NEW':
            console.log(`🆕 NEW: Property ${change.property_id}`);
            console.log(`    Status: ${change.excel_status}`);
            console.log(`    Pole: ${change.excel_pole || '[No Pole]'}\n`);
            break;
          case 'STATUS_CHANGE':
            console.log(`📝 STATUS CHANGE: Property ${change.property_id}`);
            console.log(`    Pole: ${change.pole_number || '[No Pole]'}`);
            console.log(`    Neon: ${change.neon_status || '[No Status]'}`);
            console.log(`    Excel: ${change.excel_status || '[No Status]'}\n`);
            break;
        }
      });
      
      if (comparison.statusChanged + comparison.newRecords > 20) {
        console.log(`... and ${(comparison.statusChanged + comparison.newRecords) - 20} more changes`);
      }
    }
    
    console.log('\n🎯 RECOMMENDATION:');
    if (comparison.statusChanged === 0 && comparison.newRecords === 0) {
      console.log('✅ No changes detected - Excel data is identical to Neon');
    } else if (comparison.statusChanged + comparison.newRecords < 100) {
      console.log(`📝 Small changes detected (${comparison.statusChanged + comparison.newRecords} total) - Safe to import`);
    } else {
      console.log(`⚠️  Large changes detected (${comparison.statusChanged + comparison.newRecords} total) - Review carefully before import`);
    }
    
    return comparison;
    
  } catch (error) {
    console.error('❌ Comparison failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node compare-excel-with-neon.js <excel-file-path>');
    console.log('\nExample:');
    console.log('  node compare-excel-with-neon.js /home/ldp/Downloads/Lawley_11082025.xlsx');
    return;
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  
  try {
    await compareExcelWithNeon(filePath);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}