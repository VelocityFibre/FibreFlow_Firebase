# Multi-Database Staging & Validation Workflow

## Architecture Overview

```
Excel/CSV Files
      ↓
┌─────────────────────────────────────────────────┐
│              LOCAL STAGING LAYER                │
├──────────────┬──────────────┬──────────────────┤
│   SQLite     │   DuckDB     │   PostgreSQL     │
│ (Existing)   │ (Analytics)  │ (Compatibility)  │
└──────────────┴──────────────┴──────────────────┘
      ↓                ↓                ↓
         Data Validation & Comparison
                     ↓
┌─────────────────────────────────────────────────┐
│              CLOUD STAGING LAYER                │
├──────────────────────┬──────────────────────────┤
│    Neon.tech        │   Supabase Dev Project   │
│  (Free Staging)     │   (Optional)              │
└──────────────────────┴──────────────────────────┘
                     ↓
            PRODUCTION (Supabase)
```

## Why Each Database?

### SQLite (Your Current)
- **Purpose**: Quick local storage, simple queries
- **Pros**: No setup, file-based, fast
- **Use for**: Initial data import, basic validation

### DuckDB (Your Current)
- **Purpose**: Analytics, complex queries, data profiling
- **Pros**: Columnar storage, fast aggregations, direct Excel import
- **Use for**: Data quality checks, statistical analysis

### PostgreSQL (Recommended Addition)
- **Purpose**: Supabase compatibility testing
- **Pros**: Same SQL dialect as Supabase, same data types
- **Use for**: Testing migrations, stored procedures, RLS policies

### Neon.tech (Cloud Staging)
- **Purpose**: Cloud-based staging without Docker
- **Pros**: Free tier, PostgreSQL compatible, branching
- **Use for**: Final validation before Supabase production

## Setup Instructions

### 1. Install Local PostgreSQL (No Docker)
```bash
# Arch/CachyOS
sudo pacman -S postgresql
sudo -u postgres initdb -D /var/lib/postgres/data
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create staging database
sudo -u postgres createdb fibreflow_staging
sudo -u postgres psql -c "CREATE USER staging_user WITH PASSWORD 'staging_pass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fibreflow_staging TO staging_user;"
```

### 2. Set Up Neon.tech Account
1. Sign up at https://neon.tech (free)
2. Create a project
3. Get connection string
4. No installation needed!

### 3. Install Dependencies
```bash
npm install xlsx sqlite3 duckdb pg @neondatabase/serverless
```

## Validation Workflow Scripts

### Step 1: Import Excel to All Databases
```javascript
// import-to-all-databases.js
const XLSX = require('xlsx');
const sqlite3 = require('sqlite3');
const duckdb = require('duckdb');
const { Client } = require('pg');

async function importToAllDatabases(excelFile) {
  // Read Excel
  const workbook = XLSX.readFile(excelFile);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  // 1. SQLite
  const sqliteDb = new sqlite3.Database('./staging.db');
  // ... import logic
  
  // 2. DuckDB
  const duckDb = new duckdb.Database('./staging.duckdb');
  // ... import logic
  
  // 3. Local PostgreSQL
  const pgLocal = new Client({
    host: 'localhost',
    database: 'fibreflow_staging',
    user: 'staging_user',
    password: 'staging_pass'
  });
  // ... import logic
  
  // 4. Neon (if using)
  const neonClient = new Client({
    connectionString: process.env.NEON_CONNECTION_STRING
  });
  // ... import logic
}
```

### Step 2: Cross-Database Validation
```javascript
// validate-across-databases.js
async function validateData() {
  const validationResults = {
    rowCounts: {},
    dataIntegrity: {},
    schemaMatches: {},
    performanceMetrics: {}
  };
  
  // Compare row counts
  validationResults.rowCounts = {
    sqlite: await getRowCount('sqlite', 'poles'),
    duckdb: await getRowCount('duckdb', 'poles'),
    postgres: await getRowCount('postgres', 'poles'),
    neon: await getRowCount('neon', 'poles')
  };
  
  // Check data integrity
  // - Unique constraints
  // - Foreign key relationships
  // - Data type consistency
  
  return validationResults;
}
```

### Step 3: Sync to Production
```javascript
// sync-to-production.js
async function syncToProduction(source = 'postgres') {
  // Only sync after validation passes
  const validation = await validateData();
  
  if (validation.passed) {
    // Sync to Supabase
    await syncToSupabase(source);
    
    // Or sync to Neon first as staging
    await syncToNeon(source);
  }
}
```

## Comparison Queries

### 1. Data Completeness Check
```sql
-- Run on all databases
SELECT 
  COUNT(*) as total_rows,
  COUNT(DISTINCT pole_number) as unique_poles,
  COUNT(CASE WHEN pole_number IS NULL THEN 1 END) as missing_poles,
  COUNT(CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 1 END) as missing_gps
FROM poles;
```

### 2. Duplicate Detection
```sql
-- Find duplicates across databases
WITH duplicates AS (
  SELECT pole_number, COUNT(*) as count
  FROM poles
  GROUP BY pole_number
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicates ORDER BY count DESC;
```

### 3. Data Type Validation
```sql
-- Check data types match Supabase schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'poles'
ORDER BY ordinal_position;
```

## Benefits of This Approach

1. **No Docker Required** - All databases run natively or in cloud
2. **Progressive Validation** - Test locally, then cloud staging, then production
3. **Multiple Validation Points** - Catch issues at each stage
4. **Technology Comparison** - See which database performs best
5. **Easy Rollback** - If issues found, don't sync to production

## Quick Start Commands

```bash
# 1. Set up all databases
./setup-staging-databases.sh

# 2. Import latest Excel data
node import-to-all-databases.js ./data/latest.xlsx

# 3. Run validation
node validate-across-databases.js

# 4. View comparison report
node generate-comparison-report.js

# 5. Sync to production (if validation passes)
node sync-to-production.js --source=postgres --target=supabase
```

## Next Steps

1. **Immediate**: Set up local PostgreSQL (5 minutes)
2. **Today**: Create Neon.tech account (free)
3. **This Week**: Build validation scripts
4. **Ongoing**: Refine validation rules based on data quality needs