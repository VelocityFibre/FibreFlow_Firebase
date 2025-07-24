# Firestore Module - Two-Stage Import System

## Overview

The Firestore Module implements a **two-stage import process** for OneMap CSV data:

1. **Stage 1: Staging Database** - Import and validate
2. **Stage 2: Production Sync** - Push clean data to FibreFlow

## Architecture

```
Daily CSV Files
    ↓
[STAGING FIRESTORE]     ← Separate Firebase project
    ├── Import raw data
    ├── Validate & check
    ├── Generate reports
    └── Fix issues
    ↓
[VALIDATION COMPLETE]
    ↓
[SYNC TO PRODUCTION]    ← Manual trigger
    ↓
[FIBREFLOW PRODUCTION]  ← Live system
```

## Benefits

1. **Data Safety**: Production never sees bad data
2. **Testing**: Full testing in staging environment
3. **Validation**: All checks happen before production
4. **Rollback**: Easy to restart if issues found
5. **Reporting**: Generate reports from staging data

## Staging Database Configuration

```javascript
// Staging Firebase Config (separate from production)
const stagingConfig = {
  apiKey: "staging-api-key",
  authDomain: "onemap-staging.firebaseapp.com",
  projectId: "onemap-staging",
  storageBucket: "onemap-staging.appspot.com",
  messagingSenderId: "staging-sender-id",
  appId: "staging-app-id"
};
```

## Workflow

### 1. Daily Import to Staging
```bash
# Process today's CSV file
node import/process-daily-csv.js --file "Lawley May Week 3 22052025.csv"

# Check import results
node reports/check-import-status.js
```

### 2. Validation & Reports
```bash
# Generate data quality report
node reports/generate-quality-report.js

# Check for duplicates
node validation/check-duplicates.js

# Generate pole reports
node reports/generate-pole-reports.js
```

### 3. Sync to Production (After Validation)
```bash
# Dry run first
node sync/sync-to-production.js --dry-run

# If everything looks good
node sync/sync-to-production.js --confirm
```

## Collections Structure

### Staging Database:
```
staging/
├── csv-imports/          # Raw import records
│   └── {propertyId}/    # Indexed by Property ID
├── pole-records/         # Processed pole data
│   └── {poleNumber}/    # Indexed by Pole Number
├── import-batches/       # Import metadata
│   └── {date}/          # Track daily imports
└── validation-reports/   # Quality checks
    └── {date}/          # Daily validation results
```

### Production Sync:
```
analytics/
├── pole-reports/         # Final pole reports
├── property-records/     # Verified property data
└── daily-summaries/      # Production summaries
```

## Safety Features

1. **No Direct Production Access**: Import scripts can't write to production
2. **Validation Required**: Sync only works after validation passes
3. **Batch Tracking**: Every import is tracked and versioned
4. **Rollback Support**: Can revert staging without affecting production
5. **Audit Trail**: Complete history of all imports and syncs

## Current Status

- [ ] Set up staging Firebase project
- [ ] Create import scripts
- [ ] Build validation system
- [ ] Implement sync mechanism
- [ ] Test with sample data

## Next Steps

1. Create staging Firebase project
2. Test import with first CSV file
3. Build validation reports
4. Test sync mechanism
5. Document any issues found