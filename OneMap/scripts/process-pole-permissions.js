#!/usr/bin/env node

/**
 * STEP 2: Process Raw Data According to Hein's Specification
 * 
 * This runs AFTER raw import and applies all the filtering/processing rules:
 * 1. Filter for "Pole Permission: Approved" (exclude "Home Sign Ups")
 * 2. Separate records without pole numbers
 * 3. Handle duplicate pole numbers (keep earliest)
 * 4. Analyze first approval dates
 * 5. Create date-based collections
 * 
 * Date Range: 26 June 2025 - 9 July 2025
 */

require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');
const ExcelJS = require('exceljs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Hein's 16 columns in exact order
const REQUIRED_COLUMNS = [
  'Property ID',
  '1map NAD ID',
  'Pole Number',
  'Drop Number',
  'Stand Number',
  'Status',
  'Flow Name Groups',
  'Site',
  'Sections',
  'PONs',
  'Location Address',
  'Latitude',
  'Longitude Field Agent Name (pole permission)',
  'Latitude Longitude',
  'Last Modified Pole Permissions',
  'Last Modified Pole Permissions Date'
];

// Date range for analysis
const START_DATE = new Date('2025-06-26');
const END_DATE = new Date('2025-07-09');

async function processRawData() {
  console.log('📋 STEP 2: Processing Raw Data per Hein\'s Specification\n');
  
  // Step 1: Filter for Pole Permission: Approved (exclude Home Sign Ups)
  console.log('1️⃣ Filtering for Pole Permission: Approved...');
  
  const rawDataRef = db.collection('raw_onemap_data');
  const snapshot = await rawDataRef.get();
  
  const filteredRecords = [];
  const noPoleRecords = [];
  const poleRecords = new Map(); // pole number -> records
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const flowNameGroups = data['Flow Name Groups'] || '';
    
    // Apply Hein's filtering rules
    if (flowNameGroups.includes('Pole Permission: Approved') && 
        !flowNameGroups.includes('Home Sign Ups')) {
      
      const record = { id: doc.id, ...data };
      
      // Check for pole number
      const poleNumber = data['Pole Number'];
      
      if (!poleNumber || poleNumber.trim() === '') {
        // No pole number - goes to quality control
        noPoleRecords.push(record);
      } else {
        // Has pole number - check for duplicates
        if (!poleRecords.has(poleNumber)) {
          poleRecords.set(poleNumber, []);
        }
        poleRecords.get(poleNumber).push(record);
      }
      
      filteredRecords.push(record);
    }
  });
  
  console.log(`   ✓ Found ${filteredRecords.length} Pole Permission: Approved records`);
  console.log(`   ✓ ${noPoleRecords.length} records without pole numbers`);
  console.log(`   ✓ ${poleRecords.size} unique pole numbers`);
  
  // Step 2: Handle duplicates - keep earliest per pole
  console.log('\n2️⃣ Processing duplicates (keeping earliest per pole)...');
  
  const uniquePoleRecords = [];
  const duplicatesRemoved = [];
  
  for (const [poleNumber, records] of poleRecords) {
    if (records.length === 1) {
      uniquePoleRecords.push(records[0]);
    } else {
      // Sort by Last Modified Pole Permissions Date
      const sorted = records.sort((a, b) => {
        const dateA = new Date(a['Last Modified Pole Permissions Date'] || '9999-12-31');
        const dateB = new Date(b['Last Modified Pole Permissions Date'] || '9999-12-31');
        return dateA - dateB;
      });
      
      // Keep first (earliest)
      uniquePoleRecords.push(sorted[0]);
      
      // Rest are duplicates
      for (let i = 1; i < sorted.length; i++) {
        duplicatesRemoved.push(sorted[i]);
      }
    }
  }
  
  console.log(`   ✓ ${uniquePoleRecords.length} unique pole records`);
  console.log(`   ✓ ${duplicatesRemoved.length} duplicates removed`);
  
  // Step 3: Analyze first approval dates
  console.log('\n3️⃣ Analyzing first approval dates...');
  
  const firstEntryInWindow = [];
  const duplicatesPreWindow = [];
  
  uniquePoleRecords.forEach(record => {
    const approvalDate = new Date(record['Last Modified Pole Permissions Date'] || '9999-12-31');
    
    if (approvalDate >= START_DATE && approvalDate <= END_DATE) {
      firstEntryInWindow.push(record);
    } else if (approvalDate < START_DATE) {
      duplicatesPreWindow.push(record);
    }
  });
  
  console.log(`   ✓ ${firstEntryInWindow.length} new pole permissions (${START_DATE.toDateString()} - ${END_DATE.toDateString()})`);
  console.log(`   ✓ ${duplicatesPreWindow.length} existing pole permissions (before ${START_DATE.toDateString()})`);
  
  // Save to Firestore collections
  console.log('\n4️⃣ Saving to Firestore collections...');
  
  // Clear existing collections
  await clearCollection('no_pole_allocated');
  await clearCollection('duplicate_poles_removed');
  await clearCollection('first_entry_in_window');
  await clearCollection('duplicates_pre_window');
  
  // Save each category
  await saveToCollection('no_pole_allocated', noPoleRecords);
  await saveToCollection('duplicate_poles_removed', duplicatesRemoved);
  await saveToCollection('first_entry_in_window', firstEntryInWindow);
  await saveToCollection('duplicates_pre_window', duplicatesPreWindow);
  
  // Create Excel report
  console.log('\n5️⃣ Creating Excel report...');
  await createExcelReport({
    firstEntryInWindow,
    duplicatesPreWindow,
    noPoleRecords,
    duplicatesRemoved
  });
  
  console.log('\n✅ Processing complete!');
  console.log('   📊 Check Firestore collections for processed data');
  console.log('   📑 Excel report saved to: reports/pole_permissions_analysis.xlsx');
}

