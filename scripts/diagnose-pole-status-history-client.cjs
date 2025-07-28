#!/usr/bin/env node

/**
 * Diagnostic script to investigate pole LAW.P.C328 status history issues
 * 
 * This script will:
 * 1. Find the correct document ID for pole LAW.P.C328
 * 2. Check if status history subcollection exists
 * 3. List all status history entries
 * 4. Provide the correct URL to view the pole
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, orderBy, limit, startAt, endAt } = require('firebase/firestore');

// Firebase configuration for FibreFlow
const firebaseConfig = {
  apiKey: 'AIzaSyD5iG5pNX0ElTHV1Vp7BhKHvO9RGzRzRCM',
  authDomain: 'fibreflow-73daf.firebaseapp.com',
  projectId: 'fibreflow-73daf',
  storageBucket: 'fibreflow-73daf.appspot.com',
  messagingSenderId: '729020567841',
  appId: '1:729020567841:web:8b3a77031b9b2b3b2c77c6'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findPoleByNumber(poleNumber) {
  console.log(`\n🔍 Searching for pole: ${poleNumber}\n`);
  
  try {
    // Search in planned-poles collection
    const plannedPolesRef = collection(db, 'planned-poles');
    const q = query(plannedPolesRef, where('poleNumber', '==', poleNumber));
    const plannedPolesQuery = await getDocs(q);
    
    if (!plannedPolesQuery.empty) {
      console.log(`✅ Found ${plannedPolesQuery.size} document(s) in planned-poles collection:`);
      
      const results = [];
      plannedPolesQuery.forEach(doc => {
        const data = doc.data();
        console.log(`\n📄 Document ID: ${doc.id}`);
        console.log(`   Pole Number: ${data.poleNumber}`);
        console.log(`   Project: ${data.projectName || 'N/A'}`);
        console.log(`   Status: ${data.status || 'N/A'}`);
        console.log(`   Created: ${data.createdAt?.toDate() || 'N/A'}`);
        
        results.push({
          id: doc.id,
          data: data
        });
      });
      
      return results;
    } else {
      console.log('❌ No documents found with this pole number in planned-poles');
      
      // Try alternative search methods
      console.log('\n🔍 Trying alternative search with case variations...');
      
      // Try uppercase
      const upperQ = query(plannedPolesRef, where('poleNumber', '==', poleNumber.toUpperCase()));
      const upperQuery = await getDocs(upperQ);
      
      if (!upperQuery.empty) {
        console.log(`✅ Found with uppercase: ${upperQuery.size} document(s)`);
        const results = [];
        upperQuery.forEach(doc => {
          console.log(`   Document ID: ${doc.id}, Pole: ${doc.data().poleNumber}`);
          results.push({ id: doc.id, data: doc.data() });
        });
        return results;
      }
      
      // Try lowercase
      const lowerQ = query(plannedPolesRef, where('poleNumber', '==', poleNumber.toLowerCase()));
      const lowerQuery = await getDocs(lowerQ);
      
      if (!lowerQuery.empty) {
        console.log(`✅ Found with lowercase: ${lowerQuery.size} document(s)`);
        const results = [];
        lowerQuery.forEach(doc => {
          console.log(`   Document ID: ${doc.id}, Pole: ${doc.data().poleNumber}`);
          results.push({ id: doc.id, data: doc.data() });
        });
        return results;
      }
      
      // Try partial match
      console.log('\n🔍 Searching for partial matches...');
      const partialQ = query(
        plannedPolesRef, 
        orderBy('poleNumber'),
        startAt(poleNumber.substring(0, 5)),
        endAt(poleNumber.substring(0, 5) + '\uf8ff'),
        limit(10)
      );
      const allPoles = await getDocs(partialQ);
      
      if (!allPoles.empty) {
        console.log(`\n📋 Similar pole numbers found:`);
        allPoles.forEach(doc => {
          console.log(`   ${doc.data().poleNumber} (ID: ${doc.id})`);
        });
      }
      
      return [];
    }
  } catch (error) {
    console.error('❌ Error searching for pole:', error);
    return [];
  }
}

async function checkStatusHistory(poleDocId) {
  console.log(`\n📊 Checking status history for document ID: ${poleDocId}\n`);
  
  try {
    // Get the status history subcollection
    const statusHistoryRef = collection(db, 'planned-poles', poleDocId, 'statusHistory');
    const statusHistoryQ = query(statusHistoryRef, orderBy('timestamp', 'desc'));
    const statusHistory = await getDocs(statusHistoryQ);
    
    if (statusHistory.empty) {
      console.log('❌ No status history found in subcollection');
      return [];
    }
    
    console.log(`✅ Found ${statusHistory.size} status history entries:`);
    
    const historyEntries = [];
    statusHistory.forEach(doc => {
      const data = doc.data();
      console.log(`\n📅 Entry ID: ${doc.id}`);
      console.log(`   Timestamp: ${data.timestamp?.toDate() || 'N/A'}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Changed By: ${data.changedBy || 'N/A'}`);
      console.log(`   Notes: ${data.notes || 'N/A'}`);
      
      historyEntries.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate()
      });
    });
    
    return historyEntries;
  } catch (error) {
    console.error('❌ Error checking status history:', error);
    return [];
  }
}

async function checkWrongDocument(docId) {
  console.log(`\n🔍 Checking what's in document ID: ${docId}\n`);
  
  try {
    const docRef = doc(db, 'planned-poles', docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('❌ Document does not exist');
      return null;
    }
    
    const data = docSnap.data();
    console.log('📄 Document found:');
    console.log(`   Pole Number: ${data.poleNumber || 'N/A'}`);
    console.log(`   Project: ${data.projectName || 'N/A'}`);
    console.log(`   Status: ${data.status || 'N/A'}`);
    console.log(`   Created: ${data.createdAt?.toDate() || 'N/A'}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error checking document:', error);
    return null;
  }
}

async function generateCorrectUrl(poleDocId) {
  const baseUrl = 'https://fibreflow-73daf.web.app';
  const correctUrl = `${baseUrl}/pole-tracker/${poleDocId}`;
  
  console.log(`\n🔗 Correct URL to view this pole:`);
  console.log(`   ${correctUrl}`);
  
  return correctUrl;
}

async function main() {
  const targetPoleNumber = 'LAW.P.C328';
  const suspectDocId = 'A7LuDrS5gxDrMcaYRbaI';
  
  console.log('='.repeat(80));
  console.log('🔧 POLE STATUS HISTORY DIAGNOSTIC TOOL');
  console.log('='.repeat(80));
  
  // Step 1: Check what's in the suspect document
  console.log('\n1️⃣ CHECKING SUSPECT DOCUMENT');
  console.log('-'.repeat(40));
  const suspectData = await checkWrongDocument(suspectDocId);
  
  // Step 2: Find the correct pole
  console.log('\n2️⃣ FINDING CORRECT POLE');
  console.log('-'.repeat(40));
  const poles = await findPoleByNumber(targetPoleNumber);
  
  if (poles.length === 0) {
    console.log('\n⚠️  WARNING: Could not find pole LAW.P.C328');
    console.log('   This might indicate:');
    console.log('   - The pole was never imported');
    console.log('   - The pole number format is different');
    console.log('   - The pole is in a different collection');
  } else {
    // Step 3: Check status history for each found pole
    for (const pole of poles) {
      console.log('\n3️⃣ CHECKING STATUS HISTORY');
      console.log('-'.repeat(40));
      const history = await checkStatusHistory(pole.id);
      
      // Step 4: Generate correct URL
      console.log('\n4️⃣ CORRECT ACCESS URL');
      console.log('-'.repeat(40));
      await generateCorrectUrl(pole.id);
      
      // Summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 SUMMARY');
      console.log('='.repeat(80));
      
      if (history.length > 0) {
        console.log(`✅ Status history exists with ${history.length} entries`);
        console.log(`   Latest status: ${history[0].status}`);
        console.log(`   Latest update: ${history[0].timestamp}`);
      } else {
        console.log('❌ No status history found');
        console.log('   Possible reasons:');
        console.log('   - The sync script hasn\'t processed this pole yet');
        console.log('   - The pole was imported without status history');
        console.log('   - There\'s an issue with the subcollection creation');
      }
    }
  }
  
  // Additional diagnostics
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ADDITIONAL DIAGNOSTICS');
  console.log('='.repeat(80));
  
  // Check if there are any poles with status history
  console.log('\n📊 Checking random poles with status history...');
  const lawleyQ = query(collection(db, 'planned-poles'), where('projectName', '==', 'Lawley'), limit(5));
  const polesWithHistory = await getDocs(lawleyQ);
  
  let historyCount = 0;
  for (const doc of polesWithHistory.docs) {
    const historyRef = collection(db, 'planned-poles', doc.id, 'statusHistory');
    const historySnapshot = await getDocs(query(historyRef, limit(1)));
    if (!historySnapshot.empty) {
      historyCount++;
      console.log(`   ✅ ${doc.data().poleNumber} has status history`);
    }
  }
  
  console.log(`\n📈 ${historyCount} out of 5 sampled Lawley poles have status history`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnostic complete!');
  console.log('='.repeat(80));
  
  process.exit(0);
}

// Run the diagnostic
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});