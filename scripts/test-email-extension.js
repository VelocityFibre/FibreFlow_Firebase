#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Note: This assumes you have set up Application Default Credentials
// or have a service account key file available
try {
  admin.initializeApp({
    projectId: 'fibreflow-d5ab0', // Replace with your actual project ID if different
  });
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

async function sendTestEmail() {
  try {
    // Create the email document
    const emailDoc = {
      to: 'louisrdup@gmail.com',
      message: {
        subject: 'Test Email from FibreFlow',
        text: 'This is a test email sent from the FibreFlow application using the Firebase Email Extension.',
        html: `
          <h1>Test Email from FibreFlow</h1>
          <p>This is a test email sent from the FibreFlow application using the Firebase Email Extension.</p>
          <p>If you're receiving this, the email extension is working correctly!</p>
          <hr>
          <p><small>Sent at: ${new Date().toISOString()}</small></p>
        `
      },
      // Optional: Add delivery options
      delivery: {
        startTime: new Date().toISOString(),
        attempts: 3,
        backoffMs: 1000
      }
    };

    console.log('Adding email document to Firestore...');
    
    // Add the document to the mail collection
    const docRef = await db.collection('mail').add(emailDoc);
    
    console.log('✅ Email document created successfully!');
    console.log('Document ID:', docRef.id);
    console.log('Email will be sent to:', emailDoc.to);
    
    // Optional: Monitor the document for delivery status
    console.log('\nMonitoring delivery status for 10 seconds...');
    
    const unsubscribe = docRef.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (data?.delivery?.state) {
        console.log('Delivery state:', data.delivery.state);
        if (data.delivery.state === 'SUCCESS') {
          console.log('✅ Email delivered successfully!');
          unsubscribe();
          process.exit(0);
        } else if (data.delivery.state === 'ERROR') {
          console.error('❌ Email delivery failed:', data.delivery.error);
          unsubscribe();
          process.exit(1);
        }
      }
    });
    
    // Stop monitoring after 10 seconds
    setTimeout(() => {
      console.log('Stopping delivery monitoring...');
      unsubscribe();
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    process.exit(1);
  }
}

// Run the test
console.log('🚀 Starting email test...');
sendTestEmail();