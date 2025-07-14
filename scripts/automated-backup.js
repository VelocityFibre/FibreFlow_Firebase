const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const { createGzip } = require('zlib');
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');

// Configuration
const CONFIG = {
  maxLocalBackups: 7,        // Keep last 7 daily backups locally
  maxWeeklyBackups: 4,       // Keep last 4 weekly backups
  maxMonthlyBackups: 12,     // Keep last 12 monthly backups
  backupPath: path.join(__dirname, '../backups/data'),
  serviceAccountPath: path.join(__dirname, '../fibreflow-service-account.json'),
  projectId: 'fibreflow-73daf',
  collections: [
    'projects', 'phases', 'steps', 'tasks',
    'clients', 'suppliers', 'contractors', 'contractorProjects',
    'staff', 'stock', 'materials', 'boq',
    'quotes', 'rfqs', 'roles', 'emailLogs',
    'meetings', 'personalTodos', 'dailyProgress', 'auditTrail',
    'poleTracker', 'emailTemplates', 'companies'
  ],
  subcollections: {
    'projects': ['boq', 'stockAllocations'],
    'meetings': ['actionItems'],
    'mail': ['status']
  }
};

// Logging utility
class BackupLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      elapsed: Date.now() - this.startTime
    };
    this.logs.push(entry);
    
    const emoji = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[level] || '📝';
    
    console.log(`${emoji} ${message}`);
    if (Object.keys(data).length > 0) {
      console.log(`   ${JSON.stringify(data)}`);
    }
  }

  async saveLog(backupDir) {
    const logFile = path.join(backupDir, 'backup.log');
    await fs.writeFile(logFile, JSON.stringify(this.logs, null, 2));
  }

  getSummary() {
    return {
      duration: Date.now() - this.startTime,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warning').length,
      logs: this.logs
    };
  }
}

// Initialize Firebase Admin
async function initializeFirebase(logger) {
  if (!admin.apps.length) {
    try {
      // Check for service account file
      await fs.access(CONFIG.serviceAccountPath);
      const serviceAccount = require(CONFIG.serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: CONFIG.projectId
      });
      
      logger.log('success', 'Initialized Firebase Admin with service account');
      return true;
    } catch (error) {
      // Try environment variable
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          admin.initializeApp({
            projectId: CONFIG.projectId
          });
          logger.log('success', 'Initialized Firebase Admin with environment credentials');
          return true;
        } catch (envError) {
          logger.log('error', 'Failed to initialize with environment credentials', { error: envError.message });
        }
      }
      
      logger.log('error', 'Firebase initialization failed', { 
        error: error.message,
        serviceAccountPath: CONFIG.serviceAccountPath 
      });
      return false;
    }
  }
  return true;
}

// Convert Firestore timestamps
function convertTimestamps(obj) {
  if (!obj) return obj;
  
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
  }
  
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
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

// Backup a single collection
async function backupCollection(collectionName, logger) {
  const db = admin.firestore();
  const documents = [];
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...convertTimestamps(data)
      });
    }
    
    logger.log('success', `Backed up ${collectionName}`, { count: documents.length });
    return documents;
  } catch (error) {
    logger.log('error', `Failed to backup ${collectionName}`, { error: error.message });
    return [];
  }
}

// Backup subcollections
async function backupSubcollections(parentCollection, subcollectionNames, documents, logger) {
  const db = admin.firestore();
  const result = {};
  
  for (const subcollectionName of subcollectionNames) {
    result[subcollectionName] = {};
    let totalCount = 0;
    
    for (const parentDoc of documents) {
      try {
        const subcollectionRef = db.collection(parentCollection).doc(parentDoc.id).collection(subcollectionName);
        const snapshot = await subcollectionRef.get();
        
        if (!snapshot.empty) {
          const subdocs = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            subdocs.push({
              id: doc.id,
              ...convertTimestamps(data)
            });
          });
          
          result[subcollectionName][parentDoc.id] = subdocs;
          totalCount += subdocs.length;
        }
      } catch (error) {
        logger.log('warning', `Failed to backup subcollection ${parentCollection}/${parentDoc.id}/${subcollectionName}`, 
          { error: error.message });
      }
    }
    
    if (totalCount > 0) {
      logger.log('success', `Backed up subcollection ${parentCollection}/${subcollectionName}`, { count: totalCount });
    }
  }
  
  return result;
}

// Compress backup file
async function compressBackup(sourceFile, logger) {
  const compressedFile = `${sourceFile}.gz`;
  
  try {
    await pipeline(
      createReadStream(sourceFile),
      createGzip({ level: 9 }),
      createWriteStream(compressedFile)
    );
    
    // Get file sizes for comparison
    const originalSize = (await fs.stat(sourceFile)).size;
    const compressedSize = (await fs.stat(compressedFile)).size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    logger.log('success', 'Compressed backup', {
      originalSize: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
      compressedSize: `${(compressedSize / 1024 / 1024).toFixed(2)}MB`,
      compressionRatio: `${compressionRatio}%`
    });
    
    // Remove original file
    await fs.unlink(sourceFile);
    
    return compressedFile;
  } catch (error) {
    logger.log('error', 'Compression failed', { error: error.message });
    return sourceFile;
  }
}

