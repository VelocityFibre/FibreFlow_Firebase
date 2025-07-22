#!/usr/bin/env node

/**
 * Analyze First Instances in OneMap Data
 * 
 * This script analyzes existing data to find and report on first instances
 * of status changes for each pole, following the rule:
 * "Only count the first instance for a pole permission, pole planted, 
 * home sign up, home install status"
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const STAGING_COLLECTION = 'onemap-processing-staging';

/**
 * Normalize status text for consistent matching
 */
function normalizeStatus(status) {
  if (!status) return '';
  return status.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/permissions/g, 'permission')
    .replace(/sign ups/g, 'sign up')
    .replace(/home sign up/g, 'home signup')
    .trim();
}

/**
 * Categorize status into milestone types
 */
function categorizeStatus(normalizedStatus) {
  if (normalizedStatus.includes('pole permission') && normalizedStatus.includes('approved')) {
    return 'pole_permission_approved';
  }
  if (normalizedStatus.includes('pole planted') || 
      (normalizedStatus.includes('pole') && normalizedStatus.includes('installed'))) {
    return 'pole_planted';
  }
  if (normalizedStatus.includes('home signup') || 
      (normalizedStatus.includes('home') && normalizedStatus.includes('sign up'))) {
    return 'home_signup';
  }
  if (normalizedStatus.includes('home install') || 
      (normalizedStatus.includes('home') && normalizedStatus.includes('installation'))) {
    return 'home_install';
  }
  return 'other';
}

/**
 * Main analysis function
 */
async function analyzeFirstInstances() {
  console.log('🔍 Analyzing first instances in OneMap staging data...\n');
  
  // Get all records from staging
  const snapshot = await db.collection(STAGING_COLLECTION).get();
  console.log(`📊 Total records in staging: ${snapshot.size}\n`);
  
  // Group records by pole number
  const poleData = {};
  const recordsWithoutPoles = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const record = data.current_data;
    const poleNumber = record['Pole Number'];
    
    if (poleNumber) {
      if (!poleData[poleNumber]) {
        poleData[poleNumber] = [];
      }
      poleData[poleNumber].push({
        property_id: record['Property ID'],
        status: record['Status'],
        date_status_changed: record['date_status_changed'],
        drop_number: record['Drop Number'],
        address: record['Location Address']
      });
    } else {
      recordsWithoutPoles.push(record['Property ID']);
    }
  });
  
  console.log(`📍 Unique poles found: ${Object.keys(poleData).length}`);
  console.log(`❓ Records without pole numbers: ${recordsWithoutPoles.length}\n`);
  
  // Analyze first instances for each pole
  const firstInstances = {
    pole_permission_approved: [],
    pole_planted: [],
    home_signup: [],
    home_install: [],
    total_home_signups: 0  // Count all home signups
  };
  
  // Process each pole
  for (const [poleNumber, records] of Object.entries(poleData)) {
    // Sort records by date
    records.sort((a, b) => {
      const dateA = new Date(a.date_status_changed || '1900-01-01');
      const dateB = new Date(b.date_status_changed || '1900-01-01');
      return dateA - dateB;
    });
    
    // Track first instance of each status type
    const poleFirstInstances = {};
    
    for (const record of records) {
      const normalizedStatus = normalizeStatus(record.status);
      const category = categorizeStatus(normalizedStatus);
      
      // Track first instance per category
      if (category !== 'other' && !poleFirstInstances[category]) {
        poleFirstInstances[category] = {
          pole_number: poleNumber,
          property_id: record.property_id,
          status: record.status,
          date: record.date_status_changed,
          address: record.address
        };
        
        firstInstances[category].push(poleFirstInstances[category]);
      }
      
      // Count all home signups (not just first)
      if (category === 'home_signup' && record.drop_number) {
        firstInstances.total_home_signups++;
      }
    }
  }
  
  // Generate report
  const report = `
# OneMap First Instance Analysis Report
Generated: ${new Date().toISOString()}

## Summary
- Total Records Analyzed: ${snapshot.size}
- Unique Poles: ${Object.keys(poleData).length}
- Records Without Poles: ${recordsWithoutPoles.length}

## First Instance Counts (Per Pole)
- First Pole Permissions Approved: ${firstInstances.pole_permission_approved.length}
- First Poles Planted: ${firstInstances.pole_planted.length}
- First Home Sign-ups: ${firstInstances.home_signup.length}
- First Home Installs: ${firstInstances.home_install.length}
- Total Home Sign-ups (all): ${firstInstances.total_home_signups}

## Sample First Instances

### Pole Permissions Approved (First 10)
${firstInstances.pole_permission_approved.slice(0, 10).map(fi => 
  `- ${fi.pole_number}: ${fi.date || 'No date'} | ${fi.address}`
).join('\n')}

### Poles Planted (First 10)
${firstInstances.pole_planted.slice(0, 10).map(fi => 
  `- ${fi.pole_number}: ${fi.date || 'No date'} | ${fi.address}`
).join('\n')}

### Home Sign-ups (First 10)
${firstInstances.home_signup.slice(0, 10).map(fi => 
  `- ${fi.pole_number}: ${fi.date || 'No date'} | ${fi.address}`
).join('\n')}

### Home Installs (First 10)
${firstInstances.home_install.slice(0, 10).map(fi => 
  `- ${fi.pole_number}: ${fi.date || 'No date'} | ${fi.address}`
).join('\n')}

## Data Quality Notes
- Some records may have missing or invalid dates
- Status text variations are normalized for matching
- Home sign-ups are counted per drop number when available
`;
  
  // Save report
  const reportPath = path.join(__dirname, 'reports', `first_instances_analysis_${Date.now()}.md`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, report);
  
  // Save detailed data as JSON
  const jsonPath = path.join(__dirname, 'reports', `first_instances_data_${Date.now()}.json`);
  await fs.writeFile(jsonPath, JSON.stringify({
    summary: {
      total_records: snapshot.size,
      unique_poles: Object.keys(poleData).length,
      records_without_poles: recordsWithoutPoles.length,
      first_pole_permissions: firstInstances.pole_permission_approved.length,
      first_poles_planted: firstInstances.pole_planted.length,
      first_home_signups: firstInstances.home_signup.length,
      first_home_installs: firstInstances.home_install.length,
      total_home_signups: firstInstances.total_home_signups
    },
    first_instances: firstInstances
  }, null, 2));
  
  console.log(report);
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(`📊 Data saved to: ${jsonPath}`);
}

// Run analysis
if (require.main === module) {
  analyzeFirstInstances().catch(console.error);
}

module.exports = { analyzeFirstInstances, normalizeStatus, categorizeStatus };