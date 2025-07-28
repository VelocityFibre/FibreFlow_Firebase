#!/usr/bin/env node

/**
 * Detect changes between May 22 and May 23 data
 * Compares records in vf-onemap-data to find what changed
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Parse CSV to get May 23 data
async function parseMay23CSV() {
  const csvPath = path.join(__dirname, '../downloads/Lawley May Week 3 23052025.csv');
  const records = new Map();
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = null;
    let lineNumber = 0;

    rl.on('line', (line) => {
      lineNumber++;
      
      // Skip BOM if present
      if (lineNumber === 1 && line.charCodeAt(0) === 0xFEFF) {
        line = line.substr(1);
      }
      
      if (!headers) {
        headers = line.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        return;
      }

      const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length !== headers.length) return;

      const propertyIdIndex = headers.indexOf('Property ID');
      const statusIndex = headers.indexOf('Status');
      const poleIndex = headers.indexOf('Pole Number');
      const agentIndex = headers.indexOf('Field Agent Name (pole permission)');
      const lastModIndex = headers.indexOf('Last Modified Pole Permissions Date');
      
      const propertyId = values[propertyIdIndex];
      
      if (propertyId) {
        records.set(propertyId, {
          propertyId,
          status: values[statusIndex] || '',
          poleNumber: values[poleIndex] || '',
          fieldAgentName: values[agentIndex] || '',
          lastModifiedDate: values[lastModIndex] || ''
        });
      }
    });

    rl.on('close', () => resolve(records));
    rl.on('error', reject);
  });
}

// Parse May 22 CSV
async function parseMay22CSV() {
  const csvPath = path.join(__dirname, '../downloads/Lawley May Week 3 22052025 - First Report.csv');
  const records = new Map();
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = null;
    let lineNumber = 0;

    rl.on('line', (line) => {
      lineNumber++;
      
      if (lineNumber === 1 && line.charCodeAt(0) === 0xFEFF) {
        line = line.substr(1);
      }
      
      if (!headers) {
        headers = line.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        return;
      }

      const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length !== headers.length) return;

      const propertyIdIndex = headers.indexOf('Property ID');
      const statusIndex = headers.indexOf('Status');
      const poleIndex = headers.indexOf('Pole Number');
      const agentIndex = headers.indexOf('Field Agent Name (pole permission)');
      const lastModIndex = headers.indexOf('Last Modified Pole Permissions Date');
      
      const propertyId = values[propertyIdIndex];
      
      if (propertyId) {
        records.set(propertyId, {
          propertyId,
          status: values[statusIndex] || '',
          poleNumber: values[poleIndex] || '',
          fieldAgentName: values[agentIndex] || '',
          lastModifiedDate: values[lastModIndex] || ''
        });
      }
    });

    rl.on('close', () => resolve(records));
    rl.on('error', reject);
  });
}

async function detectChanges() {
  try {
    console.log('🔍 Detecting changes between May 22 and May 23...\n');
    
    // Parse both CSVs
    console.log('📄 Parsing CSV files...');
    const [may22Records, may23Records] = await Promise.all([
      parseMay22CSV(),
      parseMay23CSV()
    ]);
    
    console.log(`📊 May 22: ${may22Records.size} records`);
    console.log(`📊 May 23: ${may23Records.size} records\n`);
    
    // Find new records
    const newRecords = [];
    const changedRecords = [];
    const deletedRecords = [];
    
    // Check for new and changed records
    for (const [propertyId, may23Record] of may23Records) {
      const may22Record = may22Records.get(propertyId);
      
      if (!may22Record) {
        newRecords.push(may23Record);
      } else {
        // Check for changes
        const changes = [];
        
        if (may22Record.status !== may23Record.status) {
          changes.push({
            field: 'status',
            oldValue: may22Record.status,
            newValue: may23Record.status
          });
        }
        
        if (may22Record.poleNumber !== may23Record.poleNumber) {
          changes.push({
            field: 'poleNumber',
            oldValue: may22Record.poleNumber,
            newValue: may23Record.poleNumber
          });
        }
        
        if (may22Record.fieldAgentName !== may23Record.fieldAgentName) {
          changes.push({
            field: 'fieldAgentName',
            oldValue: may22Record.fieldAgentName,
            newValue: may23Record.fieldAgentName
          });
        }
        
        if (changes.length > 0) {
          changedRecords.push({
            propertyId,
            changes,
            record: may23Record
          });
        }
      }
    }
    
    // Check for deleted records
    for (const [propertyId, may22Record] of may22Records) {
      if (!may23Records.has(propertyId)) {
        deletedRecords.push(may22Record);
      }
    }
    
    // Generate report
    console.log('📋 CHANGE DETECTION REPORT');
    console.log('========================\n');
    
    console.log(`✨ NEW RECORDS: ${newRecords.length}`);
    if (newRecords.length > 0) {
      console.log('\nFirst 10 new records:');
      newRecords.slice(0, 10).forEach(record => {
        console.log(`- Property ${record.propertyId}: ${record.status || 'No status'} (${record.poleNumber || 'No pole'})`);
      });
    }
    
    console.log(`\n🔄 CHANGED RECORDS: ${changedRecords.length}`);
    if (changedRecords.length > 0) {
      console.log('\nFirst 10 changed records:');
      changedRecords.slice(0, 10).forEach(({propertyId, changes, record}) => {
        console.log(`\n- Property ${propertyId}:`);
        changes.forEach(change => {
          console.log(`  ${change.field}: "${change.oldValue}" → "${change.newValue}"`);
        });
      });
    }
    
    console.log(`\n❌ DELETED RECORDS: ${deletedRecords.length}`);
    if (deletedRecords.length > 0) {
      console.log('\nFirst 10 deleted records:');
      deletedRecords.slice(0, 10).forEach(record => {
        console.log(`- Property ${record.propertyId}: ${record.status || 'No status'}`);
      });
    }
    
    // Summary by change type
    if (changedRecords.length > 0) {
      const changeTypes = {};
      changedRecords.forEach(({changes}) => {
        changes.forEach(change => {
          changeTypes[change.field] = (changeTypes[change.field] || 0) + 1;
        });
      });
      
      console.log('\n📊 CHANGES BY TYPE:');
      Object.entries(changeTypes).forEach(([field, count]) => {
        console.log(`- ${field}: ${count} changes`);
      });
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../reports', `change-detection-${Date.now()}.json`);
    const report = {
      summary: {
        date: new Date().toISOString(),
        may22Records: may22Records.size,
        may23Records: may23Records.size,
        newRecords: newRecords.length,
        changedRecords: changedRecords.length,
        deletedRecords: deletedRecords.length
      },
      newRecords,
      changedRecords,
      deletedRecords
    };
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

detectChanges();