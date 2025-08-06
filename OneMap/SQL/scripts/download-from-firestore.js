const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBqDZlqD7UOBvt7rr2L8G8FHQ5UV9LHNSc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "169720383209",
  appId: "1:169720383209:web:8c0dc4ca6ba399bb993236"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function downloadFromFirestore() {
  console.log('Connecting to Firestore...');
  
  try {
    // Look for the file in various possible collections
    const possibleCollections = [
      'csv-uploads',
      'uploads', 
      'onemap',
      'files',
      'excel-uploads',
      'pole-permissions'
    ];
    
    let found = false;
    
    for (const collName of possibleCollections) {
      console.log(`\nChecking collection: ${collName}`);
      
      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, collName),
            orderBy('uploadDate', 'desc'),
            limit(10)
          )
        );
        
        if (!querySnapshot.empty) {
          console.log(`Found ${querySnapshot.size} documents in ${collName}`);
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`- Document ID: ${doc.id}`);
            console.log(`  Filename: ${data.filename || data.name || 'N/A'}`);
            console.log(`  Upload Date: ${data.uploadDate || data.createdAt || 'N/A'}`);
            
            // Check if this is our file
            if (data.filename === '1754473447790_Lawley_01082025.xlsx' || 
                doc.id === '1754473447790_Lawley_01082025') {
              console.log('\n✓ Found the file!');
              console.log('Data:', JSON.stringify(data, null, 2));
              found = true;
              
              // If data is stored in Firestore, extract it
              if (data.rows || data.data || data.content) {
                saveDataAsExcel(data, data.filename || '1754473447790_Lawley_01082025.xlsx');
              }
            }
          });
        }
      } catch (error) {
        console.log(`  Error accessing ${collName}: ${error.message}`);
      }
    }
    
    if (!found) {
      console.log('\nFile not found in common collections.');
      console.log('Searching for any collection with "Lawley" in documents...');
      
      // Try a more general search
      const collections = ['status_changes', 'pole-permissions', 'onemap-imports'];
      
      for (const collName of collections) {
        try {
          const snapshot = await getDocs(
            query(collection(db, collName), limit(5))
          );
          
          if (!snapshot.empty) {
            console.log(`\nFound data in ${collName}:`);
            const sample = snapshot.docs[0].data();
            console.log('Sample record:', JSON.stringify(sample, null, 2));
            
            // If this looks like our data, export all
            if (sample.pole_number || sample['Pole Number']) {
              console.log('This looks like OneMap data! Exporting...');
              await exportCollectionToExcel(collName);
              found = true;
              break;
            }
          }
        } catch (err) {
          // Skip
        }
      }
    }
    
    if (!found) {
      console.log('\nCould not find the file. Please check:');
      console.log('1. The exact collection name in Firestore');
      console.log('2. The document structure');
      console.log('3. Whether the data was imported as documents or stored as a file reference');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

async function exportCollectionToExcel(collectionName) {
  console.log(`\nExporting collection: ${collectionName}`);
  
  const snapshot = await getDocs(collection(db, collectionName));
  const data = [];
  
  snapshot.forEach((doc) => {
    data.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log(`Fetched ${data.length} records`);
  
  // Create Excel file
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  const filename = `firestore_export_${collectionName}_${Date.now()}.xlsx`;
  const filepath = path.join(__dirname, '../data/excel/', filename);
  
  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  XLSX.writeFile(wb, filepath);
  console.log(`✓ Exported to: ${filepath}`);
}

function saveDataAsExcel(data, filename) {
  let rows = [];
  
  if (data.rows) {
    rows = data.rows;
  } else if (data.data && Array.isArray(data.data)) {
    rows = data.data;
  } else if (data.content) {
    // Parse content if it's JSON string
    try {
      rows = JSON.parse(data.content);
    } catch (e) {
      rows = [data];
    }
  } else {
    rows = [data];
  }
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  const filepath = path.join(__dirname, '../data/excel/', filename);
  XLSX.writeFile(wb, filepath);
  console.log(`✓ Saved to: ${filepath}`);
}

// Run the download
downloadFromFirestore();