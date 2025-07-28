import admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Collections to backup
const COLLECTIONS = [
  'projects',
  'phases',
  'steps',
  'tasks',
  'clients',
  'suppliers',
  'contractors',
  'contractorProjects',
  'staff',
  'stock',
  'materials',
  'boq',
  'quotes',
  'rfqs',
  'roles',
  'emailLogs',
  'meetings',
  'personalTodos',
  'dailyProgress',
  'auditTrail',
  'poleTracker',
  'emailTemplates',
  'companies'
];

// Subcollections to check
const SUBCOLLECTIONS = {
  'projects': ['boq', 'stockAllocations', 'phases', 'steps', 'tasks'],
  'meetings': ['actionItems'],
  'mail': ['status']
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

// Get all documents from a collection
async function getCollectionData(db, collectionName) {
  console.log(`  📥 Backing up ${collectionName}...`);
  
  const snapshot = await db.collection(collectionName).get();
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

// Get subcollection data for all documents in a parent collection
async function getSubcollectionsData(db, parentCollection, subcollectionNames) {
  const result = {};
  
  // First get all parent documents
  const parentDocs = await db.collection(parentCollection).get();
  
  for (const subcollectionName of subcollectionNames) {
    result[subcollectionName] = {};
    let totalCount = 0;
    
    // For each parent document, check for subcollection
    for (const parentDoc of parentDocs.docs) {
      const subcollectionRef = parentDoc.ref.collection(subcollectionName);
      const subcollectionSnapshot = await subcollectionRef.get();
      
      if (!subcollectionSnapshot.empty) {
        const docs = [];
        subcollectionSnapshot.forEach(doc => {
          const data = doc.data();
          docs.push({
            id: doc.id,
            ...convertTimestamps(data)
          });
        });
        
        result[subcollectionName][parentDoc.id] = docs;
        totalCount += docs.length;
      }
    }
    
    if (totalCount > 0) {
      console.log(`     ✓ Found ${totalCount} ${subcollectionName} documents across ${Object.keys(result[subcollectionName]).length} ${parentCollection}`);
    }
  }
  
  return result;
}

// Main backup function
async function backupAllData() {
  console.log('🚀 Starting Complete Firebase Backup\n');
  
  const db = await initializeAdmin();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../backups/complete-firebase-backup-${timestamp}`);
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}\n`);
  
  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      collections: [],
      totalDocuments: 0,
      subcollections: {}
    },
    data: {},
    subcollections: {}
  };
  
  try {
    // Backup all main collections
    console.log('📊 Backing up main collections...\n');
    
    for (const collection of COLLECTIONS) {
      try {
        backup.data[collection] = await getCollectionData(db, collection);
        backup.metadata.collections.push(collection);
        backup.metadata.totalDocuments += backup.data[collection].length;
      } catch (error) {
        console.warn(`  ⚠️  Could not backup ${collection}: ${error.message}`);
      }
    }
    
    // Backup subcollections
    console.log('\n📊 Backing up subcollections...\n');
    
    for (const [parentCollection, subcollectionNames] of Object.entries(SUBCOLLECTIONS)) {
      if (backup.data[parentCollection] && backup.data[parentCollection].length > 0) {
        console.log(`  📂 Checking subcollections for ${parentCollection}...`);
        const subcollectionData = await getSubcollectionsData(db, parentCollection, subcollectionNames);
        
        for (const [subcollectionName, data] of Object.entries(subcollectionData)) {
          if (Object.keys(data).length > 0) {
            if (!backup.subcollections[parentCollection]) {
              backup.subcollections[parentCollection] = {};
            }
            backup.subcollections[parentCollection][subcollectionName] = data;
            
            const docCount = Object.values(data).flat().length;
            backup.metadata.totalDocuments += docCount;
            
            if (!backup.metadata.subcollections[parentCollection]) {
              backup.metadata.subcollections[parentCollection] = [];
            }
            backup.metadata.subcollections[parentCollection].push(subcollectionName);
          }
        }
      }
    }
    
    // Save complete backup
    const backupFile = path.join(backupDir, 'complete-firebase-backup.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    // Save individual collection files
    for (const [collectionName, data] of Object.entries(backup.data)) {
      if (data.length > 0) {
        const collectionFile = path.join(backupDir, `${collectionName}.json`);
        await fs.writeFile(collectionFile, JSON.stringify(data, null, 2));
      }
    }
    
    // Save subcollection files
    if (Object.keys(backup.subcollections).length > 0) {
      const subcollectionsDir = path.join(backupDir, 'subcollections');
      await fs.mkdir(subcollectionsDir, { recursive: true });
      
      for (const [parentCollection, subcollections] of Object.entries(backup.subcollections)) {
        const parentDir = path.join(subcollectionsDir, parentCollection);
        await fs.mkdir(parentDir, { recursive: true });
        
        for (const [subcollectionName, data] of Object.entries(subcollections)) {
          const subcollectionFile = path.join(parentDir, `${subcollectionName}.json`);
          await fs.writeFile(subcollectionFile, JSON.stringify(data, null, 2));
        }
      }
    }
    
    // Create detailed summary
    const summary = {
      timestamp: backup.metadata.timestamp,
      backupLocation: backupDir,
      statistics: {
        totalCollections: backup.metadata.collections.length,
        totalDocuments: backup.metadata.totalDocuments,
        collections: {}
      },
      subcollections: backup.metadata.subcollections
    };
    
    // Add per-collection statistics
    for (const [collectionName, data] of Object.entries(backup.data)) {
      summary.statistics.collections[collectionName] = data.length;
    }
    
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    // Create restore instructions
    const restoreInstructions = `# Firebase Restore Instructions

## Backup Information
- Timestamp: ${backup.metadata.timestamp}
- Total Documents: ${backup.metadata.totalDocuments}
- Collections: ${backup.metadata.collections.length}

## To Restore This Backup:

1. Install dependencies:
   \`\`\`bash
   npm install firebase-admin
   \`\`\`

2. Create a restore script or use:
   \`\`\`bash
   node scripts/restore-firebase-data.js ${backupDir}
   \`\`\`

3. The restore script should:
   - Clear existing data (optional)
   - Import collections in the correct order
   - Restore subcollections after parent documents

## Collection Order for Restore:
1. clients
2. suppliers
3. contractors
4. staff
5. roles
6. companies
7. emailTemplates
8. materials
9. projects
10. phases
11. steps
12. tasks
13. All other collections

## Files in This Backup:
- complete-firebase-backup.json - Full backup data
- backup-summary.json - Statistics and metadata
- [collection-name].json - Individual collection files
- subcollections/ - Nested subcollection data
`;
    
    const instructionsFile = path.join(backupDir, 'RESTORE_INSTRUCTIONS.md');
    await fs.writeFile(instructionsFile, restoreInstructions);
    
    console.log('\n✅ Backup completed successfully!');
    console.log('\n📊 Backup Summary:');
    console.log(`  - Location: ${backupDir}`);
    console.log(`  - Total collections: ${backup.metadata.collections.length}`);
    console.log(`  - Total documents: ${backup.metadata.totalDocuments}`);
    
    console.log('\n📋 Collection Statistics:');
    for (const [collection, count] of Object.entries(summary.statistics.collections)) {
      if (count > 0) {
        console.log(`  - ${collection}: ${count} documents`);
      }
    }
    
    if (Object.keys(backup.metadata.subcollections).length > 0) {
      console.log('\n📂 Subcollections backed up:');
      for (const [parent, subs] of Object.entries(backup.metadata.subcollections)) {
        console.log(`  - ${parent}: ${subs.join(', ')}`);
      }
    }
    
    console.log('\n💾 Files created:');
    console.log(`  - complete-firebase-backup.json`);
    console.log(`  - backup-summary.json`);
    console.log(`  - RESTORE_INSTRUCTIONS.md`);
    console.log(`  - ${backup.metadata.collections.filter(c => backup.data[c].length > 0).length} individual collection files`);
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    throw error;
  }
}

// Run backup
backupAllData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

export { backupAllData };