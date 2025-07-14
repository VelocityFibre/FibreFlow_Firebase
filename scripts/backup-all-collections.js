const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Get Firebase auth token from CLI
function getAuthToken() {
  try {
    // Get the access token from firebase CLI
    const token = execSync('firebase auth:export:token', { encoding: 'utf8' }).trim();
    return token;
  } catch (error) {
    console.error('❌ Failed to get Firebase auth token. Make sure you are logged in with: firebase login');
    return null;
  }
}

// Firestore REST API configuration
const PROJECT_ID = 'fibreflow-73daf';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Collections to backup
const COLLECTIONS = [
  'projects', 'phases', 'steps', 'tasks',
  'clients', 'suppliers', 'contractors', 'contractorProjects',
  'staff', 'stock', 'materials', 'boq',
  'quotes', 'rfqs', 'roles', 'emailLogs',
  'meetings', 'personalTodos', 'dailyProgress', 'auditTrail',
  'poleTracker', 'emailTemplates', 'companies'
];

// Convert Firestore value to JavaScript value
function convertFirestoreValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(v => convertFirestoreValue(v));
  }
  if (value.mapValue !== undefined) {
    const obj = {};
    const fields = value.mapValue.fields || {};
    for (const [key, val] of Object.entries(fields)) {
      obj[key] = convertFirestoreValue(val);
    }
    return obj;
  }
  return value;
}

// Convert Firestore document to JavaScript object
function convertDocument(doc) {
  const result = {
    id: doc.name.split('/').pop(),
    _path: doc.name
  };
  
  if (doc.fields) {
    for (const [key, value] of Object.entries(doc.fields)) {
      result[key] = convertFirestoreValue(value);
    }
  }
  
  return result;
}

// Fetch collection using curl with auth token
async function fetchCollectionWithAuth(collectionName, authToken) {
  console.log(`  📥 Backing up ${collectionName}...`);
  
  const url = `${BASE_URL}/${collectionName}`;
  
  try {
    // Use curl with authorization header
    const curlCommand = `curl -s -H "Authorization: Bearer ${authToken}" "${url}"`;
    const response = execSync(curlCommand, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    
    const data = JSON.parse(response);
    const documents = (data.documents || []).map(convertDocument);
    
    console.log(`     ✓ Found ${documents.length} documents`);
    return documents;
  } catch (error) {
    console.log(`     ⚠️ Could not backup ${collectionName}: ${error.message}`);
    return [];
  }
}

// Main backup function
async function backupAllData() {
  console.log('🚀 Starting Complete Firebase Backup\n');
  
  // Get auth token
  console.log('🔐 Getting authentication token...');
  const authToken = getAuthToken();
  
  if (!authToken) {
    console.error('\n❌ Cannot proceed without authentication');
    console.log('\nPlease run: firebase login');
    return;
  }
  
  console.log('✅ Authentication successful\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../backups/data/complete-firebase-backup-${timestamp}`);
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}\n`);
  
  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      method: 'Firebase CLI Authentication',
      collections: [],
      totalDocuments: 0
    },
    data: {}
  };
  
  try {
    console.log('📊 Backing up collections...\n');
    
    // Backup each collection
    for (const collection of COLLECTIONS) {
      const documents = await fetchCollectionWithAuth(collection, authToken);
      
      if (documents.length > 0) {
        backup.data[collection] = documents;
        backup.metadata.collections.push(collection);
        backup.metadata.totalDocuments += documents.length;
      }
    }
    
    // Save complete backup
    const backupFile = path.join(backupDir, 'complete-firebase-backup.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    // Save individual collection files
    for (const [collectionName, data] of Object.entries(backup.data)) {
      const collectionFile = path.join(backupDir, `${collectionName}.json`);
      await fs.writeFile(collectionFile, JSON.stringify(data, null, 2));
    }
    
    // Create summary
    const summary = {
      timestamp: backup.metadata.timestamp,
      method: 'Firebase CLI Auth + REST API',
      statistics: {
        totalCollections: backup.metadata.collections.length,
        totalDocuments: backup.metadata.totalDocuments,
        collections: {}
      }
    };
    
    // Add per-collection statistics
    for (const [collectionName, data] of Object.entries(backup.data)) {
      summary.statistics.collections[collectionName] = data.length;
    }
    
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Backup completed successfully!');
    console.log('\n📊 Backup Summary:');
    console.log(`  - Location: ${backupDir}`);
    console.log(`  - Total collections: ${backup.metadata.collections.length}`);
    console.log(`  - Total documents: ${backup.metadata.totalDocuments}`);
    
    console.log('\n📋 Collection Statistics:');
    for (const [collection, count] of Object.entries(summary.statistics.collections)) {
      console.log(`  - ${collection}: ${count} documents`);
    }
    
    console.log('\n💾 Files created:');
    console.log(`  - complete-firebase-backup.json`);
    console.log(`  - backup-summary.json`);
    console.log(`  - ${backup.metadata.collections.length} individual collection files`);
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
  }
}

// Run backup
if (require.main === module) {
  backupAllData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { backupAllData };