async function clearCollection(collectionName) {
  const batch = db.batch();
  const snapshot = await db.collection(collectionName).get();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function saveToCollection(collectionName, records) {
  if (records.length === 0) return;
  
  let batch = db.batch();
  let count = 0;
  
  for (const record of records) {
    const docRef = db.collection(collectionName).doc(record.id || record['Property ID']);
    
    // Extract only the 16 required columns
    const processedRecord = {};
    REQUIRED_COLUMNS.forEach(col => {
      processedRecord[col] = record[col] || '';
    });
    
    batch.set(docRef, {
      ...processedRecord,
      _processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✓ Saved ${records.length} records to ${collectionName}`);
}

async function createExcelReport(data) {
  const workbook = new ExcelJS.Workbook();
  
  // Add sheets
  const sheets = [
    { name: 'FirstEntry_26Jun-9Jul', data: data.firstEntryInWindow },
    { name: 'Duplicates_PreWindow', data: data.duplicatesPreWindow },
    { name: 'No_Pole_Allocated', data: data.noPoleRecords },
    { name: 'Duplicate_Poles_Removed', data: data.duplicatesRemoved }
  ];
  
  sheets.forEach(({ name, data }) => {
    const sheet = workbook.addWorksheet(name);
    
    // Add headers
    sheet.columns = REQUIRED_COLUMNS.map(col => ({
      header: col,
      key: col,
      width: 20
    }));
    
    // Add data
    data.forEach(record => {
      const row = {};
      REQUIRED_COLUMNS.forEach(col => {
        row[col] = record[col] || '';
      });
      sheet.addRow(row);
    });
    
    // Style headers
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Save file
  const reportPath = path.join(__dirname, '../reports/pole_permissions_analysis.xlsx');
  await workbook.xlsx.writeFile(reportPath);
}

// Run if called directly
if (require.main === module) {
  processRawData().catch(console.error);
}