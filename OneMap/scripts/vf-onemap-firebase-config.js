/**
 * Firebase Configuration for vf-onemap-data Project
 * Project ID: vf-onemap-data
 * 
 * This configuration connects to the separate OneMap data project
 * for CSV storage and processing
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// vf-onemap-data Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VF_ONEMAP_API_KEY || "YOUR_API_KEY_HERE", // Update with actual key
  authDomain: "vf-onemap-data.firebaseapp.com",
  projectId: "vf-onemap-data",
  storageBucket: "vf-onemap-data.appspot.com",
  messagingSenderId: "40059977157",
  appId: process.env.VF_ONEMAP_APP_ID || "YOUR_APP_ID_HERE" // Update with actual ID
};

// Initialize Firebase app for vf-onemap-data
const vfOnemapApp = initializeApp(firebaseConfig, 'vf-onemap-data');

// Get services
export const vfOnemapDb = getFirestore(vfOnemapApp);
export const vfOnemapStorage = getStorage(vfOnemapApp);
export const vfOnemapAuth = getAuth(vfOnemapApp);

// Connect to emulator in development
if (process.env.NODE_ENV === 'development' && process.env.USE_EMULATOR === 'true') {
  connectFirestoreEmulator(vfOnemapDb, 'localhost', 8080);
}

// Export the app instance
export default vfOnemapApp;

// Collection names in vf-onemap-data
export const COLLECTIONS = {
  CSV_METADATA: 'csv-metadata',
  PROCESSED_RECORDS: 'processed-records',
  POLE_RECORDS: 'pole-records',
  CHANGE_HISTORY: 'change-history',
  IMPORT_BATCHES: 'import-batches',
  PROCESSING_LOGS: 'processing-logs'
};

// Helper function to get collection reference
export function getCollection(collectionName) {
  return collection(vfOnemapDb, collectionName);
}