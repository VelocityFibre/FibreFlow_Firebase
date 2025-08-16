# Firebase to Neon Pole Data Migration

This directory contains the database schema and migration scripts to move all pole-related data from Firebase to Neon PostgreSQL.

## Overview

The migration consolidates multiple Firebase collections into a unified PostgreSQL schema:

### Firebase Collections → Neon Tables
- `pole-trackers`, `planned-poles`, `pole-installations` → `poles`
- `home-signups`, `homes-connected`, `homes-activated`, `drops` → `drops`
- Status history embedded in documents → `status_history`
- Photo uploads → `pole_photos`
- `import-batches` → `import_batches`

## Prerequisites

1. **Neon Database Setup**
   - Create a Neon project at https://neon.tech
   - Enable PostGIS extension (for GPS coordinates)
   - Get your connection string

2. **Environment Variables**
   ```bash
   export NEON_DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Firebase Service Account**
   - Ensure `fibreflow-service-account.json` exists in parent directory
   - Has read access to all Firebase collections

## Migration Steps

### 1. Install Dependencies
```bash
cd database
npm install
```

### 2. Create Database Schema
```bash
# Run the schema creation script
psql $NEON_DATABASE_URL < neon-pole-schema.sql
```

### 3. Test Migration (Dry Run)
```bash
# Test the migration without making changes
npm run migrate:poles:dry

# Test with specific project
npm run migrate:poles:dry -- --project=oAigmUjSbjWHmH80AMxc
```

### 4. Run Full Migration
```bash
# Migrate all data
npm run migrate:poles

# Migrate specific project only
npm run migrate:poles -- --project=oAigmUjSbjWHmH80AMxc
```

## Migration Features

### Data Integrity
- **Pole Number Uniqueness**: Enforced at database level
- **Drop Number Uniqueness**: Enforced at database level
- **Capacity Limits**: Max 12 drops per pole (constraint)
- **Duplicate Prevention**: Skips already migrated records

### Data Transformation
- Firebase Timestamps → PostgreSQL timestamps
- Location strings → PostGIS geography points
- Status mapping to PostgreSQL enums
- Embedded data → Normalized tables

### Audit Trail
- Original Firebase IDs preserved in metadata
- Migration timestamp recorded
- Full original data stored in JSONB

### Error Handling
- Continues on individual record errors
- Detailed error logging
- Summary statistics at completion

## Post-Migration Steps

### 1. Verify Data
```sql
-- Check migration statistics
SELECT 
  (SELECT COUNT(*) FROM poles) as poles_count,
  (SELECT COUNT(*) FROM drops) as drops_count,
  (SELECT COUNT(*) FROM pole_photos) as photos_count,
  (SELECT COUNT(*) FROM status_history) as history_count;

-- Check for orphaned drops
SELECT COUNT(*) FROM drops WHERE pole_id IS NULL;

-- Verify drop counts
SELECT pole_number, drop_count, 
       (SELECT COUNT(*) FROM drops WHERE pole_id = p.id) as actual_drops
FROM poles p
WHERE drop_count != (SELECT COUNT(*) FROM drops WHERE pole_id = p.id);
```

### 2. Update Application Configuration
- Set `NEON_DATABASE_URL` in environment
- Update PoleTrackerService to use Neon
- Update all pole-related queries

### 3. Test Application
- Verify pole listing works
- Test pole creation/updates
- Check drop assignments
- Validate photo uploads

### 4. Remove Firebase Collections (After Verification)
```javascript
// Only after thorough testing!
// Use Firebase Console or admin scripts to remove:
// - pole-trackers
// - planned-poles
// - pole-installations
// - home-signups
// - homes-connected
// - homes-activated
// - drops
```

## Rollback Plan

If issues arise:

1. **Application Level**: Switch back to Firebase services
2. **Data Level**: Original data preserved in metadata field
3. **Firebase Data**: Not deleted until explicitly removed

## Migration Statistics

The migration script provides detailed statistics:
- Total records per collection
- Successfully migrated count
- Error count with details
- Processing time

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify NEON_DATABASE_URL is correct
   - Check SSL settings
   - Ensure PostGIS extension is enabled

2. **Duplicate Key Errors**
   - Run migration for specific projects
   - Check for pre-existing data in Neon

3. **Memory Issues**
   - Process in smaller batches using project filter
   - Increase Node.js memory: `node --max-old-space-size=4096`

### Debug Mode
```bash
# Enable detailed logging
DEBUG=* npm run migrate:poles:dry
```

## Next Steps

After successful migration:
1. Update PoleTrackerService (see `pole-tracker-neon.service.ts`)
2. Update UI components to use new service
3. Test all pole-related functionality
4. Monitor performance and optimize queries
5. Set up regular backups in Neon