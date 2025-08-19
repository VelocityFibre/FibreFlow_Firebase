const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');

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

async function fixContractorDataStructure() {
  try {
    console.log('🔧 Fixing contractor data structure to match the expected model...\n');
    
    const contractorsRef = collection(db, 'contractors');
    const snapshot = await getDocs(contractorsRef);
    
    console.log(`📊 Found ${snapshot.docs.length} contractors to fix\n`);
    
    const batch = writeBatch(db);
    let fixCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const oldData = docSnapshot.data();
      const docRef = doc(db, 'contractors', docSnapshot.id);
      
      // Transform the data structure to match the expected model
      const fixedData = {
        // Basic Information (keep as is)
        companyName: oldData.companyName || '',
        registrationNumber: oldData.registrationNumber || '',
        vatNumber: oldData.vatNumber || '',
        
        // Transform contact details to nested structure
        primaryContact: {
          name: oldData.contactPerson || '',
          email: oldData.email || '',
          phone: oldData.contactNumber || '',
          role: oldData.contactTitle || ''
        },
        
        // Transform address to physicalAddress
        physicalAddress: {
          street: `${oldData.address?.street1 || ''} ${oldData.address?.street2 || ''}`.trim(),
          city: oldData.address?.city || '',
          province: oldData.address?.province || '',
          postalCode: oldData.address?.postalCode || ''
        },
        
        // Transform capabilities
        capabilities: {
          services: oldData.servicesOffered || [],
          maxTeams: 1,
          equipment: [],
          certifications: []
        },
        
        // Transform compliance
        compliance: {
          safetyRating: 0,
          bbbeeLevel: 1
        },
        
        // Transform financial details
        financial: {
          bankName: oldData.bankingDetails?.bankName || '',
          accountNumber: oldData.bankingDetails?.accountNumber || '',
          branchCode: oldData.bankingDetails?.branchCode || '',
          accountType: oldData.bankingDetails?.accountType?.toLowerCase() === 'savings' ? 'savings' : 'current',
          paymentTerms: parseInt(oldData.paymentTerms?.match(/\d+/)?.[0] || '30'),
          creditLimit: 0
        },
        
        // Status and metadata
        status: oldData.status || 'active',
        onboardingStatus: 'approved',
        createdAt: oldData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'import-script',
        
        // Keep project zones as metadata for now
        projectZones: oldData.projectZones || [],
        regionsOfOperation: oldData.regionsOfOperation || [],
        
        // Keep document status
        documents: oldData.documents || {}
      };
      
      batch.update(docRef, fixedData);
      fixCount++;
      
      console.log(`${fixCount}. Fixed: ${oldData.companyName}`);
      console.log(`   - Contact: ${fixedData.primaryContact.name} (${fixedData.primaryContact.email})`);
      console.log(`   - Address: ${fixedData.physicalAddress.street}, ${fixedData.physicalAddress.city}`);
      console.log(`   - Banking: ${fixedData.financial.bankName} (${fixedData.financial.accountType})`);
      console.log('   ---');
    }
    
    await batch.commit();
    console.log(`\n✅ Successfully fixed ${fixCount} contractor records!`);
    
  } catch (error) {
    console.error('❌ Error fixing contractor data:', error);
  }
}

fixContractorDataStructure();