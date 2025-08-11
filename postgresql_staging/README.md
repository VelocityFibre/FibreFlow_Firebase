# PostgreSQL Staging Environment for FibreFlow

## Purpose

This PostgreSQL staging environment serves as the **primary import and staging layer** for Excel/CSV data before syncing to Supabase cloud production. It provides exact SQL compatibility with Supabase while allowing cross-validation with SQLite and DuckDB.

## Why PostgreSQL as Primary Import Target?

### 1. **Direct Excel → PostgreSQL Import**
- Import Excel data directly to PostgreSQL
- No intermediate transformations needed
- Same data types as production (Supabase)
- Immediate compatibility testing

### 2. **Native Supabase Compatibility**
```sql
-- PostgreSQL/Supabase native types work immediately
CREATE TABLE poles (
  id UUID DEFAULT gen_random_uuid(),
  data JSONB,
  tags TEXT[],
  location GEOGRAPHY(POINT, 4326),
  status_history JSONB[]  -- Array of JSON objects
);
```

### 3. **Cross-Validation Architecture**
- PostgreSQL: Primary import and staging
- SQLite: Independent import for validation
- DuckDB: Analytics and data quality checks
- Compare all three for data integrity

### 4. **Simple Production Sync**
- Direct PostgreSQL → Supabase sync
- Native pg_dump/pg_restore tools
- No data type conversions
- One-command deployment

## Architecture

```
                 Excel/CSV Data
                      ↓
    ┌─────────────────┼─────────────────┐
    ↓                 ↓                 ↓
PostgreSQL        SQLite           DuckDB
(Primary)      (Validation)     (Analytics)
    ↓                 ↓                 ↓
    └─────────────────┼─────────────────┘
                      ↓
              Cross-Validation
                      ↓
              PostgreSQL → Supabase Cloud
                   (Direct Sync)
```

## Quick Start

### 1. Install PostgreSQL
```bash
# Arch/CachyOS
sudo pacman -S postgresql
sudo -u postgres initdb -D /var/lib/postgres/data
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Setup Database
```bash
./scripts/setup-postgres.sh
```

### 3. Import from Excel/CSV
```bash
# Direct import to PostgreSQL
node scripts/import-excel-to-postgres.js data/latest.xlsx

# Import with status tracking
node scripts/import-with-status-tracking.js data/onemap_export.csv
```

### 4. Cross-Validate Data
```bash
# Compare with SQLite and DuckDB
node scripts/cross-validate-databases.js

# View validation report
cat logs/validation-report-latest.json
```

### 5. Sync to Supabase
```bash
# Push to production
./scripts/postgres-to-supabase-sync.sh push

# Pull from production (for testing)
./scripts/postgres-to-supabase-sync.sh pull
```

## Directory Structure

```
postgresql_staging/
├── README.md          # This file
├── CLAUDE.md          # AI context for this module
├── config/
│   ├── database.json  # Database connections
│   └── schema.sql     # PostgreSQL schema
├── scripts/
│   ├── setup-postgres.sh
│   ├── sqlite-to-postgres.js
│   ├── validate-data.js
│   └── sync-to-supabase.sh
├── migrations/        # SQL migrations
├── validations/       # Data validation rules
└── logs/             # Sync and validation logs
```

## Features

- **Automated SQLite → PostgreSQL migration**
- **Data validation before cloud sync**
- **Duplicate detection and cleanup**
- **Schema compatibility checking**
- **Incremental sync support**
- **Rollback capabilities**

## Configuration

Edit `config/database.json`:
```json
{
  "sqlite": {
    "path": "../OneMap/onemap.db"
  },
  "postgres": {
    "host": "localhost",
    "port": 5432,
    "database": "fibreflow_staging",
    "user": "postgres",
    "password": "postgres"
  },
  "supabase": {
    "url": "https://xxx.supabase.co",
    "key": "your-anon-key"
  }
}
```

## Benefits Summary

1. **Data Integrity**: Catch type mismatches before production
2. **Performance**: Test queries with production-like data
3. **Safety**: Validate changes locally first
4. **Efficiency**: One-command syncs vs custom scripts
5. **Compatibility**: 100% Supabase SQL compliance

## Next Steps

1. Install PostgreSQL (see setup guide)
2. Run initial SQLite import
3. Validate data quality
4. Set up automated sync schedule