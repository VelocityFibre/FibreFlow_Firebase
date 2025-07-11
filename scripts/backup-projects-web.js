const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Firestore REST API configuration
const PROJECT_ID = 'fibreflow-73daf';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Projects to backup
const PROJECT_CODES = ['MO-001', 'Law-001'];

// Helper function to make HTTPS requests
function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

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

// Fetch collection from Firestore REST API
async function fetchCollection(collectionName, query = '') {
  console.log(`📥 Fetching ${collectionName}...`);
  const url = `${BASE_URL}/${collectionName}${query}`;
  
  try {
    const response = await httpsRequest(url);
    const documents = (response.documents || []).map(convertDocument);
    console.log(`  ✓ Found ${documents.length} documents`);
    return documents;
  } catch (error) {
    console.error(`  ❌ Error fetching ${collectionName}:`, error.message);
    return [];
  }
}

// Main backup function
async function backupProjects() {
  console.log('🚀 Starting Firebase Backup via REST API\n');
  console.log(`📋 Projects to backup: ${PROJECT_CODES.join(', ')}\n`);
  console.log('⚠️  Note: This uses the public REST API, so only publicly readable data will be backed up.\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../backups/data/firebase-backup-${timestamp}`);
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}\n`);
  
  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      method: 'REST API (Public)',
      projectCodes: PROJECT_CODES,
      collections: []
    },
    data: {}
  };
  
  try {
    // Fetch all projects first
    console.log('🔍 Fetching all projects...');
    const allProjects = await fetchCollection('projects');
    
    // Filter for our specific project codes
    const projects = allProjects.filter(p => PROJECT_CODES.includes(p.projectCode));
    
    if (projects.length === 0) {
      console.error('\n❌ No projects found with the specified project codes!');
      console.log('   This might be because:');
      console.log('   1. The projects don\'t exist');
      console.log('   2. The Firestore security rules don\'t allow public read access');
      console.log('   3. The project codes have changed\n');
      return;
    }
    
    console.log(`\n✅ Found ${projects.length} matching projects:`);
    projects.forEach(p => {
      console.log(`  - ${p.name || 'Unnamed'} (${p.projectCode}) - ID: ${p.id}`);
    });
    
    backup.data.projects = projects;
    const projectIds = projects.map(p => p.id);
    
    // Try to fetch related collections
    const collections = [
      'phases',
      'steps', 
      'tasks',
      'clients',
      'contractors',
      'contractorProjects',
      'staff',
      'dailyProgress'
    ];
    
    console.log('\n📊 Attempting to fetch related data...');
    console.log('   (Some collections may fail due to security rules)\n');
    
    for (const collection of collections) {
      backup.data[collection] = await fetchCollection(collection);
      if (backup.data[collection].length > 0) {
        backup.metadata.collections.push(collection);
      }
    }
    
    // Filter related data by project IDs where applicable
    if (backup.data.phases) {
      backup.data.phases = backup.data.phases.filter(p => projectIds.includes(p.projectId));
    }
    if (backup.data.steps) {
      backup.data.steps = backup.data.steps.filter(s => projectIds.includes(s.projectId));
    }
    if (backup.data.tasks) {
      backup.data.tasks = backup.data.tasks.filter(t => projectIds.includes(t.projectId));
    }
    if (backup.data.dailyProgress) {
      backup.data.dailyProgress = backup.data.dailyProgress.filter(d => projectIds.includes(d.projectId));
    }
    if (backup.data.contractorProjects) {
      backup.data.contractorProjects = backup.data.contractorProjects.filter(c => projectIds.includes(c.projectId));
    }
    
    // Calculate statistics
    backup.metadata.totalDocuments = Object.values(backup.data)
      .reduce((sum, collection) => sum + (Array.isArray(collection) ? collection.length : 0), 0);
    
    // Save backup files
    const backupFile = path.join(backupDir, 'firebase-backup.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    // Save individual collection files
    for (const [collectionName, data] of Object.entries(backup.data)) {
      if (Array.isArray(data) && data.length > 0) {
        const collectionFile = path.join(backupDir, `${collectionName}.json`);
        await fs.writeFile(collectionFile, JSON.stringify(data, null, 2));
      }
    }
    
    // Create summary
    const summary = {
      timestamp: backup.metadata.timestamp,
      method: 'REST API (Public Read)',
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        projectCode: p.projectCode,
        status: p.status
      })),
      statistics: {
        totalDocuments: backup.metadata.totalDocuments,
        collections: {}
      },
      notes: [
        'This backup uses the public REST API',
        'Only publicly readable data is included',
        'For a complete backup, use Firebase Admin SDK with proper authentication'
      ]
    };
    
    // Add per-collection counts
    for (const [name, data] of Object.entries(backup.data)) {
      if (Array.isArray(data)) {
        summary.statistics.collections[name] = data.length;
      }
    }
    
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Backup completed!');
    console.log('\n📊 Backup Summary:');
    console.log(`  - Location: ${backupDir}`);
    console.log(`  - Projects: ${projects.length}`);
    console.log(`  - Total documents: ${backup.metadata.totalDocuments}`);
    console.log(`  - Collections backed up: ${backup.metadata.collections.join(', ')}`);
    
    console.log('\n⚠️  Important Notes:');
    console.log('  - This backup may be incomplete due to security rules');
    console.log('  - For a complete backup, set up Firebase Admin SDK authentication');
    console.log('  - Or temporarily make collections publicly readable (not recommended for production)');
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
  }
}

// Alternative: Interactive backup instructions
async function showBackupInstructions() {
  console.log('\n📝 Manual Backup Instructions for FibreFlow\n');
  console.log('Since we need authentication, here are two options:\n');
  
  console.log('Option 1: Export from Firebase Console (Easiest)');
  console.log('------------------------------------------------');
  console.log('1. Go to: https://console.firebase.google.com/project/fibreflow-73daf/firestore');
  console.log('2. Click the three dots menu (⋮) next to "Start collection"');
  console.log('3. Select "Import/Export"');
  console.log('4. Click "Export" and choose your collections');
  console.log('5. Download the export when ready\n');
  
  console.log('Option 2: Use Firebase CLI');
  console.log('---------------------------');
  console.log('1. Install Firebase CLI: npm install -g firebase-tools');
  console.log('2. Login: firebase login');
  console.log('3. Export data:');
  console.log('   firebase firestore:export gs://fibreflow-backup --only-collections projects,tasks,phases,steps');
  console.log('4. Download: gsutil -m cp -r gs://fibreflow-backup .\n');
  
  console.log('Option 3: Manual Copy from UI');
  console.log('-----------------------------');
  console.log('1. Visit: https://fibreflow-73daf.web.app/projects');
  console.log('2. Open each project (MO-001 and Law-001)');
  console.log('3. Take screenshots or copy data manually');
  console.log('4. Save in a document for reference\n');
}

// Run appropriate function
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--help' || args[0] === '-h') {
    showBackupInstructions();
  } else {
    console.log('Attempting REST API backup...\n');
    backupProjects().then(() => {
      console.log('\nFor other backup options, run: node scripts/backup-projects-web.js --help');
    });
  }
}

module.exports = { backupProjects, showBackupInstructions };