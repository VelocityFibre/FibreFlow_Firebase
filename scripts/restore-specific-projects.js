const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

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

// Project codes to restore
const PROJECTS_TO_RESTORE = ['MO-001', 'Law-001'];

// Helper to get user confirmation
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Convert ISO date strings back to Firestore Timestamps
function convertDatesToTimestamps(obj) {
  if (!obj) return obj;
  
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
    // This is an ISO date string
    return admin.firestore.Timestamp.fromDate(new Date(obj));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToTimestamps(item));
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToTimestamps(value);
    }
    return converted;
  }
  
  return obj;
}

// Find the most recent backup
async function findLatestBackup() {
  const backupDir = path.join(__dirname, '../backups/data');
  const files = await fs.readdir(backupDir);
  
  // Look for the REST API backup first (has the project data we need)
  const restApiBackups = files
    .filter(f => f.startsWith('firebase-backup-') && f.includes('T'))
    .sort()
    .reverse();
  
  if (restApiBackups.length > 0) {
    return path.join(backupDir, restApiBackups[0]);
  }
  
  // Otherwise look for automated backups
  const automatedBackups = files
    .filter(f => f.startsWith('automated-backup-') && f.endsWith('.gz'))
    .sort()
    .reverse();
  
  if (automatedBackups.length > 0) {
    throw new Error('Automated backups are compressed. Please specify the REST API backup directory.');
  }
  
  throw new Error('No suitable backup found');
}

// Restore specific collections
async function restoreCollection(collectionName, documents) {
  console.log(`\n📥 Restoring ${collectionName}...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const doc of documents) {
    try {
      const { id, _path, ...data } = doc;
      
      if (!id) {
        console.log(`   ⚠️  Skipping document without ID`);
        continue;
      }
      
      // Convert date strings back to Timestamps
      const convertedData = convertDatesToTimestamps(data);
      
      // Add to batch
      const docRef = db.collection(collectionName).doc(id);
      batch.set(docRef, convertedData);
      batchCount++;
      
      // Commit batch every 500 documents
      if (batchCount >= 500) {
        await batch.commit();
        successCount += batchCount;
        batchCount = 0;
      }
      
    } catch (error) {
      console.log(`   ❌ Error restoring document ${doc.id}: ${error.message}`);
      errorCount++;
    }
  }
  
  // Commit remaining documents
  if (batchCount > 0) {
    await batch.commit();
    successCount += batchCount;
  }
  
  console.log(`   ✅ Restored ${successCount} documents`);
  if (errorCount > 0) {
    console.log(`   ⚠️  Failed to restore ${errorCount} documents`);
  }
  
  return { success: successCount, errors: errorCount };
}

// Main restore function
async function restoreProjects(backupPath) {
  console.log('🔄 Project Restore Tool');
  console.log('='.repeat(50));
  console.log(`📦 Projects to restore: ${PROJECTS_TO_RESTORE.join(', ')}`);
  
  // Find backup directory if not specified
  if (!backupPath) {
    console.log('\n🔍 Finding latest backup...');
    backupPath = await findLatestBackup();
  }
  
  console.log(`📁 Using backup: ${backupPath}`);
  
  // Load backup data
  const backupFiles = await fs.readdir(backupPath);
  const hasMainBackup = backupFiles.includes('firebase-backup.json');
  const hasIndividualFiles = backupFiles.some(f => f.endsWith('.json') && f !== 'firebase-backup.json');
  
  if (!hasMainBackup && !hasIndividualFiles) {
    throw new Error('No backup data found in directory');
  }
  
  console.log('\n📊 Loading backup data...');
  
  // Load data from individual files or main backup
  const data = {};
  
  if (hasIndividualFiles) {
    // Load from individual collection files
    const collectionFiles = ['projects.json', 'tasks.json', 'clients.json', 'staff.json', 'contractors.json'];
    
    for (const file of collectionFiles) {
      if (backupFiles.includes(file)) {
        const filePath = path.join(backupPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const collectionName = file.replace('.json', '');
        data[collectionName] = JSON.parse(content);
        console.log(`   ✓ Loaded ${collectionName}: ${data[collectionName].length} documents`);
      }
    }
  } else {
    // Load from main backup file
    const mainBackupPath = path.join(backupPath, 'firebase-backup.json');
    const backupContent = await fs.readFile(mainBackupPath, 'utf8');
    const backup = JSON.parse(backupContent);
    Object.assign(data, backup.data || {});
  }
  
  // Filter projects to restore
  const projectsToRestore = (data.projects || []).filter(p => 
    PROJECTS_TO_RESTORE.includes(p.projectCode)
  );
  
  if (projectsToRestore.length === 0) {
    console.log('\n❌ No matching projects found in backup!');
    return;
  }
  
  console.log(`\n✅ Found ${projectsToRestore.length} projects to restore:`);
  projectsToRestore.forEach(p => {
    console.log(`   - ${p.name} (${p.projectCode})`);
  });
  
  // Get project IDs for filtering related data
  const projectIds = projectsToRestore.map(p => p.id);
  
  // Filter related data
  const tasksToRestore = (data.tasks || []).filter(t => projectIds.includes(t.projectId));
  
  // Get unique client IDs from projects
  const clientIds = [...new Set(projectsToRestore.map(p => p.clientId).filter(id => id))];
  const clientsToRestore = (data.clients || []).filter(c => clientIds.includes(c.id));
  
  console.log('\n📊 Data to restore:');
  console.log(`   - Projects: ${projectsToRestore.length}`);
  console.log(`   - Tasks: ${tasksToRestore.length}`);
  console.log(`   - Clients: ${clientsToRestore.length}`);
  
  const answer = await askQuestion('\n❓ Proceed with restore? (y/n): ');
  
  if (answer.toLowerCase() !== 'y') {
    console.log('\n❌ Restore cancelled');
    return;
  }
  
  console.log('\n🚀 Starting restore...');
  
  const results = {
    projects: { success: 0, errors: 0 },
    tasks: { success: 0, errors: 0 },
    clients: { success: 0, errors: 0 }
  };
  
  // Restore in correct order
  
  // 1. Restore clients first (referenced by projects)
  if (clientsToRestore.length > 0) {
    results.clients = await restoreCollection('clients', clientsToRestore);
  }
  
  // 2. Restore projects
  results.projects = await restoreCollection('projects', projectsToRestore);
  
  // 3. Restore tasks
  if (tasksToRestore.length > 0) {
    results.tasks = await restoreCollection('tasks', tasksToRestore);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESTORE SUMMARY');
  console.log('='.repeat(50));
  
  let totalSuccess = 0;
  let totalErrors = 0;
  
  for (const [collection, stats] of Object.entries(results)) {
    if (stats.success > 0 || stats.errors > 0) {
      console.log(`${collection}: ${stats.success} restored, ${stats.errors} errors`);
      totalSuccess += stats.success;
      totalErrors += stats.errors;
    }
  }
  
  console.log(`\nTotal: ${totalSuccess} documents restored`);
  if (totalErrors > 0) {
    console.log(`Errors: ${totalErrors} documents failed`);
  }
  
  console.log('\n✅ Restore completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Visit https://fibreflow-73daf.web.app/projects to see restored projects');
  console.log('2. Begin adding new data through the web interface');
}

// Run if called directly
if (require.main === module) {
  const backupPath = process.argv[2];
  
  restoreProjects(backupPath)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n❌ Fatal error:', error.message);
      console.log('\nUsage: node restore-specific-projects.js [backup-directory-path]');
      console.log('If no path specified, will use the latest backup');
      process.exit(1);
    });
}

module.exports = { restoreProjects };