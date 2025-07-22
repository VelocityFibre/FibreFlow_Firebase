#!/usr/bin/env node

/**
 * Quick Corruption Status Check
 * Analyzes the current master CSV for corruption patterns
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream } = require('fs');

async function checkCorruption() {
  const masterPath = path.join(__dirname, '../data/master/master_csv_latest.csv');
  
  console.log('🔍 Checking Master CSV for Corruption Patterns\n');
  console.log('File:', masterPath);
  console.log('\nAnalyzing...\n');
  
  const issues = {
    poleWithDate: [],
    addressWithGPS: [],
    gpsWithText: [],
    longText: [],
    shiftedData: []
  };
  
  let totalRecords = 0;
  
  return new Promise((resolve, reject) => {
    createReadStream(masterPath)
      .pipe(csv.parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (record) => {
        totalRecords++;
        const propertyId = record['Property ID'] || Object.values(record)[0];
        
        // Check Pole Number for dates
        if (record['Pole Number']) {
          const value = record['Pole Number'];
          if (/\d{4}[-\/]\d{2}[-\/]\d{2}/.test(value) || /^\d{2}:\d{2}/.test(value)) {
            issues.poleWithDate.push({
              propertyId,
              value: value.substring(0, 50)
            });
          }
        }
        
        // Check Address for GPS
        if (record['Location Address']) {
          const value = record['Location Address'];
          if (/\[?-?\d+\.\d{10,}/.test(value)) {
            issues.addressWithGPS.push({
              propertyId,
              value: value.substring(0, 50)
            });
          }
        }
        
        // Check GPS fields for text
        ['Latitude', 'Longitude'].forEach(field => {
          if (record[field]) {
            const value = record[field];
            if (value.length > 20 || /[a-zA-Z]{5,}/.test(value)) {
              issues.gpsWithText.push({
                propertyId,
                field,
                value: value.substring(0, 50)
              });
            }
          }
        });
        
        // Check for extremely long text (consent forms in wrong fields)
        Object.entries(record).forEach(([field, value]) => {
          if (value && value.length > 500 && !field.includes('CONSENT')) {
            issues.longText.push({
              propertyId,
              field,
              length: value.length
            });
          }
        });
        
        // Check for obvious shifted data
        if (record['Owner or Tenant'] && /^-?\d+\.\d+$/.test(record['Owner or Tenant'])) {
          issues.shiftedData.push({
            propertyId,
            example: 'Owner field contains GPS coordinate'
          });
        }
      })
      .on('end', () => {
        console.log('📊 Analysis Complete\n');
        console.log(`Total Records: ${totalRecords}\n`);
        
        console.log('⚠️  Corruption Issues Found:\n');
        
        console.log(`1. Pole Numbers with Dates: ${issues.poleWithDate.length}`);
        if (issues.poleWithDate.length > 0) {
          issues.poleWithDate.slice(0, 3).forEach(issue => {
            console.log(`   - Property ${issue.propertyId}: "${issue.value}"`);
          });
          if (issues.poleWithDate.length > 3) {
            console.log(`   ... and ${issues.poleWithDate.length - 3} more`);
          }
        }
        
        console.log(`\n2. Addresses with GPS Coordinates: ${issues.addressWithGPS.length}`);
        if (issues.addressWithGPS.length > 0) {
          issues.addressWithGPS.slice(0, 3).forEach(issue => {
            console.log(`   - Property ${issue.propertyId}: "${issue.value}..."`);
          });
          if (issues.addressWithGPS.length > 3) {
            console.log(`   ... and ${issues.addressWithGPS.length - 3} more`);
          }
        }
        
        console.log(`\n3. GPS Fields with Text: ${issues.gpsWithText.length}`);
        if (issues.gpsWithText.length > 0) {
          issues.gpsWithText.slice(0, 3).forEach(issue => {
            console.log(`   - Property ${issue.propertyId} ${issue.field}: "${issue.value}..."`);
          });
          if (issues.gpsWithText.length > 3) {
            console.log(`   ... and ${issues.gpsWithText.length - 3} more`);
          }
        }
        
        console.log(`\n4. Fields with Extremely Long Text: ${issues.longText.length}`);
        if (issues.longText.length > 0) {
          issues.longText.slice(0, 3).forEach(issue => {
            console.log(`   - Property ${issue.propertyId} ${issue.field}: ${issue.length} characters`);
          });
        }
        
        console.log(`\n5. Obvious Data Shifting: ${issues.shiftedData.length}`);
        
        const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
        const percentCorrupted = ((totalIssues / totalRecords) * 100).toFixed(2);
        
        console.log('\n📈 Summary:');
        console.log(`   - Total corruption issues: ${totalIssues}`);
        console.log(`   - Affected records: ~${percentCorrupted}%`);
        
        if (totalIssues > 100) {
          console.log('\n🚨 RECOMMENDATION: Run validation to clean the data!');
          console.log('   ./CREATE_MASTER_CSV_VALIDATED.sh');
        } else if (totalIssues > 0) {
          console.log('\n⚠️  Some corruption detected. Consider running validation.');
        } else {
          console.log('\n✅ No corruption patterns detected!');
        }
        
        resolve();
      })
      .on('error', reject);
  });
}

checkCorruption().catch(console.error);