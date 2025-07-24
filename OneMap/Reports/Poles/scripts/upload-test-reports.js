#!/usr/bin/env node

/**
 * Upload Test Reports to Firebase
 * 
 * This script uploads the existing generated reports to Firebase
 * so we can test the UI components
 */

const fs = require('fs').promises;
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBbaRXEkiVGHC5S_lLH8SWvgTJZDF6iTzQ",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "146498268846",
  appId: "1:146498268846:web:34fda96797dcec30dc6c74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Import report generator
const { generatePoleReportData } = require('./generate-pole-report-enhanced');

/**
 * Upload a single pole report
 */
async function uploadPoleReport(poleNumber) {
  try {
    console.log(`\n📤 Uploading report for pole ${poleNumber}...`);
    
    // Generate report data
    const report = await generatePoleReportData(poleNumber);
    
    // Store current version
    const currentRef = doc(db, 'analytics', 'pole-reports', poleNumber, 'current');
    await setDoc(currentRef, {
      ...report,
      updatedAt: serverTimestamp()
    });
    
    // Store in summary collection
    const summaryRef = doc(db, 'analytics', 'pole-reports-summary', poleNumber);
    await setDoc(summaryRef, {
      poleNumber: report.poleNumber,
      lastGenerated: report.generatedAt,
      totalRecords: report.summary.totalRecords,
      totalDrops: report.summary.totalDrops,
      totalAgents: report.agents.length,
      dataSource: report.dataSource,
      status: 'available',
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Successfully uploaded report for ${poleNumber}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to upload report for ${poleNumber}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Uploading Test Reports to Firebase');
  console.log('='.repeat(60));
  
  // List of test poles to upload
  const testPoles = ['LAW.P.A508', 'LAW.P.A707'];
  
  let successful = 0;
  let failed = 0;
  
  for (const poleNumber of testPoles) {
    const result = await uploadPoleReport(poleNumber);
    if (result) {
      successful++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Complete');
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  
  if (successful > 0) {
    console.log('\n✅ Test reports are now available in Firebase!');
    console.log('   You can view them at:');
    console.log('   https://fibreflow-73daf.web.app/analytics/dashboard');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}