// vf-onemap-data Firebase Project Configuration
// Separate database for OneMap CSV imports

const firebaseConfig = {
  // This will be configured for the vf-onemap-data Firebase project
  projectId: "vf-onemap-data",
  // Add other config when Firebase project is created
  
  // Collections structure for import database
  collections: {
    // Raw CSV imports by date
    csvImports: "csv-imports",
    
    // Processed records by unique ID
    processedRecords: "processed-records",
    
    // Change tracking
    changeHistory: "change-history",
    
    // Daily import reports
    importReports: "import-reports",
    
    // Import batch metadata
    importBatches: "import-batches"
  },
  
  // Import settings
  settings: {
    uniqueIdField: "propertyId", // Primary unique identifier
    enableChangeTracking: true,
    enableDuplicateDetection: true,
    batchSize: 500 // Records per batch
  }
};

module.exports = firebaseConfig;