// Clean up old backups
async function cleanupOldBackups(logger) {
  try {
    const files = await fs.readdir(CONFIG.backupPath);
    const backupFiles = files
      .filter(f => f.startsWith('automated-backup-') && f.endsWith('.gz'))
      .map(f => ({
        name: f,
        path: path.join(CONFIG.backupPath, f),
        date: f.match(/automated-backup-(\d{4}-\d{2}-\d{2})/)?.[1]
      }))
      .filter(f => f.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    // Keep daily backups (last 7)
    const dailyBackups = backupFiles.slice(0, CONFIG.maxLocalBackups);
    
    // Identify weekly backups (Sundays)
    const weeklyBackups = backupFiles
      .filter(f => new Date(f.date).getDay() === 0)
      .slice(0, CONFIG.maxWeeklyBackups);
    
    // Identify monthly backups (1st of month)
    const monthlyBackups = backupFiles
      .filter(f => new Date(f.date).getDate() === 1)
      .slice(0, CONFIG.maxMonthlyBackups);
    
    // Combine all backups to keep
    const backupsToKeep = new Set([
      ...dailyBackups.map(b => b.name),
      ...weeklyBackups.map(b => b.name),
      ...monthlyBackups.map(b => b.name)
    ]);
    
    // Delete old backups
    let deletedCount = 0;
    for (const backup of backupFiles) {
      if (!backupsToKeep.has(backup.name)) {
        await fs.unlink(backup.path);
        deletedCount++;
        logger.log('info', `Deleted old backup: ${backup.name}`);
      }
    }
    
    if (deletedCount > 0) {
      logger.log('success', `Cleaned up ${deletedCount} old backups`);
    }
    
  } catch (error) {
    logger.log('error', 'Cleanup failed', { error: error.message });
  }
}

// Main backup function
async function performBackup() {
  const logger = new BackupLogger();
  logger.log('info', 'Starting automated backup', { 
    timestamp: new Date().toISOString(),
    mode: process.env.BACKUP_MODE || 'manual'
  });
  
  // Initialize Firebase
  if (!await initializeFirebase(logger)) {
    logger.log('error', 'Cannot proceed without Firebase initialization');
    return false;
  }
  
  const db = admin.firestore();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dateOnly = new Date().toISOString().split('T')[0];
  const backupDir = path.join(CONFIG.backupPath, `automated-backup-${dateOnly}`);
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  logger.log('info', 'Created backup directory', { path: backupDir });
  
  const backup = {
    metadata: {
      version: '2.0',
      timestamp: new Date().toISOString(),
      mode: process.env.BACKUP_MODE || 'manual',
      collections: [],
      totalDocuments: 0,
      totalSize: 0,
      projectId: CONFIG.projectId
    },
    data: {},
    subcollections: {}
  };
  
  try {
    // Backup main collections
    logger.log('info', 'Starting collection backups');
    
    for (const collection of CONFIG.collections) {
      const documents = await backupCollection(collection, logger);
      
      if (documents.length > 0) {
        backup.data[collection] = documents;
        backup.metadata.collections.push(collection);
        backup.metadata.totalDocuments += documents.length;
        
        // Check for subcollections
        if (CONFIG.subcollections[collection]) {
          const subcollectionData = await backupSubcollections(
            collection, 
            CONFIG.subcollections[collection], 
            documents, 
            logger
          );
          
          if (Object.keys(subcollectionData).length > 0) {
            backup.subcollections[collection] = subcollectionData;
          }
        }
      }
    }
    
    // Save backup file
    const backupFile = path.join(backupDir, 'backup-data.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    const stats = await fs.stat(backupFile);
    backup.metadata.totalSize = stats.size;
    
    // Compress backup
    const compressedFile = await compressBackup(backupFile, logger);
    
    // Create summary
    const summary = {
      timestamp: backup.metadata.timestamp,
      success: true,
      statistics: {
        collections: backup.metadata.collections.length,
        documents: backup.metadata.totalDocuments,
        sizeBytes: backup.metadata.totalSize,
        sizeMB: (backup.metadata.totalSize / 1024 / 1024).toFixed(2),
        duration: Date.now() - logger.startTime,
        collectionCounts: {}
      },
      files: {
        backup: path.basename(compressedFile),
        log: 'backup.log',
        summary: 'backup-summary.json'
      }
    };
    
    // Add per-collection counts
    for (const [name, docs] of Object.entries(backup.data)) {
      summary.statistics.collectionCounts[name] = docs.length;
    }
    
    // Save summary
    const summaryFile = path.join(backupDir, 'backup-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    // Save logs
    await logger.saveLog(backupDir);
    
    // Clean up old backups
    await cleanupOldBackups(logger);
    
    // Final success message
    logger.log('success', 'Backup completed successfully', {
      documents: backup.metadata.totalDocuments,
      duration: `${((Date.now() - logger.startTime) / 1000).toFixed(2)}s`,
      size: `${(backup.metadata.totalSize / 1024 / 1024).toFixed(2)}MB`
    });
    
    // Move compressed file to main backup directory
    const finalBackupPath = path.join(CONFIG.backupPath, `automated-backup-${dateOnly}.gz`);
    await fs.rename(compressedFile, finalBackupPath);
    
    // Clean up backup directory
    await fs.rmdir(backupDir, { recursive: true });
    
    return true;
    
  } catch (error) {
    logger.log('error', 'Backup failed', { error: error.message, stack: error.stack });
    
    // Save error log
    await logger.saveLog(backupDir);
    
    return false;
  }
}

// Export for use in other scripts
module.exports = {
  performBackup,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  performBackup()
    .then(success => {
      if (success) {
        console.log('\n✅ Backup completed successfully');
        process.exit(0);
      } else {
        console.error('\n❌ Backup failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}