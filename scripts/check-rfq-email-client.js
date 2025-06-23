// This script uses the client-side Firebase SDK to check for RFQ emails
// Run with: node scripts/check-rfq-email-client.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, orderBy, limit, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126",
  measurementId: "G-J0P7YRLGPW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkRFQEmail() {
  console.log('Searching for RFQ-2025-466621...\n');

  try {
    // First, we need to authenticate
    console.log('Please authenticate to access Firestore...');
    console.log('You can modify this script to use your credentials or run it in the browser console.');
    
    // For now, let's try to query without authentication (if rules allow)
    
    // Step 1: Search for RFQ in projects
    console.log('\nStep 1: Searching for RFQ document...');
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    
    let rfqFound = null;
    let projectId = null;

    for (const projectDoc of projectsSnapshot.docs) {
      const rfqsRef = collection(db, 'projects', projectDoc.id, 'rfqs');
      const rfqQuery = query(rfqsRef, where('rfqNumber', '==', 'RFQ-2025-466621'));
      const rfqSnapshot = await getDocs(rfqQuery);

      if (!rfqSnapshot.empty) {
        rfqFound = rfqSnapshot.docs[0];
        projectId = projectDoc.id;
        console.log(`✓ Found RFQ in project: ${projectId}`);
        console.log(`  Document ID: ${rfqFound.id}`);
        console.log(`  RFQ Data:`, JSON.stringify(rfqFound.data(), null, 2));
        break;
      }
    }

    if (!rfqFound) {
      console.log('✗ RFQ-2025-466621 not found in any project');
    }

    // Step 2: Search for emails in the mail collection
    console.log('\nStep 2: Searching for related emails in mail collection...');
    
    // Get recent emails
    const mailRef = collection(db, 'mail');
    const recentMailQuery = query(mailRef, orderBy('createdAt', 'desc'), limit(50));
    const mailSnapshot = await getDocs(recentMailQuery);

    const relevantEmails = [];
    mailSnapshot.forEach(doc => {
      const data = doc.data();
      const content = JSON.stringify(data).toLowerCase();
      if (content.includes('rfq-2025-466621')) {
        relevantEmails.push({ id: doc.id, data });
      }
    });

    console.log(`Found ${relevantEmails.length} emails containing RFQ-2025-466621`);

    // Display email details
    if (relevantEmails.length > 0) {
      console.log('\nEmail Details:');
      relevantEmails.forEach(({ id, data }) => {
        displayEmailInfo(id, data);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'permission-denied') {
      console.log('\nPermission denied. This script needs authentication.');
      console.log('Please run this code in the browser console while logged in, or add authentication credentials.');
    }
  }
}

function displayEmailInfo(id, data) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Email ID: ${id}`);
  console.log(`To: ${Array.isArray(data.to) ? data.to.join(', ') : data.to}`);
  console.log(`Subject: ${data.message?.subject || 'N/A'}`);
  console.log(`Created: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`);
  
  // Delivery information
  if (data.delivery) {
    console.log(`Delivery State: ${data.delivery.state}`);
    if (data.delivery.attempts) {
      console.log(`Delivery Attempts: ${data.delivery.attempts}`);
    }
    if (data.delivery.error) {
      console.log(`Delivery Error: ${data.delivery.error}`);
    }
  }
  
  // Message preview
  if (data.message?.text) {
    console.log(`Message Preview: ${data.message.text.substring(0, 200)}...`);
  }
}

// Run the check
checkRFQEmail();