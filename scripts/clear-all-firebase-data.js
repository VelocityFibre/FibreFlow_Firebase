const admin = require('firebase-admin');
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

// Collections to clear in the correct order (respecting dependencies)
const COLLECTIONS_IN_ORDER = [
  // Clear dependent collections first
  'auditTrail',          // Audit logs (can reference any collection)
  'personalTodos',       // Personal todos
  'emailLogs',           // Email logs
  'dailyProgress',       // Daily progress (references projects)
  'contractorProjects',  // Contractor assignments (references projects & contractors)
  'rfqs',               // RFQs (references suppliers)
  'quotes',             // Quotes
  'tasks',              // Tasks (references projects, phases, steps)
  'steps',              // Steps (references projects, phases)
  'phases',             // Phases (references projects)
  'meetings',           // Meetings
  'boq',                // BOQ items
  'stock',              // Stock items
  'materials',          // Materials
  'poleTracker',        // Pole tracker
  
  // Then clear main entities
  'projects',           // Projects (referenced by many)
  'contractors',        // Contractors
  'suppliers',          // Suppliers
  'clients',            // Clients
  'staff',              // Staff members
  
  // Finally clear system collections
  'roles',              // Roles
  'emailTemplates',     // Email templates
  'companies',          // Companies
];

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

// Delete all documents in a collection
async function deleteCollection(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });

  async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid exploding the stack
    process.nextTick(() => {
      deleteQueryBatch(query, resolve);
    });
  }
}

// Main clear function
async function clearAllData() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from Firebase Firestore!');
  console.log('');
  console.log('🔍 Collections to be cleared:');
  COLLECTIONS_IN_ORDER.forEach(col => console.log(`   - ${col}`));
  console.log('');
  console.log('📊 Make sure you have a recent backup!');
  console.log('   Last backup: Check backups/data/ directory');
  console.log('');
  
  const answer = await askQuestion('❓ Are you ABSOLUTELY SURE you want to clear all data? Type "DELETE ALL" to confirm: ');
  
  if (answer !== 'DELETE ALL') {
    console.log('\n❌ Operation cancelled. No data was deleted.');
    return;
  }
  
  console.log('\n🚀 Starting data deletion...\n');
  
  const startTime = Date.now();
  let totalDeleted = 0;
  const results = [];
  
  for (const collection of COLLECTIONS_IN_ORDER) {
    try {
      console.log(`🗑️  Clearing ${collection}...`);
      
      // Count documents before deletion
      const snapshot = await db.collection(collection).get();
      const docCount = snapshot.size;
      
      if (docCount === 0) {
        console.log(`   ✓ No documents to delete`);
        results.push({ collection, status: 'empty', count: 0 });
      } else {
        // Delete the collection
        await deleteCollection(collection);
        totalDeleted += docCount;
        console.log(`   ✅ Deleted ${docCount} documents`);
        results.push({ collection, status: 'cleared', count: docCount });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ collection, status: 'error', error: error.message });
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DELETION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total collections processed: ${COLLECTIONS_IN_ORDER.length}`);
  console.log(`Total documents deleted: ${totalDeleted}`);
  console.log(`Time taken: ${duration} seconds`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach(r => {
    const icon = r.status === 'cleared' ? '✅' : r.status === 'empty' ? '⚪' : '❌';
    console.log(`${icon} ${r.collection}: ${r.status}${r.count ? ` (${r.count} docs)` : ''}`);
  });
  
  console.log('\n✅ Firebase data has been cleared!');
  console.log('\n💡 Next steps:');
  console.log('1. Run the restore script to restore Mohadin & Lawley projects');
  console.log('2. Or start fresh with manual data entry in the web app');
}

// Run if called directly
if (require.main === module) {
  clearAllData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { clearAllData };