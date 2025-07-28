import admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
async function initializeAdmin() {
  if (!admin.apps.length) {
    // Check if running locally with service account
    const serviceAccountPath = path.join(__dirname, '../fibreflow-73daf-firebase-adminsdk-ypqad-2d3e7e15bb.json');
    
    try {
      const serviceAccountData = await fs.readFile(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountData);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Initialized Firebase Admin with service account');
    } catch (error) {
      // Try default credentials
      admin.initializeApp();
      console.log('✅ Initialized Firebase Admin with default credentials');
    }
  }
  
  return admin.firestore();
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt user for confirmation
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Delete subcollections
async function deleteSubcollections(db, projectRef, subcollectionNames) {
  const deletedCounts = {};
  
  for (const subcollectionName of subcollectionNames) {
    const subcollectionRef = projectRef.collection(subcollectionName);
    const snapshot = await subcollectionRef.get();
    
    if (!snapshot.empty) {
      const batch = db.batch();
      let count = 0;
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      
      await batch.commit();
      deletedCounts[subcollectionName] = count;
      console.log(`   ✓ Deleted ${count} ${subcollectionName} documents`);
    }
  }
  
  return deletedCounts;
}

// Main deletion function
async function deleteLawleyProject() {
  console.log('🔍 Lawley Project Deletion Script');
  console.log('=================================\n');
  
  const db = await initializeAdmin();
  
  try {
    console.log('🔍 Searching for Lawley project...\n');
    
    // Search for Lawley project by project code or title
    const projectsRef = db.collection('projects');
    let projectDoc = null;
    
    // Try different variations of project code
    const projectCodes = ['LAW-001', 'Law-001', 'law-001'];
    
    for (const code of projectCodes) {
      const codeQuery = await projectsRef.where('projectCode', '==', code).get();
      if (!codeQuery.empty) {
        projectDoc = codeQuery.docs[0];
        break;
      }
    }
    
    // If not found by code, try by title
    if (!projectDoc) {
      const titleQuery = await projectsRef.where('title', '>=', 'Lawley').where('title', '<=', 'Lawley\uf8ff').get();
      if (!titleQuery.empty) {
        projectDoc = titleQuery.docs[0];
      }
    }
    
    if (!projectDoc) {
      console.log('❌ No Lawley project found in the database.');
      rl.close();
      return;
    }
    
    const projectData = projectDoc.data();
    const projectId = projectDoc.id;
    
    console.log('✅ Found Lawley project:');
    console.log(`   ID: ${projectId}`);
    console.log(`   Title: ${projectData.title || 'N/A'}`);
    console.log(`   Project Code: ${projectData.projectCode || 'N/A'}`);
    console.log(`   Client: ${projectData.client?.name || 'N/A'}`);
    console.log(`   Created: ${projectData.createdAt?.toDate() || 'N/A'}\n`);
    
    // Ask for confirmation
    const confirmed = await askConfirmation('⚠️  Are you sure you want to delete this project and all associated data? (yes/no): ');
    
    if (!confirmed) {
      console.log('\n❌ Deletion cancelled.');
      rl.close();
      return;
    }
    
    console.log('\n🗑️  Starting deletion process...\n');
    
    const deletionSummary = {
      project: 1,
      subcollections: {},
      relatedCollections: {}
    };
    
    // 1. Delete subcollections
    console.log('📂 Deleting project subcollections...');
    const subcollections = ['phases', 'steps', 'boq', 'stockAllocations'];
    deletionSummary.subcollections = await deleteSubcollections(db, projectDoc.ref, subcollections);
    
    // 2. Delete related tasks
    console.log('\n📋 Deleting related tasks...');
    const tasksQuery = await db.collection('tasks').where('projectId', '==', projectId).get();
    if (!tasksQuery.empty) {
      const batch = db.batch();
      tasksQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections.tasks = tasksQuery.size;
      console.log(`   ✓ Deleted ${tasksQuery.size} tasks`);
    }
    
    // 3. Delete daily progress entries
    console.log('\n📊 Deleting daily progress entries...');
    const dailyProgressQuery = await db.collection('dailyProgress').where('projectId', '==', projectId).get();
    if (!dailyProgressQuery.empty) {
      const batch = db.batch();
      dailyProgressQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections.dailyProgress = dailyProgressQuery.size;
      console.log(`   ✓ Deleted ${dailyProgressQuery.size} daily progress entries`);
    }
    
    // 4. Delete pole tracker entries
    console.log('\n📍 Deleting pole tracker entries...');
    const poleTrackerQuery = await db.collection('pole-tracker').where('projectId', '==', projectId).get();
    if (!poleTrackerQuery.empty) {
      const batch = db.batch();
      poleTrackerQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections['pole-tracker'] = poleTrackerQuery.size;
      console.log(`   ✓ Deleted ${poleTrackerQuery.size} pole tracker entries`);
    }
    
    // 5. Delete planned poles
    console.log('\n📍 Deleting planned poles...');
    const plannedPolesQuery = await db.collection('planned-poles').where('projectId', '==', projectId).get();
    if (!plannedPolesQuery.empty) {
      const batch = db.batch();
      plannedPolesQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections['planned-poles'] = plannedPolesQuery.size;
      console.log(`   ✓ Deleted ${plannedPolesQuery.size} planned poles`);
    }
    
    // 6. Delete quotes
    console.log('\n💰 Deleting quotes...');
    const quotesQuery = await db.collection('quotes').where('projectId', '==', projectId).get();
    if (!quotesQuery.empty) {
      const batch = db.batch();
      quotesQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections.quotes = quotesQuery.size;
      console.log(`   ✓ Deleted ${quotesQuery.size} quotes`);
    }
    
    // 7. Delete RFQs
    console.log('\n📄 Deleting RFQs...');
    const rfqsQuery = await db.collection('rfqs').where('projectId', '==', projectId).get();
    if (!rfqsQuery.empty) {
      const batch = db.batch();
      rfqsQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections.rfqs = rfqsQuery.size;
      console.log(`   ✓ Deleted ${rfqsQuery.size} RFQs`);
    }
    
    // 8. Delete email logs
    console.log('\n📧 Deleting email logs...');
    const emailLogsQuery = await db.collection('emailLogs').where('metadata.projectId', '==', projectId).get();
    if (!emailLogsQuery.empty) {
      const batch = db.batch();
      emailLogsQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletionSummary.relatedCollections.emailLogs = emailLogsQuery.size;
      console.log(`   ✓ Deleted ${emailLogsQuery.size} email logs`);
    }
    
    // 9. Finally, delete the project itself
    console.log('\n🗑️  Deleting project document...');
    await projectDoc.ref.delete();
    console.log('   ✓ Project document deleted');
    
    // Print summary
    console.log('\n✅ Deletion completed successfully!\n');
    console.log('📊 Deletion Summary:');
    console.log('===================');
    console.log(`Project: ${projectData.title || projectData.projectCode || 'Lawley Project'} (${projectId})`);
    console.log('\nDeleted items:');
    console.log(`  - Project document: 1`);
    
    // Subcollections
    const subcollectionTotal = Object.values(deletionSummary.subcollections).reduce((a, b) => a + b, 0);
    if (subcollectionTotal > 0) {
      console.log(`  - Subcollections: ${subcollectionTotal} documents`);
      for (const [name, count] of Object.entries(deletionSummary.subcollections)) {
        if (count > 0) {
          console.log(`    • ${name}: ${count}`);
        }
      }
    }
    
    // Related collections
    const relatedTotal = Object.values(deletionSummary.relatedCollections).reduce((a, b) => a + b, 0);
    if (relatedTotal > 0) {
      console.log(`  - Related data: ${relatedTotal} documents`);
      for (const [name, count] of Object.entries(deletionSummary.relatedCollections)) {
        if (count > 0) {
          console.log(`    • ${name}: ${count}`);
        }
      }
    }
    
    const totalDeleted = 1 + subcollectionTotal + relatedTotal;
    console.log(`\nTotal documents deleted: ${totalDeleted}`);
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error);
  } finally {
    rl.close();
  }
}

// Run the deletion script
deleteLawleyProject()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });