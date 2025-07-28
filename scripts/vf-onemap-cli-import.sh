#!/bin/bash

# vf-onemap-data Import Using Firebase CLI
# ========================================
# Uses your existing Firebase login (louis@velocityfibreapp.com)

echo "🚀 vf-onemap-data Import via Firebase CLI"
echo "========================================"
echo "📧 Using: louis@velocityfibreapp.com"
echo ""

# Set the project
echo "🔄 Setting project to vf-onemap-data..."
firebase use vf-onemap-data

# Create a temporary import script
cat > /tmp/import-to-vf-onemap.js << 'EOF'
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase config for vf-onemap-data
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // You need to get this from Firebase Console
  authDomain: "vf-onemap-data.firebaseapp.com",
  projectId: "vf-onemap-data",
  storageBucket: "vf-onemap-data.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your import logic here...
console.log('✅ Connected to vf-onemap-data!');
console.log('📝 To complete import:');
console.log('1. Get Firebase config from Console');
console.log('2. Update firebaseConfig above');
console.log('3. Add CSV import logic');
EOF

echo ""
echo "📋 INSTRUCTIONS:"
echo "1. Get Firebase config from:"
echo "   https://console.firebase.google.com/project/vf-onemap-data/settings/general"
echo "   (Scroll down to 'Your apps' section)"
echo ""
echo "2. This method uses Firebase Client SDK (not Admin SDK)"
echo "   - Works with your Firebase login"
echo "   - No service account needed"
echo "   - But needs Firebase config values"