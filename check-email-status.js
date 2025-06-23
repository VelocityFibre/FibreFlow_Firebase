// Check email status for RFQ-2025-466621
// Run this in the browser console while on the FibreFlow app

async function checkRFQEmailStatus() {
  try {
    const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js');
    
    const db = getFirestore();
    
    // Check emailLogs collection
    console.log('Checking emailLogs collection...');
    const emailLogsRef = collection(db, 'emailLogs');
    const emailLogsQuery = query(emailLogsRef);
    const emailLogsSnapshot = await getDocs(emailLogsQuery);
    
    console.log(`Found ${emailLogsSnapshot.size} email logs total`);
    
    const rfqEmails = [];
    emailLogsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.metadata?.rfqNumber === 'RFQ-2025-466621' || 
          data.subject?.includes('RFQ-2025-466621')) {
        rfqEmails.push({ id: doc.id, ...data });
      }
    });
    
    if (rfqEmails.length > 0) {
      console.log(`Found ${rfqEmails.length} emails for RFQ-2025-466621:`);
      rfqEmails.forEach(email => {
        console.log('Email:', {
          id: email.id,
          to: email.to,
          from: email.from,
          subject: email.subject,
          status: email.status,
          createdAt: email.createdAt?.toDate ? email.createdAt.toDate() : email.createdAt,
          sentAt: email.sentAt?.toDate ? email.sentAt.toDate() : email.sentAt,
          metadata: email.metadata
        });
      });
    } else {
      console.log('No emails found in emailLogs for RFQ-2025-466621');
    }
    
    // Check mail collection (Firebase Email Extension)
    console.log('\nChecking mail collection (Firebase Email Extension)...');
    const mailRef = collection(db, 'mail');
    const mailSnapshot = await getDocs(mailRef);
    
    console.log(`Found ${mailSnapshot.size} emails in mail collection`);
    
    const rfqMails = [];
    mailSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.message?.subject?.includes('RFQ-2025-466621') ||
          data.delivery?.rfqNumber === 'RFQ-2025-466621') {
        rfqMails.push({ id: doc.id, ...data });
      }
    });
    
    if (rfqMails.length > 0) {
      console.log(`Found ${rfqMails.length} emails for RFQ-2025-466621 in mail collection:`);
      rfqMails.forEach(mail => {
        console.log('Mail:', {
          id: mail.id,
          to: mail.to,
          subject: mail.message?.subject,
          delivery: mail.delivery,
          createdAt: mail.createdAt
        });
      });
    } else {
      console.log('No emails found in mail collection for RFQ-2025-466621');
    }
    
    // Check RFQ status
    console.log('\nChecking RFQ status...');
    const rfqsRef = collection(db, 'rfqs');
    const rfqQuery = query(rfqsRef, where('rfqNumber', '==', 'RFQ-2025-466621'));
    const rfqSnapshot = await getDocs(rfqQuery);
    
    if (!rfqSnapshot.empty) {
      const rfqDoc = rfqSnapshot.docs[0];
      const rfqData = rfqDoc.data();
      console.log('RFQ Status:', {
        id: rfqDoc.id,
        rfqNumber: rfqData.rfqNumber,
        status: rfqData.status,
        sentAt: rfqData.sentAt,
        supplierIds: rfqData.supplierIds,
        supplierCount: rfqData.supplierIds?.length || 0
      });
    } else {
      console.log('RFQ-2025-466621 not found');
    }
    
  } catch (error) {
    console.error('Error checking email status:', error);
  }
}

// Run the function
checkRFQEmailStatus();