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

async function deepCheckProject(projectId) {
  console.log(`\n🔍 Deep checking project: ${projectId}\n`);
  
  try {
    // 1. Get the project document
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      console.log('❌ Project not found!');
      return;
    }
    
    const projectData = projectDoc.data();
    console.log('📋 Project Details:');
    console.log(`   Name: ${projectData.name}`);
    console.log(`   Code: ${projectData.projectCode}`);
    console.log(`   Status: ${projectData.status}`);
    
    // 2. Check all fields that might contain BOQ
    console.log('\n📊 Checking project fields for BOQ data:');
    const boqRelatedFields = ['boq', 'boqItems', 'billOfQuantities', 'materials', 'inventory'];
    
    for (const field of boqRelatedFields) {
      if (projectData[field] !== undefined) {
        console.log(`   ✓ Found field "${field}":`, typeof projectData[field]);
        if (Array.isArray(projectData[field])) {
          console.log(`     - Array with ${projectData[field].length} items`);
        } else if (typeof projectData[field] === 'object') {
          console.log(`     - Object with keys:`, Object.keys(projectData[field]));
        }
      }
    }
    
    // 3. List ALL subcollections
    console.log('\n📂 Checking ALL subcollections:');
    const subcollections = ['boq', 'materials', 'billOfQuantities', 'items', 'inventory'];
    
    for (const subcol of subcollections) {
      const snapshot = await db.collection('projects').doc(projectId).collection(subcol).get();
      if (!snapshot.empty) {
        console.log(`   ✓ ${subcol}: ${snapshot.size} documents`);
        // Show first few items
        let count = 0;
        snapshot.forEach(doc => {
          if (count < 3) {
            const data = doc.data();
            console.log(`     - ${doc.id}: ${data.description || data.name || 'No description'}`);
            count++;
          }
        });
        if (snapshot.size > 3) {
          console.log(`     ... and ${snapshot.size - 3} more`);
        }
      }
    }
    
    // 4. Check related collections
    console.log('\n📂 Checking related collections:');
    const relatedCollections = [
      { name: 'boq', field: 'projectId' },
      { name: 'materials', field: 'projectId' },
      { name: 'projectMaterials', field: 'projectId' },
      { name: 'projectBoq', field: 'projectId' },
      { name: 'stock', field: 'projectId' }
    ];
    
    for (const col of relatedCollections) {
      try {
        const snapshot = await db.collection(col.name)
          .where(col.field, '==', projectId)
          .limit(5)
          .get();
        
        if (!snapshot.empty) {
          console.log(`   ✓ ${col.name}: ${snapshot.size} documents`);
          snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`     - ${doc.id}: ${data.description || data.name || 'No description'}`);
          });
        }
      } catch (e) {
        // Collection might not exist
      }
    }
    
    // 5. Show all fields in project document
    console.log('\n📄 All project document fields:');
    Object.keys(projectData).sort().forEach(key => {
      const value = projectData[key];
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          console.log(`   ${key}: [Array with ${value.length} items]`);
        } else if (value.toDate) {
          console.log(`   ${key}: ${value.toDate()}`);
        } else {
          console.log(`   ${key}: [Object]`);
        }
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check Mohadin project specifically
deepCheckProject('o2cF0JNv5yvCyQcj6tNk')
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });