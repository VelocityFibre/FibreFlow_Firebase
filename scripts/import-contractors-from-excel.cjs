const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const XLSX = require('xlsx');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBvW0JKUf9Ee4P4v1OGJOuNn_vRJTnTKZI",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "346331972805",
  appId: "1:346331972805:web:f0f0330e62c1058f86ecf9",
  measurementId: "G-J0DBQGR0BV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Map Excel columns to contractor model
function mapExcelToContractor(row) {
  return {
    // Basic Information
    companyName: row['Company Registered Name'] || '',
    tradingName: row['Trading Name (if different)'] || row['Company Registered Name'] || '',
    registrationNumber: row['Company Registration Number (CIPC)'] || '',
    vatNumber: row['VAT Number'] || 'Not registered',
    entityType: row['Type of Entity (PTY LTD, CC, Sole Prop, etc.)'] || '',
    
    // Address
    address: {
      street1: String(row['Street Address'] || ''),
      street2: row['Street Address 2'] || '',
      suburb: row['Suburb'] || '',
      city: row['Town/City'] || '',
      postalCode: String(row['Postal Code'] || ''),
      province: row['Province'] || '',
      country: 'South Africa'
    },
    
    // Contact Information
    contactPerson: row['Main Contact'] || '',
    contactTitle: row['Title/Job Description (from Designation/Title)'] || '',
    contactNumber: row['Phone Number (from Mobile Number)'] || '',
    email: row['Email Address'] || '',
    
    // Services and Operations
    servicesOffered: row['Type of Services Offered'] ? [row['Type of Services Offered']] : [],
    regionsOfOperation: row['Region(s) of Operation'] ? [row['Region(s) of Operation']] : [],
    projectZones: row['Project Zone(s) Allocated'] ? [row['Project Zone(s) Allocated']] : [],
    
    // Banking Details
    bankingDetails: {
      accountName: row['Account Name'] || '',
      bankName: row['Bank Name'] || '',
      accountNumber: String(row['Account Number'] || ''),
      branchCode: String(row['Branch Code'] || ''),
      accountType: row['Account Type'] || ''
    },
    
    // Documents Status
    documents: {
      cipcRegistration: !!row['CIPC Registration Certificate'],
      directorIds: !!row["ID's of all Directors"],
      vatCertificate: !!row['VAT Registration Cetificate'],
      taxClearance: !!row['Valid SARS Tax Clearance Certificate'],
      bbbee: !!row['Valid B-BBEE Certificate or Affidavit'],
      bankConfirmation: !!row['Proof of Bank Account (stamped letter or statement'],
      coid: !!row['COID Registration & Letter of Good Standing'],
      publicLiability: !!row['Public Liability Insurance (with coverage amount)']
    },
    
    // Additional Info
    paymentTerms: row['Payment Terms Captured (e.g., 30 Days, Milestone-b'] || '',
    whatsappGroup: row['Contact Added to Contractor WhatsApp Group (if use'] === 'YES',
    
    // Metadata
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function importContractors() {
  try {
    console.log('Starting import (using mock auth)...');
    
    console.log('Reading Excel file...');
    const filePath = '/home/ldp/Downloads/Contractors Onboarding.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} contractors in Excel file`);
    
    // Delete all existing contractors
    console.log('Deleting existing contractors...');
    const contractorsRef = collection(db, 'contractors');
    const snapshot = await getDocs(contractorsRef);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletePromises.length} existing contractors`);
    
    // Import new contractors
    console.log('Importing new contractors...');
    const batch = writeBatch(db);
    let importCount = 0;
    
    for (const row of data) {
      const contractor = mapExcelToContractor(row);
      const docRef = doc(collection(db, 'contractors'));
      batch.set(docRef, contractor);
      importCount++;
      
      console.log(`Preparing: ${contractor.companyName}`);
    }
    
    await batch.commit();
    console.log(`\nSuccessfully imported ${importCount} contractors!`);
    
    // Display summary
    console.log('\nImported Contractors Summary:');
    console.log('=============================');
    data.forEach((row, index) => {
      console.log(`${index + 1}. ${row['Company Registered Name']} - ${row['Type of Services Offered']} - ${row['Project Zone(s) Allocated']}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the import
importContractors();