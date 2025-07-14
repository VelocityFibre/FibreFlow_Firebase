const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../fibreflow-service-account.json');
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Project codes to check
const PROJECT_CODES = ['MO-001', 'Law-001'];

async function checkAndDeleteBOQ() {
  console.log('🔍 Checking BOQ data for projects: ' + PROJECT_CODES.join(', '));
  console.log('');
  
  try {
    // First, find the project IDs
    console.log('📋 Finding projects...');
    const projectsSnapshot = await db.collection('projects')
      .where('projectCode', 'in', PROJECT_CODES)
      .get();
    
    const projectMap = {};
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      projectMap[doc.id] = {
        name: data.name,
        projectCode: data.projectCode
      };
      console.log(`   ✓ Found: ${data.name} (${data.projectCode}) - ID: ${doc.id}`);
    });
    
    const projectIds = Object.keys(projectMap);
    
    // Check 1: BOQ as subcollections
    console.log('\n📂 Checking BOQ subcollections...');
    for (const [projectId, project] of Object.entries(projectMap)) {
      const boqRef = db.collection('projects').doc(projectId).collection('boq');
      const boqSnapshot = await boqRef.get();
      console.log(`   ${project.name}: ${boqSnapshot.size} items in subcollection`);
      
      if (!boqSnapshot.empty) {
        console.log(`   🗑️  Deleting ${boqSnapshot.size} items...`);
        const batch = db.batch();
        boqSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   ✅ Deleted subcollection items`);
      }
    }
    
    // Check 2: BOQ in main collection filtered by projectId
    console.log('\n📂 Checking main BOQ collection...');
    const mainBoqSnapshot = await db.collection('boq')
      .where('projectId', 'in', projectIds)
      .get();
    
    console.log(`   Found ${mainBoqSnapshot.size} BOQ items in main collection`);
    
    if (!mainBoqSnapshot.empty) {
      console.log('\n📊 BOQ items by project:');
      const itemsByProject = {};
      
      mainBoqSnapshot.forEach(doc => {
        const data = doc.data();
        const projectId = data.projectId;
        if (!itemsByProject[projectId]) {
          itemsByProject[projectId] = [];
        }
        itemsByProject[projectId].push({
          id: doc.id,
          description: data.description || data.name || 'Unknown',
          quantity: data.quantity
        });
      });
      
      for (const [projectId, items] of Object.entries(itemsByProject)) {
        const project = projectMap[projectId];
        console.log(`\n   ${project.name} (${project.projectCode}):`);
        items.forEach(item => {
          console.log(`     - ${item.description} (Qty: ${item.quantity})`);
        });
      }
      
      console.log(`\n🗑️  Deleting ${mainBoqSnapshot.size} BOQ items from main collection...`);
      const batch = db.batch();
      mainBoqSnapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log('✅ Deleted all BOQ items');
    }
    
    // Check 3: Check if projects have boqItems array field
    console.log('\n📂 Checking for boqItems arrays in project documents...');
    for (const [projectId, project] of Object.entries(projectMap)) {
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const data = projectDoc.data();
      
      if (data.boqItems && Array.isArray(data.boqItems)) {
        console.log(`   ${project.name}: Has boqItems array with ${data.boqItems.length} items`);
        console.log('   🗑️  Clearing boqItems array...');
        
        await db.collection('projects').doc(projectId).update({
          boqItems: []
        });
        console.log('   ✅ Cleared boqItems array');
      } else {
        console.log(`   ${project.name}: No boqItems array found`);
      }
    }
    
    console.log('\n✅ BOQ check and deletion completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check and delete
checkAndDeleteBOQ()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });