const fetch = require('node-fetch');

// Simple script to check if meetings sync worked
console.log(`
===========================================
Checking Firebase Database for Meetings
===========================================

Since the sync function is experiencing CORS issues, let's verify
if any meetings were previously synced to the database.

The meetings should be stored in the 'meetings' collection in Firestore.

To check this:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your FibreFlow project
3. Go to Firestore Database
4. Look for the 'meetings' collection

If the collection exists and has documents, then the sync
worked at some point. The CORS issue is preventing new syncs.

Current status based on your console errors:
- The sync function is deployed ✓
- The API key is configured ✓ 
- The Fireflies API returns data ✓
- But the Angular app can't call the function due to CORS ❌

This suggests the Firebase SDK might not be properly initialized
or there's a region mismatch between the app and functions.
`);