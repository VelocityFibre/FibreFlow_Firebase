#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkPropertyDetailed() {
  try {
    const doc = await db.collection('vf-onemap-processed-records').doc('308025').get();
    
    if (!doc.exists) {
      console.log('Property 308025 not found!');
      return;
    }
    
    const data = doc.data();
    console.log('\n📋 Property 308025 Status History (Chronological Order):');
    
    if (data.statusHistory && data.statusHistory.length > 0) {
      // Sort by date
      const sorted = [...data.statusHistory].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
      
      sorted.forEach((entry, index) => {
        console.log(`\n${index + 1}. Date: ${entry.date}`);
        console.log(`   Status: "${entry.status}"`);
        console.log(`   File: ${entry.fileName}`);
        console.log(`   Batch: ${entry.batchId}`);
        console.log(`   Import Time: ${entry.timestamp}`);
        
        // Highlight June 30 and July 14
        if (entry.date === '2025-06-30' || entry.date === '2025-07-14') {
          console.log('   ⚠️  THIS IS ONE OF THE DATES IN QUESTION!');
        }
      });
    }
    
    // Check for any entries around those dates
    console.log('\n🔍 Looking for entries near June 30 and July 14:');
    const june30 = new Date('2025-06-30');
    const july14 = new Date('2025-07-14');
    
    if (data.statusHistory) {
      data.statusHistory.forEach(entry => {
        const entryDate = new Date(entry.date);
        const daysFromJune30 = Math.abs((entryDate - june30) / (1000 * 60 * 60 * 24));
        const daysFromJuly14 = Math.abs((entryDate - july14) / (1000 * 60 * 60 * 24));
        
        if (daysFromJune30 <= 2) {
          console.log(`\n   Near June 30 (${daysFromJune30} days away):`);
          console.log(`   ${entry.date}: "${entry.status}"`);
        }
        if (daysFromJuly14 <= 2) {
          console.log(`\n   Near July 14 (${daysFromJuly14} days away):`);
          console.log(`   ${entry.date}: "${entry.status}"`);
        }
      });
    }
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPropertyDetailed();