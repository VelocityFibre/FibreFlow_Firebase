#!/usr/bin/env node

/**
 * Check current status data in FibreFlow poles
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkPoleStatusData() {
  console.log('🔍 Checking pole status data in FibreFlow...\n');
  
  const snapshot = await db.collection('planned-poles').limit(10).get();
  
  console.log('📊 Sample of 10 poles:\n');
  
  let hasStatusHistory = 0;
  let hasCurrentStatus = 0;
  
  snapshot.forEach(doc => {
    const pole = doc.data();
    console.log(`Pole ID: ${doc.id}`);
    console.log(`  VF Pole ID: ${pole.vfPoleId || 'Not set'}`);
    console.log(`  Pole Number: ${pole.poleNumber || 'Not set'}`);
    console.log(`  Current Status: ${pole.status || 'Not set'}`);
    console.log(`  Status History: ${pole.statusHistory ? pole.statusHistory.length + ' entries' : 'None'}`);
    console.log(`  Project: ${pole.projectCode || 'Not set'}`);
    console.log('');
    
    if (pole.statusHistory && pole.statusHistory.length > 0) hasStatusHistory++;
    if (pole.status) hasCurrentStatus++;
  });
  
  // Check overall statistics
  const allPoles = await db.collection('planned-poles').get();
  let totalWithStatus = 0;
  let totalWithHistory = 0;
  
  allPoles.forEach(doc => {
    const pole = doc.data();
    if (pole.status) totalWithStatus++;
    if (pole.statusHistory && pole.statusHistory.length > 0) totalWithHistory++;
  });
  
  console.log('\n📈 Overall Statistics:');
  console.log(`Total poles: ${allPoles.size}`);
  console.log(`Poles with current status: ${totalWithStatus}`);
  console.log(`Poles with status history: ${totalWithHistory}`);
  
  console.log('\n💡 Analysis:');
  if (totalWithHistory === 0) {
    console.log('- No poles have status history yet');
    console.log('- The statusHistory feature is available but not being used');
    console.log('- Future imports or updates can start populating this field');
  }
  
  if (totalWithStatus === 0) {
    console.log('- No poles have a current status set');
    console.log('- This field can be populated from OneMap imports or manual updates');
  }
}

checkPoleStatusData()
  .then(() => process.exit())
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });