# Firebase Import Development Plan - OneMap to VF Database

**Date**: 2025-07-23  
**Author**: Based on Kobus's recommendations  
**Status**: Planning Phase

## Executive Summary

Following issues with pre-processing CSV data before import, we're implementing a new strategy: **Import First, Process Later**. This document outlines the complete plan for setting up a dedicated Firebase infrastructure for OneMap data imports.

## Voice Note Key Insights (2025-07-23)

### What Went Wrong
- Pre-import processing caused timeouts
- Complex scripts before database import created bottlenecks
- Network issues compounded by local processing

### Kobus's Solution
1. Import raw data directly to database
2. Use unique IDs for deduplication
3. Process/clean data AFTER it's in database
4. Use server-side infrastructure (Storage → Firestore)

## Implementation Plan

### 1. Create Separate Firebase Database

**Project Setup**:
```bash
# Create new Firebase project
firebase projects:create vf-onemap-data

# Set up Firestore database
firebase init firestore

# Configure for production
firebase use vf-onemap-data
```

**Database Structure**:
```
vf-onemap-data/
├── raw_imports/          # Raw CSV data
│   └── {propertyId}/     # Document per record
├── processed_data/       # Cleaned data
├── import_metadata/      # Import tracking
└── analytics_cache/      # BigQuery sync
```

### 2. Firebase Storage Configuration

**Bucket Setup**:
```bash
# Create Storage bucket
gsutil mb -p vf-onemap-data gs://vf-onemap-imports/

# Set lifecycle rules (optional)
gsutil lifecycle set lifecycle.json gs://vf-onemap-imports/
```

**Directory Structure**:
```
gs://vf-onemap-imports/
├── incoming/            # New CSV uploads
├── processing/          # Currently importing
├── completed/           # Successfully imported
└── failed/             # Failed imports
```

### 3. Import Function Architecture

**Cloud Function for Import**:
```javascript
// functions/importFromStorage.js
exports.importCSVFromStorage = functions.storage
  .bucket('vf-onemap-imports')
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const bucket = admin.storage().bucket(object.bucket);
    const file = bucket.file(filePath);
    
    // Stream CSV directly to Firestore
    const stream = file.createReadStream();
    const parser = csv.parse({ columns: true });
    
    let batch = db.batch();
    let count = 0;
    
    stream.pipe(parser)
      .on('data', (row) => {
        // Use Property ID as document ID (ensures uniqueness)
        const docRef = db.collection('raw_imports').doc(row['Property ID']);
        batch.set(docRef, {
          ...row,
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          sourceFile: filePath
        }, { merge: true }); // Merge to handle duplicates
        
        count++;
        if (count % 500 === 0) {
          // Commit batch every 500 documents
          await batch.commit();
          batch = db.batch();
        }
      })
      .on('end', async () => {
        await batch.commit();
        // Move file to completed
        await moveFile(filePath, 'completed');
      });
  });
```

### 4. Google Cloud CLI Setup

**Installation**:
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Initialize and authenticate
gcloud init
gcloud auth login

