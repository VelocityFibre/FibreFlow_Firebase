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

// Project codes to clear BOQ for
const PROJECT_CODES = ['MO-001', 'Law-001'];

async function deleteProjectBOQ() {
  console.log('🗑️  Deleting BOQ data for projects: ' + PROJECT_CODES.join(', '));
  console.log('');
  
  try {
    // First, find the project IDs by project codes
    console.log('🔍 Finding projects...');
    const projectsSnapshot = await db.collection('projects')
      .where('projectCode', 'in', PROJECT_CODES)
      .get();
    
    if (projectsSnapshot.empty) {
      console.log('❌ No projects found with codes: ' + PROJECT_CODES.join(', '));
      return;
    }
    
    const projects = [];
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: data.name,
        projectCode: data.projectCode
      });
      console.log(`   ✓ Found: ${data.name} (${data.projectCode})`);
    });
    
    console.log('\n🗑️  Deleting BOQ subcollections...');
    
    for (const project of projects) {
      console.log(`\n📋 Processing ${project.name} (${project.projectCode}):`);
      
      // Get BOQ subcollection
      const boqRef = db.collection('projects').doc(project.id).collection('boq');
      const boqSnapshot = await boqRef.get();
      
      if (boqSnapshot.empty) {
        console.log('   ℹ️  No BOQ items found');
        continue;
      }
      
      console.log(`   📊 Found ${boqSnapshot.size} BOQ items`);
      
      // Delete in batches
      const batch = db.batch();
      let batchCount = 0;
      
      boqSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        batchCount++;
        
        // Commit every 500 documents
        if (batchCount >= 500) {
          batch.commit();
          batchCount = 0;
        }
      });
      
      // Commit remaining
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`   ✅ Deleted ${boqSnapshot.size} BOQ items`);
    }
    
    console.log('\n✅ BOQ deletion completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the deletion
deleteProjectBOQ()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });