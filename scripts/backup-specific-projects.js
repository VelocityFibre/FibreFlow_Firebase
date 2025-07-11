const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to initialize with application default credentials
    admin.initializeApp({
      projectId: 'fibreflow-73daf',
    });
    console.log('✅ Initialized Firebase Admin with default application credentials');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.log('\n📝 To run this backup script, you need to:');
    console.log('1. Install Firebase CLI: npm install -g firebase-tools');
    console.log('2. Login to Firebase: firebase login');
    console.log('3. Set the project: firebase use fibreflow-73daf');
    console.log('4. Run the script again\n');
    process.exit(1);
  }
}

const db = admin.firestore();

// Projects to backup
const PROJECT_CODES = ['MO-001', 'Law-001'];
const PROJECT_NAMES = {
  'MO-001': 'Mohadin',
  'Law-001': 'Lawley'
};

// Helper function to convert Firestore timestamps
function convertTimestamps(obj) {
  if (!obj) return obj;
  
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertTimestamps(item));
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestamps(value);
    }
    return converted;
  }
  
  return obj;
}

// Get all documents from a collection with optional query
async function getCollectionData(collectionName, query = null) {
  console.log(`  📥 Fetching ${collectionName}...`);
  
  let ref = db.collection(collectionName);
  if (query) {
    ref = query(ref);
  }
  
  const snapshot = await ref.get();
  const documents = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    documents.push({
      id: doc.id,
      ...convertTimestamps(data)
    });
  });
  
  console.log(`     ✓ Found ${documents.length} documents`);
  return documents;
}

// Get subcollection data
async function getSubcollectionData(parentCollection, parentId, subcollectionName) {
  const ref = db.collection(parentCollection).doc(parentId).collection(subcollectionName);
  const snapshot = await ref.get();
  const documents = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    documents.push({
      id: doc.id,
      ...convertTimestamps(data)
    });
  });
  
  return documents;
}

