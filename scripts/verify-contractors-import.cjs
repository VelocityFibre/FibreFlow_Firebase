const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBvW0JKUf9Ee4P4v1OGJOuNn_vRJTnTKZI",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "346331972805",
  appId: "1:346331972805:web:f0f0330e62c1058f86ecf9",
  measurementId: "G-J0DBQR0BV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyContractorsImport() {
  try {
    console.log('🔍 Checking contractors collection in Firebase...\n');
    
    const contractorsRef = collection(db, 'contractors');
    const snapshot = await getDocs(contractorsRef);
    
    console.log(`📊 Total contractors found: ${snapshot.docs.length}\n`);
    
    if (snapshot.docs.length === 0) {
      console.log('❌ NO CONTRACTORS FOUND IN FIREBASE!');
      console.log('The import may have failed or data was saved to wrong collection.');
      return;
    }
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Document ID: ${doc.id}`);
      console.log(`   Company Name: ${data.companyName || 'MISSING'}`);
      console.log(`   Trading Name: ${data.tradingName || 'MISSING'}`);
      console.log(`   Registration: ${data.registrationNumber || 'MISSING'}`);
      console.log(`   Contact Person: ${data.contactPerson || 'MISSING'}`);
      console.log(`   Email: ${data.email || 'MISSING'}`);
      console.log(`   Phone: ${data.contactNumber || 'MISSING'}`);
      console.log(`   Services: ${JSON.stringify(data.servicesOffered) || 'MISSING'}`);
      console.log(`   Project Zones: ${JSON.stringify(data.projectZones) || 'MISSING'}`);
      console.log(`   Status: ${data.status || 'MISSING'}`);
      console.log(`   Banking Details: ${data.bankingDetails ? 'Present' : 'MISSING'}`);
      
      // Check the full structure
      console.log(`   Full Structure Keys: ${Object.keys(data).join(', ')}`);
      console.log('   ---\n');
    });
    
    console.log('\n🔍 Sample contractor full data:');
    if (snapshot.docs[0]) {
      console.log(JSON.stringify(snapshot.docs[0].data(), null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error verifying contractors:', error);
  }
}

verifyContractorsImport();