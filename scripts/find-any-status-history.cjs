#!/usr/bin/env node

/**
 * Comprehensive search for any status history data in FibreFlow
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function findAnyStatusHistory() {
  try {
    console.log('🔍 Comprehensive search for status history in FibreFlow...\n');
    console.log('📊 Database: fibreflow-73daf (Production)');
    console.log('🔎 Searching multiple possible locations...\n');
    
    let foundHistory = false;
    
    // 1. Check for statusHistory array in planned-poles documents
    console.log('1️⃣ Checking for statusHistory arrays in planned-poles documents...');
    const polesWithArray = await db.collection('planned-poles')
      .where('statusHistory', '!=', null)
      .limit(5)
      .get();
    
    if (polesWithArray.size > 0) {
      foundHistory = true;
      console.log(`✅ Found ${polesWithArray.size} poles with statusHistory arrays!`);
      polesWithArray.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.statusHistory?.length || 0} entries`);
      });
    } else {
      console.log('❌ No poles with statusHistory arrays');
    }
    
    // 2. Check for statusHistory subcollections
    console.log('\n2️⃣ Checking for statusHistory subcollections...');
    const samplePoles = await db.collection('planned-poles').limit(10).get();
    
    for (const poleDoc of samplePoles.docs) {
      const historySnapshot = await db
        .collection('planned-poles')
        .doc(poleDoc.id)
        .collection('statusHistory')
        .limit(1)
        .get();
      
      if (historySnapshot.size > 0) {
        foundHistory = true;
        console.log(`✅ Found statusHistory subcollection for pole ${poleDoc.id}`);
        const fullHistory = await db
          .collection('planned-poles')
          .doc(poleDoc.id)
          .collection('statusHistory')
          .orderBy('timestamp', 'desc')
          .get();
        console.log(`   - Total entries: ${fullHistory.size}`);
        
        // Show first entry
        const firstEntry = fullHistory.docs[0].data();
        console.log(`   - Latest: ${firstEntry.status} on ${firstEntry.timestamp?.toDate?.() || firstEntry.timestamp}`);
        break; // Found one, that's enough
      }
    }
    
    if (!foundHistory) {
      console.log('❌ No statusHistory subcollections found in sample poles');
    }
    
    // 3. Check pole-status-changes collection
    console.log('\n3️⃣ Checking pole-status-changes collection...');
    const statusChanges = await db.collection('pole-status-changes').limit(5).get();
    
    if (statusChanges.size > 0) {
      foundHistory = true;
      console.log(`✅ Found ${statusChanges.size} documents in pole-status-changes!`);
      statusChanges.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.poleNumber}: ${data.fromStatus} → ${data.toStatus} on ${data.changeDate}`);
      });
    } else {
      console.log('❌ pole-status-changes collection is empty');
    }
    
    // 4. Check for any poles with multiple status-related fields
    console.log('\n4️⃣ Checking for poles with status tracking fields...');
    const trackedPoles = await db.collection('planned-poles')
      .where('totalStatusRecords', '>', 0)
      .limit(5)
      .get();
    
    if (trackedPoles.size > 0) {
      foundHistory = true;
      console.log(`✅ Found ${trackedPoles.size} poles with totalStatusRecords > 0!`);
      trackedPoles.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.totalStatusRecords} records, current: ${data.importStatus || data.status}`);
      });
    } else {
      console.log('❌ No poles with totalStatusRecords field');
    }
    
    // 5. Check import-records for historical data
    console.log('\n5️⃣ Checking import-records collection...');
    const imports = await db.collection('import-records')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    if (imports.size > 0) {
      console.log(`📋 Found ${imports.size} import records (could contain historical data)`);
      imports.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.totalRecords || 0} records on ${data.timestamp?.toDate?.()}`);
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    
    if (foundHistory) {
      console.log('✅ Status history data was found in the database!');
      console.log('\nTo view in the UI, you need poles with either:');
      console.log('- statusHistory subcollections (for detailed view)');
      console.log('- Data in pole-status-changes collection (for analytics)');
      console.log('- totalStatusRecords > 1 (for basic tracking)');
    } else {
      console.log('❌ No status history data found in any location');
      console.log('\nThis means:');
      console.log('1. No historical imports have been done with status tracking');
      console.log('2. The sync process hasn\'t been run to create history');
      console.log('3. Poles only have current status, no historical changes');
    }
    
    // Suggest next steps
    console.log('\n💡 Next Steps:');
    console.log('1. Run the sync process to import historical data from OneMap');
    console.log('2. Use sync/scripts/sync-with-status-history.js to create history');
    console.log('3. Or manually create test data for UI development');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

// Run the search
findAnyStatusHistory();