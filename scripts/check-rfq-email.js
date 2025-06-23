const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkRFQEmail() {
  console.log('Searching for RFQ-2025-466621...\n');

  try {
    // Step 1: Search for RFQ in all projects' RFQ subcollections
    console.log('Step 1: Searching for RFQ document...');
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
    
    // Search by subject containing RFQ number
    const mailBySubject = await db
      .collection('mail')
      .where('message.subject', '>=', 'RFQ-2025-466621')
      .where('message.subject', '<=', 'RFQ-2025-466621\uf8ff')
      .get();

    console.log(`Found ${mailBySubject.size} emails with RFQ number in subject`);

    // Also search in the message content
    const mailByContent = await db
      .collection('mail')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const relevantEmails = [];
    mailByContent.forEach(doc => {
      const data = doc.data();
      const content = JSON.stringify(data).toLowerCase();
      if (content.includes('rfq-2025-466621')) {
        relevantEmails.push({ id: doc.id, data });
      }
    });

    console.log(`Found ${relevantEmails.length} emails containing RFQ-2025-466621 in content`);

    // Step 3: Display email details
    if (mailBySubject.size > 0 || relevantEmails.length > 0) {
      console.log('\nEmail Details:');
      
      // Process emails found by subject
      mailBySubject.forEach(doc => {
        displayEmailInfo(doc.id, doc.data());
      });

      // Process emails found in content
      relevantEmails.forEach(({ id, data }) => {
        displayEmailInfo(id, data);
      });
    } else {
      console.log('✗ No emails found related to RFQ-2025-466621');
    }

    // Step 4: Check recent emails for debugging
    console.log('\nStep 3: Checking last 5 emails in mail collection...');
    const recentMails = await db
      .collection('mail')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    console.log(`Recent emails (${recentMails.size} found):`);
    recentMails.forEach(doc => {
      const data = doc.data();
      console.log(`\n- Email ID: ${doc.id}`);
      console.log(`  To: ${data.to || 'N/A'}`);
      console.log(`  Subject: ${data.message?.subject || 'N/A'}`);
      console.log(`  Created: ${data.createdAt?.toDate() || 'N/A'}`);
      console.log(`  Delivery Status: ${data.delivery?.state || 'PENDING'}`);
    });

  } catch (error) {
    console.error('Error searching for RFQ email:', error);
  } finally {
    await admin.app().delete();
  }
}

function displayEmailInfo(id, data) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Email ID: ${id}`);
  console.log(`To: ${Array.isArray(data.to) ? data.to.join(', ') : data.to}`);
  console.log(`Subject: ${data.message?.subject || 'N/A'}`);
  console.log(`Created: ${data.createdAt?.toDate() || 'N/A'}`);
  
  // Delivery information
  if (data.delivery) {
    console.log(`Delivery State: ${data.delivery.state}`);
    if (data.delivery.attempts) {
      console.log(`Delivery Attempts: ${data.delivery.attempts}`);
    }
    if (data.delivery.error) {
      console.log(`Delivery Error: ${data.delivery.error}`);
    }
    if (data.delivery.leaseExpireTime) {
      console.log(`Lease Expire Time: ${data.delivery.leaseExpireTime.toDate()}`);
    }
    if (data.delivery.startTime) {
      console.log(`Start Time: ${data.delivery.startTime.toDate()}`);
    }
    if (data.delivery.endTime) {
      console.log(`End Time: ${data.delivery.endTime.toDate()}`);
    }
  }
  
  // Message preview
  if (data.message?.text) {
    console.log(`Message Preview: ${data.message.text.substring(0, 200)}...`);
  }
}

// Run the check
checkRFQEmail();