// Main backup function
async function backupProjects() {
  console.log('🚀 Starting Firebase Backup for Specific Projects\n');
  console.log(`📋 Projects to backup: ${PROJECT_CODES.join(', ')}\n`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../backups/firebase-backup-${timestamp}`);
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}\n`);
  
  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      projects: PROJECT_CODES,
      projectNames: PROJECT_NAMES,
      collections: []
    },
    data: {}
  };
  
  try {
    // 1. Find project IDs by project codes
    console.log('🔍 Finding projects by project codes...');
    const projectsSnapshot = await db.collection('projects')
      .where('projectCode', 'in', PROJECT_CODES)
      .get();
    
    const projectIds = [];
    const projects = [];
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      projectIds.push(doc.id);
      projects.push({
        id: doc.id,
        ...convertTimestamps(data)
      });
      console.log(`  ✓ Found project: ${data.name} (${data.projectCode}) - ID: ${doc.id}`);
    });
    
    if (projectIds.length === 0) {
      console.error('❌ No projects found with the specified project codes!');
      return;
    }
    
    backup.data.projects = projects;
    backup.metadata.projectIds = projectIds;
    
    // 2. Backup related phases
    console.log('\n📊 Backing up project phases...');
    backup.data.phases = await getCollectionData('phases', ref => 
      ref.where('projectId', 'in', projectIds)
    );
    
    // 3. Backup related steps
    console.log('\n📊 Backing up project steps...');
    backup.data.steps = await getCollectionData('steps', ref => 
      ref.where('projectId', 'in', projectIds)
    );
    
    // 4. Backup related tasks
    console.log('\n📊 Backing up project tasks...');
    backup.data.tasks = await getCollectionData('tasks', ref => 
      ref.where('projectId', 'in', projectIds)
    );
    
    // 5. Backup BOQ data
    console.log('\n📊 Backing up BOQ data...');
    backup.data.boq = {};
    for (const projectId of projectIds) {
      const boqData = await getSubcollectionData('projects', projectId, 'boq');
      if (boqData.length > 0) {
        backup.data.boq[projectId] = boqData;
        console.log(`  ✓ Found ${boqData.length} BOQ items for project ${projectId}`);
      }
    }
    
    // 6. Backup stock allocations
    console.log('\n📊 Backing up stock allocations...');
    backup.data.stockAllocations = {};
    for (const projectId of projectIds) {
      const allocations = await getSubcollectionData('projects', projectId, 'stockAllocations');
      if (allocations.length > 0) {
        backup.data.stockAllocations[projectId] = allocations;
        console.log(`  ✓ Found ${allocations.length} stock allocations for project ${projectId}`);
      }
    }
    
    // 7. Backup contractor assignments
    console.log('\n📊 Backing up contractor assignments...');
    backup.data.contractorProjects = await getCollectionData('contractorProjects', ref => 
      ref.where('projectId', 'in', projectIds)
    );
    
    // 8. Get related contractor IDs and backup contractors
    if (backup.data.contractorProjects.length > 0) {
      const contractorIds = [...new Set(backup.data.contractorProjects.map(cp => cp.contractorId))];
      console.log('\n📊 Backing up related contractors...');
      backup.data.contractors = await getCollectionData('contractors', ref => 
        ref.where(admin.firestore.FieldPath.documentId(), 'in', contractorIds)
      );
    }
    
    // 9. Backup daily progress data
    console.log('\n📊 Backing up daily progress...');
    backup.data.dailyProgress = await getCollectionData('dailyProgress', ref => 
      ref.where('projectId', 'in', projectIds)
    );
    
    // 10. Get client data
    console.log('\n📊 Backing up related clients...');
    const clientIds = [...new Set(projects.map(p => p.clientId).filter(id => id))];
    if (clientIds.length > 0) {
      backup.data.clients = await getCollectionData('clients', ref => 
        ref.where(admin.firestore.FieldPath.documentId(), 'in', clientIds)
      );
    }
    
    // 11. Get staff assignments
    console.log('\n📊 Backing up staff assignments...');
    const assignedStaffIds = new Set();
    
    // From tasks
    backup.data.tasks.forEach(task => {
      if (task.assigneeId) assignedStaffIds.add(task.assigneeId);
    });
    
    // From projects
    projects.forEach(project => {
      if (project.projectManagerId) assignedStaffIds.add(project.projectManagerId);
      if (project.teamIds) project.teamIds.forEach(id => assignedStaffIds.add(id));
    });
    
    if (assignedStaffIds.size > 0) {
      backup.data.staff = await getCollectionData('staff', ref => 
        ref.where(admin.firestore.FieldPath.documentId(), 'in', [...assignedStaffIds])
      );
    }
    
    // Update metadata
    backup.metadata.collections = Object.keys(backup.data);
    backup.metadata.totalDocuments = Object.values(backup.data)
      .reduce((sum, collection) => {
        if (Array.isArray(collection)) {
          return sum + collection.length;
        } else {
          // For nested collections like BOQ
          return sum + Object.values(collection).flat().length;
        }
      }, 0);
    
    // Save backup to file
    const backupFile = path.join(backupDir, 'firebase-backup.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    // Save individual collection files for easier access
    for (const [collectionName, data] of Object.entries(backup.data)) {
      const collectionFile = path.join(backupDir, `${collectionName}.json`);
      await fs.writeFile(collectionFile, JSON.stringify(data, null, 2));
    }
    
    // Create summary report
    const summary = {
      timestamp: backup.metadata.timestamp,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        projectCode: p.projectCode,
        client: p.clientName,
        status: p.status
      })),
      statistics: {
        totalProjects: projects.length,
        totalPhases: backup.data.phases?.length || 0,
        totalSteps: backup.data.steps?.length || 0,
        totalTasks: backup.data.tasks?.length || 0,
        totalBOQItems: Object.values(backup.data.boq || {}).flat().length,
        totalStockAllocations: Object.values(backup.data.stockAllocations || {}).flat().length,
        totalContractors: backup.data.contractors?.length || 0,
        totalDailyProgress: backup.data.dailyProgress?.length || 0,
        totalDocuments: backup.metadata.totalDocuments
      }
    };
    
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Backup completed successfully!');
    console.log('\n📊 Backup Summary:');
    console.log(`  - Location: ${backupDir}`);
    console.log(`  - Projects backed up: ${projects.length}`);
    console.log(`  - Total documents: ${backup.metadata.totalDocuments}`);
    console.log(`  - Collections: ${backup.metadata.collections.join(', ')}`);
    
    console.log('\n📋 Detailed Statistics:');
    Object.entries(summary.statistics).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    
    console.log('\n💾 Files created:');
    console.log(`  - firebase-backup.json (complete backup)`);
    console.log(`  - backup-summary.json (summary report)`);
    console.log(`  - Individual collection files (${backup.metadata.collections.length} files)`);
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    throw error;
  }
}

// Run backup
if (require.main === module) {
  backupProjects()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { backupProjects };