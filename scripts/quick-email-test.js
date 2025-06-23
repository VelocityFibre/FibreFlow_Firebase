const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, onSnapshot } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBqT_PgqFfU2e3sTmuV1LKS3L0fXtopnKQ",
  authDomain: "velocity-fibre.firebaseapp.com",
  projectId: "velocity-fibre",
  storageBucket: "velocity-fibre.appspot.com",
  messagingSenderId: "400035355115",
  appId: "1:400035355115:web:e16419b8498ab5d4dcaccc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sendTestEmail() {
  try {
    console.log('📧 Sending test email to louisrdup@gmail.com...');
    
    const emailData = {
      to: ['louisrdup@gmail.com'],
      message: {
        subject: 'Test Email from FibreFlow - Firebase Extension Working!',
        text: 'This is a test email from FibreFlow.\n\nThe Firebase Email Extension is working correctly!\n\nSent at: ' + new Date().toLocaleString(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Test Email from FibreFlow</h2>
            <p>The Firebase Email Extension is <strong>working correctly</strong>!</p>
            <p style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
              ✅ Email sent successfully<br>
              📅 Sent at: ${new Date().toLocaleString()}
            </p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px;">This is an automated test email from your FibreFlow application.</p>
          </div>
        `
      }
    };

    const docRef = await addDoc(collection(db, 'mail'), emailData);
    console.log('✅ Email document created with ID:', docRef.id);
    console.log('📬 Email queued for delivery!');
    
    // Monitor delivery status
    console.log('\n⏳ Monitoring delivery status for 30 seconds...\n');
    
    const unsubscribe = onSnapshot(doc(db, 'mail', docRef.id), (snapshot) => {
      const data = snapshot.data();
      if (data?.delivery) {
        console.log('📊 Delivery status update:');
        console.log('  State:', data.delivery.state || 'PROCESSING');
        
        if (data.delivery.state === 'SUCCESS') {
          console.log('  ✅ Email delivered successfully!');
          if (data.delivery.info) {
            console.log('  Message ID:', data.delivery.info.messageId);
            console.log('  Accepted:', data.delivery.info.accepted);
          }
          unsubscribe();
          process.exit(0);
        } else if (data.delivery.state === 'ERROR') {
          console.log('  ❌ Delivery failed:', data.delivery.error);
          unsubscribe();
          process.exit(1);
        }
      }
    });

    // Stop monitoring after 30 seconds
    setTimeout(() => {
      console.log('\n⏱️  Timeout reached. Check Firestore console for delivery status.');
      unsubscribe();
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendTestEmail();