#\!/usr/bin/env node

const admin = require('firebase-admin');

if (\!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function countDocuments() {
  try {
    console.log('📊 Checking staging collections...\n');
    
    // Count staging documents
    const stagingSnapshot = await db.collection('onemap-processing-staging').count().get();
    console.log(`onemap-processing-staging: ${stagingSnapshot.data().count} documents`);
    
    // Count import documents
    const importsSnapshot = await db.collection('onemap-processing-imports').count().get();
    console.log(`onemap-processing-imports: ${importsSnapshot.data().count} documents`);
    
    console.log('\n✅ Count complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

countDocuments().then(() => process.exit(0));
EOF < /dev/null
