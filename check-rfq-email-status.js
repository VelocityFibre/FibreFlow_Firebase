// Check email status for RFQ-2025-435341
// Run this in the browser console

async function checkRFQEmailStatus() {
  try {
    const { getFirestore, collection, query, where, getDocs, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js');
    
    const db = getFirestore();
    
    // Check the specific RFQ
    console.log('Checking RFQ 3pWVoYE4wwrtzvAV1Na5...');
    const rfqRef = doc(db, 'rfqs', '3pWVoYE4wwrtzvAV1Na5');
    const rfqSnap = await getDoc(rfqRef);
    
    if (rfqSnap.exists()) {
      const rfqData = rfqSnap.data();
      console.log('RFQ Status:', {
        rfqNumber: rfqData.rfqNumber,
        status: rfqData.status,
        manualEmails: rfqData.manualEmails,
        sentAt: rfqData.sentAt,
        createdAt: rfqData.createdAt
      });
    }
    
    // Check emailLogs collection
    console.log('\nChecking emailLogs collection...');
    const emailLogsRef = collection(db, 'emailLogs');
    const emailLogsQuery = query(emailLogsRef);
    const emailLogsSnapshot = await getDocs(emailLogsQuery);
    
    console.log(`Found ${emailLogsSnapshot.size} email logs total`);
    
    const rfqEmails = [];
    emailLogsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.metadata?.rfqNumber === 'RFQ-2025-435341' || 
          data.metadata?.rfqId === '3pWVoYE4wwrtzvAV1Na5' ||
          data.subject?.includes('RFQ-2025-435341')) {
        rfqEmails.push({ id: doc.id, ...data });
      }
    });
    
    if (rfqEmails.length > 0) {
      console.log(`\nFound ${rfqEmails.length} emails for RFQ-2025-435341:`);
      rfqEmails.forEach(email => {
        console.log('Email:', {
          id: email.id,
          to: email.to,
          subject: email.subject,
          status: email.status,
          createdAt: email.createdAt
        });
      });
    } else {
      console.log('\nNo emails found for RFQ-2025-435341 in emailLogs');
    }
    
    // Check mail collection (Firebase Email Extension)
    console.log('\nChecking mail collection...');
    const mailRef = collection(db, 'mail');
    const mailSnapshot = await getDocs(mailRef);
    
    console.log(`Found ${mailSnapshot.size} emails in mail collection`);
    
    const rfqMails = [];
    mailSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.message?.subject?.includes('RFQ-2025-435341') ||
          data.to?.includes('louisrdup@gmail.com')) {
        rfqMails.push({ id: doc.id, ...data });
      }
    });
    
    if (rfqMails.length > 0) {
      console.log(`\nFound ${rfqMails.length} emails in mail collection:`);
      rfqMails.forEach(mail => {
        console.log('Mail:', {
          id: mail.id,
          to: mail.to,
          subject: mail.message?.subject,
          delivery: mail.delivery
        });
      });
    } else {
      console.log('\nNo emails found in mail collection for this RFQ');
    }
    
  } catch (error) {
    console.error('Error checking email status:', error);
  }
}

// Run the function
checkRFQEmailStatus();