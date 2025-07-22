#!/usr/bin/env node

/**
 * Simple Firebase Setup for Solo Dev
 * No complex permissions - just direct access
 */

const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const dirs = ['./credentials', './config', './scripts'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create simple config file
const firebaseConfig = `
// Firebase configuration for VF OneMap Data
const config = {
  projectId: "vf-onemap-data",
  storageBucket: "vf-onemap-data.appspot.com",
  // Add other config values when you get them from Firebase Console
};

module.exports = config;
`;

fs.writeFileSync('./config/firebase-config.js', firebaseConfig);

// Create .env file
const envContent = `
# Firebase Configuration
PROJECT_ID=vf-onemap-data
STORAGE_BUCKET=vf-onemap-data.appspot.com
GOOGLE_APPLICATION_CREDENTIALS=./credentials/vf-onemap-service-account.json
`;

fs.writeFileSync('./.env', envContent.trim());

// Create package.json if it doesn't exist
if (!fs.existsSync('./package.json')) {
  const packageJson = {
    name: "vf-onemap-import",
    version: "1.0.0",
    description: "OneMap CSV Import to Firebase",
    main: "index.js",
    scripts: {
      "upload": "node scripts/upload-csv.js",
      "import": "node scripts/import-from-storage.js",
      "test": "node scripts/test-connection.js"
    }
  };
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
}

console.log('✅ Created directory structure');
console.log('✅ Created config files');
console.log('\n📋 Next steps:');
console.log('1. Download your service account key from Firebase Console');
console.log('2. Save it as: ./credentials/vf-onemap-service-account.json');
console.log('3. Run: npm install firebase-admin csv-parser dotenv');
console.log('4. Test with: npm run test');