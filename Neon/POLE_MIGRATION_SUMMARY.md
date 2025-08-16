# Pole Data Migration to Neon - Summary

## Overview
Since you already have an established Neon database with pole-related tables, we're using your existing schema rather than creating new tables.

## Existing Neon Tables (Already Created)
- `project_poles` - Main pole data (currently empty, ready for data)
- `project_drops` - Drop/home connections (currently empty, ready for data)
- `status_history` - Status change tracking (57 records)
- `sow_poles` - SOW pole data (4,471 records from Excel imports)
- `sow_drops` - SOW drop data (23,707 records from Excel imports)
- `pole_capacity` - Capacity tracking table

## Migration Approach

### 1. Firebase → Neon Migration Script
**Location**: `Neon/scripts/migrate-firebase-poles-to-neon.js`

**What it does**:
- Migrates pole data from Firebase collections to `project_poles` table
- Migrates drop data from Firebase collections to `project_drops` table  
- Preserves all relationships and data integrity
- Handles GPS coordinate conversion
- Maps Firebase status values to Neon status values
- Prevents duplicates by checking existing records

**Run with**:
```bash
# Test migration (dry run)
node Neon/scripts/migrate-firebase-poles-to-neon.js --dry-run

# Run actual migration
node Neon/scripts/migrate-firebase-poles-to-neon.js

# Migrate specific project only
node Neon/scripts/migrate-firebase-poles-to-neon.js --project=oAigmUjSbjWHmH80AMxc
```

### 2. Updated PoleTrackerService
**Location**: `src/app/features/pole-tracker/services/pole-tracker-neon.service.ts`

**Changes**:
- Uses existing `project_poles` and `project_drops` tables
- Maintains same API as Firebase service for easy migration
- Handles boolean upload flags (upload_before, upload_front, etc.)
- Works with existing `status_history` table structure
- Converts between Neon's separate GPS fields and location strings

### 3. Key Differences from Firebase

| Feature | Firebase | Neon |
|---------|----------|------|
| Pole data | Multiple collections | Single `project_poles` table |
| Drop data | Multiple collections | Single `project_drops` table |
| Photos | Nested object | Boolean flags per photo type |
| GPS | String "lat,lng" | Separate gps_lat, gps_lon fields |
| Status | Various formats | Standardized values |
| Real-time | Automatic | Requires polling/refresh |

## Migration Steps

### Step 1: Run Migration Script
```bash
cd /home/ldp/VF/Apps/FibreFlow

# Install dependencies if needed
cd Neon/scripts
npm install

# Check current data
node check-pole-table-structure.js

# Run migration
node migrate-firebase-poles-to-neon.js
```

### Step 2: Update Services
The new `PoleTrackerNeonService` is ready to use. Update components to use it:

```typescript
// Change from:
import { PoleTrackerService } from './services/pole-tracker.service';

// To:
import { PoleTrackerNeonService } from './services/pole-tracker-neon.service';
```

### Step 3: Test Functionality
1. Check pole listing works
2. Test create/update/delete operations
3. Verify status history tracking
4. Test photo upload flags
5. Check drop connections

## Benefits of Using Existing Schema

1. **No Schema Changes** - Uses tables already in Neon
2. **Consistent with SOW** - Same structure as SOW imports
3. **Proven Structure** - Already handling 28,000+ records
4. **Integration Ready** - Works with existing queries/views
5. **No Migration Risk** - Tables already tested in production

## Data Integrity

The existing schema already has:
- Unique constraints on project_id + pole_number
- Foreign key relationships to projects table
- Indexes for performance
- Status history tracking

## Next Steps

1. **Run the migration** to populate `project_poles` and `project_drops`
2. **Update UI components** to use the Neon service
3. **Test thoroughly** before removing Firebase collections
4. **Monitor performance** with the consolidated data

## Important Notes

- The SOW tables (`sow_poles`, `sow_drops`) remain separate from project tables
- Photo URLs are not stored in Neon - only boolean flags for upload status
- GPS coordinates are stored as separate numeric fields, not PostGIS
- Status values should follow the existing patterns in the database