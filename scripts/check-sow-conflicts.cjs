const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkForSOWConflicts() {
  console.log('\n=== Checking for SOW Data Conflicts ===\n');

  // Collections that might contain SOW-related data
  const collectionsToCheck = [
    'sows',
    'sow',
    'poles',
    'drops',
    'fibre',
    'fiber',
    'pole-trackers',
    'planned-poles',
    'home-signups',
    'homes-connected',
    'homes-activated'
  ];

  console.log('Checking the following collections for SOW/pole/drop data:');
  console.log(collectionsToCheck.join(', '));
  console.log('\n');

  for (const collectionName of collectionsToCheck) {
    try {
      console.log(`\nChecking collection: ${collectionName}`);
      
      // Try to get documents from the collection
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (!snapshot.empty) {
        console.log(`✓ Found ${snapshot.size} documents in '${collectionName}'`);
        
        // Check for Lawley-related data
        let lawleyCount = 0;
        let sampleDoc = null;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const docStr = JSON.stringify(data).toLowerCase();
          
          // Check if document contains Lawley references
          if (docStr.includes('lawley') || docStr.includes('law.p') || 
              (data.projectCode && data.projectCode.toLowerCase().includes('law')) ||
              (data.projectName && data.projectName.toLowerCase().includes('lawley'))) {
            lawleyCount++;
            if (!sampleDoc) {
              sampleDoc = { id: doc.id, ...data };
            }
          }
        });
        
        if (lawleyCount > 0) {
          console.log(`  → Found ${lawleyCount} Lawley-related documents`);
          console.log(`  → Sample document:`, JSON.stringify(sampleDoc, null, 2).substring(0, 500) + '...');
        }
        
        // Show first document structure
        const firstDoc = snapshot.docs[0];
        console.log(`  → Document structure (keys):`, Object.keys(firstDoc.data()).join(', '));
        
      } else {
        console.log(`✗ Collection '${collectionName}' is empty or does not exist`);
      }
      
    } catch (error) {
      console.log(`✗ Collection '${collectionName}' does not exist or cannot be accessed`);
    }
  }

  console.log('\n\n=== Analysis Summary ===\n');
  console.log('Based on the code review:');
  console.log('1. The project-sow component reads SOW data from Neon (PostgreSQL)');
  console.log('2. Firebase stores operational pole/drop data in various collections');
  console.log('3. There appears to be a dual storage pattern where:');
  console.log('   - Neon: Used for SOW reporting/analytics (poles, drops, fibre)');
  console.log('   - Firebase: Used for real-time operational data');
  console.log('\nThis could lead to data synchronization issues if both systems');
  console.log('are not kept in sync properly.\n');
}

// Run the check
checkForSOWConflicts()
  .then(() => {
    console.log('\nCheck complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });