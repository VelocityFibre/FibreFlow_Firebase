# PostgreSQL Staging Environment - AI Context

## Module Purpose

This PostgreSQL staging environment is the **primary import target** for Excel/CSV data and the **staging layer** before Supabase cloud production. It works alongside SQLite and DuckDB for cross-validation to ensure data integrity.

## Core Functions

1. **Direct Excel → PostgreSQL Import**
   - Import Excel/CSV data directly to PostgreSQL
   - Handle status history tracking
   - Implement deduplication logic
   - Apply business rules during import

2. **Cross-Database Validation**
   - Compare with independent SQLite imports
   - Validate against DuckDB analytics
   - Ensure consistency across all three databases
   - Identify and resolve discrepancies

3. **Supabase Synchronization**
   - Push validated data from PostgreSQL to Supabase
   - Use native PostgreSQL tools (pg_dump/restore)
   - No data transformation needed
   - Maintain exact schema compatibility

## Critical Context

### Data Flow
```
                Excel/CSV Files
                      ↓
    ┌─────────────────┼─────────────────┐
    ↓                 ↓                 ↓
PostgreSQL        SQLite           DuckDB
(Primary)      (Validation)     (Analytics)
    ↓                 ↓                 ↓
    └────── Cross-Validation ───────────┘
                      ↓
              PostgreSQL → Supabase
               (Direct Sync)
```

### Why PostgreSQL as Primary Import Target
- **Type Compatibility**: Native support for Supabase types (UUID, JSONB, Arrays)
- **Status History**: Built-in support for JSONB arrays for tracking changes
- **Direct Sync**: PostgreSQL → Supabase requires no transformation
- **Import Logic**: Can reuse OneMap import patterns directly

### Key Database Tables
- `poles` - Fiber optic pole locations
- `drops` - Customer connections (max 12 per pole)
- `status_changes` - Historical status tracking
- `properties` - Address/property information

### Business Rules to Enforce
1. **Pole numbers must be globally unique**
2. **Maximum 12 drops per pole**
3. **Drop numbers must be unique**
4. **GPS coordinates required for poles**
5. **Status changes preserve history**

## Common Operations

### 1. Initial Setup
```bash
# Install PostgreSQL (Arch/CachyOS)
sudo pacman -S postgresql
./scripts/setup-postgres.sh
```

### 2. Import from SQLite
```bash
# Full import
node scripts/sqlite-to-postgres.js

# Specific tables
node scripts/sqlite-to-postgres.js --tables poles,drops
```

### 3. Validate Data
```bash
# Run all validations
node scripts/validate-data.js

# Check specific issues
node scripts/validate-data.js --check duplicates
node scripts/validate-data.js --check relationships
```

### 4. Sync to Supabase
```bash
# Push to production
./scripts/sync-to-supabase.sh push

# Pull from production
./scripts/sync-to-supabase.sh pull
```

## File Locations

### Configuration
- `config/database.json` - Database connection settings
- `config/schema.sql` - PostgreSQL schema definition

### Scripts
- `scripts/setup-postgres.sh` - Initial PostgreSQL setup
- `scripts/sqlite-to-postgres.js` - Migration script
- `scripts/validate-data.js` - Data validation
- `scripts/sync-to-supabase.sh` - Cloud synchronization

### Logs
- `logs/migration-*.log` - Migration history
- `logs/validation-*.log` - Validation results
- `logs/sync-*.log` - Sync operations

## Error Handling

### Common Issues
1. **Type Mismatch**: SQLite text → PostgreSQL UUID
   - Solution: Use mapping in migration script
   
2. **Duplicate Keys**: Same pole number exists
   - Solution: Run deduplication before sync
   
3. **Missing Relationships**: Drop references non-existent pole
   - Solution: Validate foreign keys before sync

### Validation Failures
- All validations must pass before sync
- Failed validations logged with details
- Manual intervention may be required

## Development Workflow

1. **Make changes in SQLite** (rapid development)
2. **Migrate to PostgreSQL** (type safety)
3. **Run validations** (data integrity)
4. **Test locally** (PostgreSQL = Supabase)
5. **Sync to cloud** (production ready)

## Important Notes

- **Never sync invalid data** to production
- **Always backup** before major operations
- **Test migrations** on PostgreSQL first
- **Monitor sync logs** for issues
- **PostgreSQL version** should match Supabase (15+)

## Quick Troubleshooting

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -U postgres -d fibreflow_staging

# View tables
\dt

# Check row counts
SELECT COUNT(*) FROM poles;

# View recent logs
tail -f logs/sync-*.log
```

## Module Dependencies

- PostgreSQL 15+
- Node.js for scripts
- SQLite for source data
- Supabase CLI (optional)

## Related Documentation

- Parent project: `/CLAUDE.md`
- OneMap context: `/OneMap/CLAUDE.md`
- SQLite location: `/OneMap/onemap.db`
- Supabase config: `/supabase/config.toml`