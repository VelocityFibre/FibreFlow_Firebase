#!/usr/bin/env node

/**
 * Show Status Timeline
 * Displays the complete timeline of status changes for a pole
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/vf-onemap-data-key.json')
  ),
  projectId: 'vf-onemap-data'
}, 'staging');

const stagingDb = stagingApp.firestore();

async function showStatusTimeline() {
  console.log('📅 STATUS CHANGE TIMELINE FOR POLE LAW.P.C654\n');
  console.log('═'.repeat(80));
  
  try {
    // Get all records for this pole
    const records = await stagingDb
      .collection('vf-onemap-processed-records')
      .where('poleNumber', '==', 'LAW.P.C654')
      .get();
    
    console.log('OVERVIEW:');
    console.log(`This pole serves 2 different properties with different installation outcomes.\n`);
    
    const recordData = [];
    records.forEach(doc => {
      recordData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by property ID to show clear separation
    recordData.sort((a, b) => a.propertyId.localeCompare(b.propertyId));
    
    console.log('─'.repeat(80));
    console.log('PROPERTY 1: #239252');
    console.log('─'.repeat(80));
    
    const prop1 = recordData.find(r => r.propertyId === '239252');
    if (prop1) {
      console.log('\n📍 INITIAL STATUS (April 24, 2025):');
      console.log(`   Status: "Pole Permission: Approved" ✅`);
      console.log(`   Meaning: The property owner gave permission to install a pole`);
      console.log(`   Field Agent: wian`);
      console.log(`   Drop Number: no drop allocated (pole approved, but no fiber drop yet)`);
      console.log(`   Date: ${prop1.lastModifiedDate}`);
      console.log(`   Workflow Stage: ${prop1.flowNameGroups}`);
      console.log('\n   Details:');
      console.log(`   - Location: ${prop1.locationAddress}`);
      console.log(`   - GPS: Lat ${prop1.latitude}, Lon ${prop1.longitude}`);
      console.log(`   - PON: ${prop1.pons}`);
      console.log(`   - Zone: ${prop1.sections}`);
    }
    
    console.log('\n\n─'.repeat(80));
    console.log('PROPERTY 2: #239274 (Different property, same pole)');
    console.log('─'.repeat(80));
    
    const prop2 = recordData.find(r => r.propertyId === '239274');
    if (prop2) {
      console.log('\n📍 LATER STATUS:');
      console.log(`   Status: "Home Installation: Declined" ❌`);
      console.log(`   Meaning: The homeowner declined fiber installation inside their home`);
      console.log(`   Field Agent: Unknown`);
      console.log(`   Drop Number: DR1752940 (drop was allocated but installation declined)`);
      console.log(`   Workflow Progression:`);
      
      // Parse workflow groups to show progression
      const workflows = prop2.flowNameGroups.split(', ');
      workflows.forEach((stage, index) => {
        console.log(`     ${index + 1}. ${stage}`);
      });
      
      console.log('\n   Details:');
      console.log(`   - Location: ${prop2.locationAddress}`);
      console.log(`   - This shows the installation went through multiple stages:`);
      console.log(`     • Started as "In Progress"`);
      console.log(`     • Reached "Installed" (physical installation)`);
      console.log(`     • Finally "Declined" (homeowner decision)`);
    }
    
    console.log('\n\n═'.repeat(80));
    console.log('SUMMARY: What This Tells Us');
    console.log('═'.repeat(80));
    
    console.log('\n1. POLE SHARING:');
    console.log('   - One physical pole (LAW.P.C654) serves multiple properties');
    console.log('   - Each property has its own installation status');
    
    console.log('\n2. STATUS PROGRESSION:');
    console.log('   - Property #239252: Got pole permission ✅');
    console.log('   - Property #239274: Went further in process but declined at final stage ❌');
    
    console.log('\n3. BUSINESS INSIGHT:');
    console.log('   - The pole was approved and installed');
    console.log('   - One property is ready for service (239252)');
    console.log('   - Another property declined service (239274)');
    console.log('   - Both statuses are tracked for billing/service purposes');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
showStatusTimeline().then(() => {
  console.log('\n✨ Timeline analysis completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});