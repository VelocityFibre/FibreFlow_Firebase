const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3G1W-5cgwT2gqnYZzuqI0I_jaZrtlHWU",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "169918879141",
  appId: "1:169918879141:web:98091e11b2d96cc6e4a6f0",
  measurementId: "G-H5MX5NPNGN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixStockItems() {
  console.log('Starting stock items migration...');
  
  try {
    const stockItemsRef = collection(db, 'stockItems');
    const snapshot = await getDocs(stockItemsRef);
    
    let batch = writeBatch(db);
    let updateCount = 0;
    let batchCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const updates = {};
      
      // Add isProjectSpecific field if it doesn't exist
      if (data.isProjectSpecific === undefined) {
        // If it has a projectId, it's project-specific
        updates.isProjectSpecific = !!data.projectId;
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        batch.update(doc(db, 'stockItems', docSnapshot.id), updates);
        updateCount++;
        batchCount++;
        
        console.log(`Updating ${docSnapshot.id}: isProjectSpecific = ${updates.isProjectSpecific}`);
        
        // Commit batch every 500 documents (Firestore limit)
        if (batchCount === 500) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} updates`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }
    
    console.log(`\nMigration complete! Updated ${updateCount} stock items.`);
    console.log('Total stock items:', snapshot.size);
    
  } catch (error) {
    console.error('Error during migration:', error);
  }
  
  process.exit(0);
}

// Run the migration
fixStockItems();