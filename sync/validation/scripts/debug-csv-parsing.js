#!/usr/bin/env node

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

async function debugCSVParsing() {
  const csvPath = '/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/master/master_csv_latest.csv';
  
  try {
    console.log('🔍 Debugging CSV parsing for LAW.P.C654...\n');
    
    const content = await fs.readFile(csvPath, 'utf-8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📊 Total records: ${records.length}`);
    console.log(`📊 Sample headers: ${Object.keys(records[0]).slice(0, 5).join(', ')}\n`);
    
    // Look for records with LAW.P.C654
    const matchingRecords = records.filter(r => {
      const poleNumber = r['Pole Number'];
      return poleNumber && poleNumber.includes('LAW.P.C654');
    });
    
    console.log(`✅ Found ${matchingRecords.length} records matching LAW.P.C654`);
    
    if (matchingRecords.length > 0) {
      matchingRecords.forEach((record, i) => {
        console.log(`\nRecord ${i + 1}:`);
        console.log(`  Property ID: ${record['Property ID']}`);
        console.log(`  Status: ${record['Status']}`);
        console.log(`  Pole Number: "${record['Pole Number']}"`);
        console.log(`  Site: ${record['Site']}`);
      });
    } else {
      // Check if any records have the string LAW.P.C654 anywhere
      const anyMatch = records.filter(r => 
        Object.values(r).some(val => val && val.toString().includes('LAW.P.C654'))
      );
      
      console.log(`\n🔍 Records containing LAW.P.C654 anywhere: ${anyMatch.length}`);
      
      if (anyMatch.length > 0) {
        anyMatch.forEach((record, i) => {
          console.log(`\nAnywhere Match ${i + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            if (value && value.toString().includes('LAW.P.C654')) {
              console.log(`  ${key}: "${value}"`);
            }
          });
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCSVParsing().then(() => process.exit(0)).catch(console.error);