# Set default project
gcloud config set project vf-onemap-data
```

**Essential Commands**:
```bash
# Upload CSVs to Storage
gsutil cp OneMap/downloads/*.csv gs://vf-onemap-imports/incoming/

# List files
gsutil ls gs://vf-onemap-imports/

# Monitor uploads
gsutil -m cp -r OneMap/downloads/* gs://vf-onemap-imports/incoming/
```

### 5. Google Tasks Configuration

**When Needed**: For processing operations > 60 seconds

**Setup**:
```javascript
// functions/setupTasks.js
const {CloudTasksClient} = require('@google-cloud/tasks');
const client = new CloudTasksClient();

async function createProcessingTask(csvFile) {
  const project = 'vf-onemap-data';
  const queue = 'csv-processing';
  const location = 'us-central1';
  const url = 'https://us-central1-vf-onemap-data.cloudfunctions.net/processCSV';
  
  const parent = client.queuePath(project, location, queue);
  
  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url,
      body: Buffer.from(JSON.stringify({ file: csvFile })).toString('base64'),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  };
  
  const request = {parent, task};
  const [response] = await client.createTask(request);
  return response.name;
}
```

### 6. BigQuery Integration

**Dataset Setup**:
```bash
# Create BigQuery dataset
bq mk --dataset --location=US vf-onemap-data:onemap_analytics

# Create tables
bq mk --table \
  vf-onemap-data:onemap_analytics.pole_permissions \
  schema/pole_permissions.json
```

**Schema (pole_permissions.json)**:
```json
[
  {"name": "property_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "onemap_nad_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "pole_number", "type": "STRING", "mode": "NULLABLE"},
  {"name": "drop_number", "type": "STRING", "mode": "NULLABLE"},
  {"name": "stand_number", "type": "STRING", "mode": "NULLABLE"},
  {"name": "status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "flow_name_groups", "type": "STRING", "mode": "NULLABLE"},
  {"name": "site", "type": "STRING", "mode": "NULLABLE"},
  {"name": "sections", "type": "STRING", "mode": "NULLABLE"},
  {"name": "pons", "type": "STRING", "mode": "NULLABLE"},
  {"name": "location_address", "type": "STRING", "mode": "NULLABLE"},
  {"name": "latitude", "type": "FLOAT64", "mode": "NULLABLE"},
  {"name": "longitude", "type": "FLOAT64", "mode": "NULLABLE"},
  {"name": "field_agent_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "last_modified_date", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "imported_at", "type": "TIMESTAMP", "mode": "REQUIRED"}
]
```

**Firestore to BigQuery Export**:
```javascript
// functions/exportToBigQuery.js
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

exports.exportToBigQuery = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const datasetId = 'onemap_analytics';
    const tableId = 'pole_permissions';
    
    // Query Firestore
    const snapshot = await db.collection('processed_data').get();
    const rows = snapshot.docs.map(doc => ({
      property_id: doc.id,
      ...doc.data()
    }));
    
    // Insert into BigQuery
    await bigquery
      .dataset(datasetId)
      .table(tableId)
      .insert(rows);
  });
```

### 7. Processing Pipeline

**Step 1: Upload to Storage**
```bash
# Find earliest CSV by date
ls -la OneMap/downloads/*.csv | sort

# Upload first file
gsutil cp "OneMap/downloads/Lawley May Week 3 22052025 - First Report.csv" \
  gs://vf-onemap-imports/incoming/
```

**Step 2: Automatic Import Triggered**
- Cloud Function detects new file
- Streams CSV to Firestore
- Uses Property ID for deduplication
- Moves file to completed/

**Step 3: Post-Import Processing**
```javascript
// Process imported data
exports.processImportedData = functions.firestore
  .document('raw_imports/{propertyId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // Apply Hein's specification logic
    if (data.flow_name_groups?.includes('Pole Permission: Approved') &&
        !data.flow_name_groups?.includes('Home Sign Ups')) {
      
      // Check for pole number
      if (!data.pole_number) {
        // Move to no_pole_allocated collection
        await db.collection('no_pole_allocated').doc(data.property_id).set(data);
        return;
      }
      
      // Check for duplicates by pole number
      const existing = await db.collection('processed_data')
        .where('pole_number', '==', data.pole_number)
        .orderBy('last_modified_date')
        .limit(1)
        .get();
      
      if (existing.empty || data.last_modified_date < existing.docs[0].data().last_modified_date) {
        // This is the first or earliest record
        await db.collection('processed_data').doc(data.property_id).set(data);
      } else {
        // Duplicate - move to duplicates collection
        await db.collection('duplicate_poles_removed').doc(data.property_id).set(data);
      }
    }
  });
```

## Testing Plan

### Phase 1: Infrastructure Setup
- [ ] Create VF Firebase project
- [ ] Configure Storage bucket
- [ ] Deploy import Cloud Function
- [ ] Set up BigQuery dataset

### Phase 2: First Import Test
- [ ] Upload earliest CSV (May 22, 2025)
- [ ] Monitor import progress
- [ ] Verify deduplication works
- [ ] Check BigQuery export

### Phase 3: Bulk Import
- [ ] Upload remaining CSVs chronologically
- [ ] Monitor for errors/timeouts
- [ ] Verify data integrity

## Monitoring & Debugging

### Cloud Logging
```bash
# View import function logs
gcloud functions logs read importCSVFromStorage --limit 50

# View specific errors
gcloud logging read "resource.type=cloud_function AND severity>=ERROR" --limit 10
```

### Firestore Metrics
- Monitor document count
- Check for duplicates
- Verify Property ID uniqueness

### BigQuery Validation
```sql
-- Check import counts
SELECT 
  DATE(imported_at) as import_date,
  COUNT(*) as records_imported,
  COUNT(DISTINCT property_id) as unique_properties,
  COUNT(DISTINCT pole_number) as unique_poles
FROM `vf-onemap-data.onemap_analytics.pole_permissions`
GROUP BY import_date
ORDER BY import_date;

-- Find duplicates
SELECT 
  pole_number,
  COUNT(*) as duplicate_count,
  STRING_AGG(property_id) as property_ids
FROM `vf-onemap-data.onemap_analytics.pole_permissions`
WHERE pole_number IS NOT NULL
GROUP BY pole_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

## Cost Estimates

### Firebase Costs (Monthly)
- Firestore: ~$0.18/GB stored + $0.06/100K reads
- Storage: ~$0.026/GB
- Functions: ~$0.40/million invocations

### BigQuery Costs
- Storage: $0.02/GB/month
- Queries: $5/TB scanned
- Streaming inserts: $0.05/GB

### Estimated Total
- Initial import (1M records): ~$10
- Monthly operations: ~$20-50

## Benefits of This Approach

1. **Reliability**: Server-side processing eliminates timeouts
2. **Scalability**: Handles millions of records
3. **Flexibility**: Easy to modify processing logic
4. **Analytics**: BigQuery enables complex queries
5. **Monitoring**: Full visibility into import process
6. **Cost-Effective**: Pay only for what you use

## Next Steps

1. Get approval for new Firebase project
2. Set up billing account
3. Begin infrastructure deployment
4. Test with single CSV file
5. Document any issues/learnings
6. Scale to full dataset

---

**Note**: This plan addresses all the issues from the 2025-07-23 voice note and provides a robust, scalable solution for OneMap data imports.