#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-d7bbe-firebase-adminsdk.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fibreflow-d7bbe.firebaseio.com'
});

const db = admin.firestore();

async function checkIvoryParkBOQ() {
  try {
    console.log('Checking for Ivory Park project...\n');
    
    // First, find the Ivory Park project
    const projectsSnapshot = await db.collection('projects')
      .where('title', '==', 'Ivory Park')
      .get();
    
    if (projectsSnapshot.empty) {
      console.log('No project found with title "Ivory Park"');
      
      // Let's list all projects to see what we have
      console.log('\nListing all projects:');
      const allProjectsSnapshot = await db.collection('projects').get();
      allProjectsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.title} (ID: ${doc.id})`);
      });
      return;
    }
    
    const projectDoc = projectsSnapshot.docs[0];
    const projectData = projectDoc.data();
    const projectId = projectDoc.id;
    
    console.log(`Found project: ${projectData.title}`);
    console.log(`Project ID: ${projectId}`);
    console.log(`Status: ${projectData.status}`);
    console.log(`Type: ${projectData.type}\n`);
    
    // Now check BOQ items for this project
    console.log('Checking BOQ items...\n');
    
    const boqSnapshot = await db.collection('boqItems')
      .where('projectId', '==', projectId)
      .get();
    
    console.log(`Total BOQ items: ${boqSnapshot.size}`);
    
    if (boqSnapshot.size > 0) {
      let totalValue = 0;
      let allocatedValue = 0;
      let itemsNeedingQuotes = 0;
      
      console.log('\nCalculating summary values...');
      
      boqSnapshot.forEach(doc => {
        const item = doc.data();
        
        // Calculate total value
        const itemTotal = item.requiredQuantity * item.unitPrice;
        totalValue += itemTotal;
        
        // Calculate allocated value
        const itemAllocated = item.allocatedQuantity * item.unitPrice;
        allocatedValue += itemAllocated;
        
        // Count items needing quotes
        if (item.needsQuote) {
          itemsNeedingQuotes++;
        }
      });
      
      console.log(`\nBOQ Summary:`);
      console.log(`- Total Items: ${boqSnapshot.size}`);
      console.log(`- Total Value: R${totalValue.toFixed(2)}`);
      console.log(`- Allocated Value: R${allocatedValue.toFixed(2)}`);
      console.log(`- Items Needing Quotes: ${itemsNeedingQuotes}`);
      
      // Show first 5 items as examples
      console.log('\nFirst 5 BOQ items:');
      const items = boqSnapshot.docs.slice(0, 5);
      items.forEach((doc, index) => {
        const item = doc.data();
        console.log(`\n${index + 1}. ${item.description}`);
        console.log(`   Code: ${item.itemCode}`);
        console.log(`   Required: ${item.requiredQuantity} ${item.unit}`);
        console.log(`   Allocated: ${item.allocatedQuantity} ${item.unit}`);
        console.log(`   Unit Price: R${item.unitPrice}`);
        console.log(`   Total Price: R${item.totalPrice}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Needs Quote: ${item.needsQuote ? 'Yes' : 'No'}`);
      });
      
      // Check for any items with allocated quantities
      const allocatedItems = boqSnapshot.docs.filter(doc => doc.data().allocatedQuantity > 0);
      console.log(`\n\nItems with allocations: ${allocatedItems.length}`);
      
      if (allocatedItems.length > 0) {
        console.log('\nAllocated items:');
        allocatedItems.forEach((doc, index) => {
          const item = doc.data();
          console.log(`${index + 1}. ${item.description}: ${item.allocatedQuantity} ${item.unit} allocated`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkIvoryParkBOQ();