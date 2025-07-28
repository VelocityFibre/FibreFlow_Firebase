#!/bin/bash

# vf-onemap-data Import Script
# ============================
# Uses Firebase CLI for authentication

echo "🚀 vf-onemap-data Import Process"
echo "================================"
echo ""

# Check if logged in
echo "📋 Checking Firebase authentication..."
firebase login:list

# Set the project
echo ""
echo "🔄 Setting active project to vf-onemap-data..."
firebase use vf-onemap-data 2>/dev/null || {
    echo "❌ Project vf-onemap-data not found"
    echo ""
    echo "Available projects:"
    firebase projects:list
    echo ""
    echo "Please ensure you have access to vf-onemap-data project"
    exit 1
}

echo "✅ Using project: vf-onemap-data"
echo ""

# Create a Node.js script that will run with Firebase CLI auth
cat > /tmp/vf-onemap-import-temp.js << 'EOF'
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize with application default credentials (from Firebase CLI)
initializeApp({
  projectId: 'vf-onemap-data'
});

const db = getFirestore();

// Import function
async function importData() {
  console.log('📊 Starting data import...');
  
  try {
    // Test connection
    const testDoc = await db.collection('test').doc('connection').set({
      timestamp: new Date(),
      test: true
    });
    
    console.log('✅ Successfully connected to vf-onemap-data!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Update this script to read your CSV files');
    console.log('2. Process and import the data');
    console.log('3. Generate reports');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

importData();
EOF

# Run the import
echo "🔄 Running import..."
GOOGLE_APPLICATION_CREDENTIALS="" node /tmp/vf-onemap-import-temp.js

# Cleanup
rm -f /tmp/vf-onemap-import-temp.js

echo ""
echo "✅ Process complete!"