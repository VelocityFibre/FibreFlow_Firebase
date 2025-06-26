const functions = require('firebase-functions');

// Airtable configuration
const AIRTABLE_CONFIG = {
  personalAccessToken: functions.config().airtable?.pat || process.env.AIRTABLE_PAT,
  baseId: 'appkYMgaK0cHVu4Zg', // Velocity Fibre Management base
  apiUrl: 'https://api.airtable.com/v0',
  maxRecordsPerPage: 100,
  requestsPerSecond: 5
};

// Table mappings - map Airtable tables to Firebase collections
const TABLE_MAPPINGS = {
  // Update these based on your actual Airtable table names
  'Contractors': {
    firebaseCollection: 'contractors',
    primaryKey: 'id',
    fields: {
      'Name': 'name',
      'Email': 'email',
      'Phone': 'phone',
      'Status': 'status',
      'Company': 'company',
      // Add more field mappings as needed
    }
  },
  'Staff': {
    firebaseCollection: 'staff',
    primaryKey: 'id',
    fields: {
      'Name': 'name',
      'Email': 'email',
      'Role': 'role',
      'Department': 'department',
      // Add more field mappings
    }
  },
  'Daily Progress': {
    firebaseCollection: 'dailyProgress',
    primaryKey: 'id',
    fields: {
      'Date': 'date',
      'Contractor': 'contractorId',
      'Progress': 'progress',
      'Notes': 'notes',
      // Add more field mappings
    }
  },
  'Poles': {
    firebaseCollection: 'poleTracker',
    primaryKey: 'id',
    fields: {
      'Pole ID': 'poleId',
      'Location': 'location',
      'Status': 'status',
      'Installation Date': 'installationDate',
      // Add more field mappings
    }
  }
};

module.exports = {
  AIRTABLE_CONFIG,
  TABLE_MAPPINGS
};