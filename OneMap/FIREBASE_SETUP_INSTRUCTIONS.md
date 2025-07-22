# Firebase Setup Instructions for VF OneMap Data

**Account**: louis@velocityfibreapp.com  
**Date**: 2025-07-23

## Step 1: Create Firebase Project

1. Open your browser and go to: https://console.firebase.google.com
2. Make sure you're logged in as **louis@velocityfibreapp.com**
3. Click "Create a project"
4. Enter project name: **vf-onemap-data**
5. Accept the terms and click "Continue"
6. Disable Google Analytics (not needed for data import)
7. Click "Create project"

## Step 2: Enable Firestore Database

1. In the Firebase Console for vf-onemap-data
2. Click "Firestore Database" in the left menu
3. Click "Create database"
4. Choose "Production mode"
5. Select location: **us-central1** (or your preferred region)
6. Click "Enable"

## Step 3: Enable Firebase Storage

1. Click "Storage" in the left menu
2. Click "Get started"
3. Start in production mode
4. Select same location as Firestore
5. Click "Done"

## Step 4: Generate Service Account Key

1. Click the gear icon → "Project settings"
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file as: `vf-onemap-data-service-account.json`
5. Place it in: `/home/ldp/VF/Apps/FibreFlow/OneMap/credentials/`

## Step 5: Get Firebase Config

1. In Project settings → General tab
2. Scroll down to "Your apps"
3. Click "</>" (Web app)
4. Register app name: "VF OneMap Import"
5. Copy the firebaseConfig object

Save this configuration:
```javascript
// Save this in: OneMap/config/firebase-config.js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "vf-onemap-data.firebaseapp.com",
  projectId: "vf-onemap-data",
  storageBucket: "vf-onemap-data.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

module.exports = firebaseConfig;
```

## Step 6: Install Firebase Admin SDK

```bash
cd /home/ldp/VF/Apps/FibreFlow/OneMap
npm init -y
npm install firebase-admin @google-cloud/storage csv-parser
```

## Step 7: Set Up Authentication

Create a `.env` file in OneMap directory:
```
GOOGLE_APPLICATION_CREDENTIALS=./credentials/vf-onemap-data-service-account.json
PROJECT_ID=vf-onemap-data
STORAGE_BUCKET=vf-onemap-data.appspot.com
```

## Step 8: Verify Setup

Once you've completed the above steps, we can run this verification script:

```javascript
// verify-setup.js
require('dotenv').config();
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function verify() {
  try {
    // Test Firestore
    await db.collection('test').add({
      message: 'Setup verified',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Firestore connection successful');
    
    // Test Storage
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Storage connection successful');
    
    console.log('\n🎉 Firebase setup complete!');
  } catch (error) {
    console.error('❌ Setup verification failed:', error);
  }
}

verify();
```

## Next Steps

After completing the Firebase setup:
1. We'll create the Storage bucket structure
2. Set up the import Cloud Function
3. Configure BigQuery dataset
4. Test with the first CSV file

Please complete steps 1-7 and let me know when you're ready to proceed!