// Browser console script to check for RFQ-2025-466621 email
// Copy and paste this into the browser console while logged into FibreFlow

(async function checkRFQEmail() {
  console.log('%c🔍 Searching for RFQ-2025-466621...', 'color: blue; font-weight: bold');

  try {
    // Get Firestore instance from Angular app
    const db = firebase.firestore();
    
    // Step 1: Search for RFQ in all projects' RFQ subcollections
    console.log('\n📁 Step 1: Searching for RFQ document...');
    const projectsSnapshot = await db.collection('projects').get();
    let rfqFound = null;
    let projectId = null;

    for (const projectDoc of projectsSnapshot.docs) {
      const rfqSnapshot = await db
        .collection('projects')
        .doc(projectDoc.id)
        .collection('rfqs')
        .where('rfqNumber', '==', 'RFQ-2025-466621')
        .get();

      if (!rfqSnapshot.empty) {
        rfqFound = rfqSnapshot.docs[0];
        projectId = projectDoc.id;
        console.log(`%c✓ Found RFQ in project: ${projectId}`, 'color: green');
        console.log('Document ID:', rfqFound.id);
        console.log('RFQ Data:', rfqFound.data());
        break;
      }
    }

    if (!rfqFound) {
      console.log('%c✗ RFQ-2025-466621 not found in any project', 'color: red');
    }

    // Step 2: Search for emails in the mail collection
    console.log('\n📧 Step 2: Searching for related emails in mail collection...');
    
    // Get recent emails and search for RFQ number
    const mailSnapshot = await db
      .collection('mail')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

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
      console.log('\n📬 Email Details:');
      relevantEmails.forEach(({ id, data }, index) => {
        console.log(`\n--- Email ${index + 1} ---`);
        console.log('Email ID:', id);
        console.log('To:', Array.isArray(data.to) ? data.to.join(', ') : data.to);
        console.log('Subject:', data.message?.subject || 'N/A');
        console.log('Created:', data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
        
        // Delivery information
        if (data.delivery) {
          console.log('%cDelivery Status:', 'font-weight: bold');
          console.log('  State:', data.delivery.state);
          if (data.delivery.attempts) {
            console.log('  Attempts:', data.delivery.attempts);
          }
          if (data.delivery.error) {
            console.log('  %cError:', 'color: red', data.delivery.error);
          }
          if (data.delivery.endTime) {
            console.log('  Delivered at:', data.delivery.endTime.toDate());
          }
        }
        
        // Message preview
        if (data.message?.text) {
          console.log('Message Preview:', data.message.text.substring(0, 200) + '...');
        }
      });
    } else {
      console.log('%c✗ No emails found related to RFQ-2025-466621', 'color: orange');
    }

    // Step 3: Check last 5 emails for debugging
    console.log('\n📋 Step 3: Recent emails (last 5):');
    const recentMails = await db
      .collection('mail')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    recentMails.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. Email ID: ${doc.id}`);
      console.log('   To:', data.to || 'N/A');
      console.log('   Subject:', data.message?.subject || 'N/A');
      console.log('   Created:', data.createdAt?.toDate ? data.createdAt.toDate() : 'N/A');
      console.log('   Status:', data.delivery?.state || 'PENDING');
    });

  } catch (error) {
    console.error('%c❌ Error:', 'color: red', error.message);
    console.log('Make sure you are logged into FibreFlow and have the necessary permissions.');
  }
})();