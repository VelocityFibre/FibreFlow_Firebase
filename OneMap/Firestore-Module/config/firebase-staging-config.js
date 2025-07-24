/**
 * Firebase Staging Configuration
 * Project: vf-onemap-data
 * 
 * This is our STAGING database - completely separate from FibreFlow production
 */

const stagingConfig = {
  apiKey: "YOUR-API-KEY-HERE", // Need to get this from Firebase Console
  authDomain: "vf-onemap-data.firebaseapp.com",
  projectId: "vf-onemap-data",
  storageBucket: "vf-onemap-data.appspot.com",
  messagingSenderId: "40059977157",
  appId: "YOUR-APP-ID" // Need to get this from Firebase Console
};

// Firestore collections for staging
const STAGING_COLLECTIONS = {
  CSV_IMPORTS: 'csv-imports',
  POLE_RECORDS: 'pole-records',
  PROPERTY_RECORDS: 'property-records',
  IMPORT_BATCHES: 'import-batches',
  VALIDATION_REPORTS: 'validation-reports',
  DAILY_SUMMARIES: 'daily-summaries'
};

module.exports = {
  stagingConfig,
  STAGING_COLLECTIONS
};