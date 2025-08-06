#!/usr/bin/env node

const fs = require('fs').promises;
const csv = require('csv-parse/sync');

async function debugSpecificPole() {
  const csvPath = '/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/master/master_csv_latest.csv';
  
  try {
    console.log('🔍 Debugging specific records for LAW.P.C654...\n');
    
    const content = await fs.readFile(csvPath, 'utf-8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Find all records containing LAW.P.C654 anywhere
    const matchingRecords = records.filter(r => 
      Object.values(r).some(val => val && val.toString().includes('LAW.P.C654'))
    );
    
    console.log(`Found ${matchingRecords.length} records containing LAW.P.C654:\n`);
    
    matchingRecords.forEach((record, i) => {
      console.log(`=== Record ${i + 1} ===`);
      console.log(`Property ID: ${record['Property ID']}`);
      console.log(`Status: ${record['Status']}`);
      console.log(`Flow Name Groups: ${record['Flow Name Groups']}`);
      console.log(`Site: ${record['Site']}`);
      console.log(`Pole Number: "${record['Pole Number']}"`);
      console.log(`Drop Number: "${record['Drop Number']}"`);
      console.log(`Survey Date: "${record['Survey Date']}"`);
      console.log(`Last Modified: ${record['lst_mod_dt']}`);
      
      // Show where LAW.P.C654 appears
      Object.entries(record).forEach(([key, value]) => {
        if (value && value.toString().includes('LAW.P.C654')) {
          console.log(`*** LAW.P.C654 found in: ${key} = "${value}"`);
        }
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSpecificPole().then(() => process.exit(0)).catch(console.error);