# Excel Import Process Implementation Details

*Last Updated: 2025-01-30*

## SQLite Import Process (OneMap/SQL)

### Directory Structure
```
OneMap/SQL/
├── scripts/
│   ├── src/
│   │   ├── excel-importer.js      # Core import logic
│   │   ├── database.js            # SQLite connection
│   │   └── utils.js               # Helper functions
│   ├── import-excel.js            # Basic import
│   └── import-with-tracking.js    # Import with status tracking
├── data/
│   └── onemap.db                  # SQLite database
└── docs/
    └── EXCEL_SQL_STRATEGY.md      # Implementation strategy
```

### Import Script Details

#### 1. Excel Reading (`excel-importer.js`)
```javascript
// Column mapping strategy - handles variations
const COLUMN_MAPPINGS = {
  // Property identification
  'property id': 'property_id',
  'propertyid': 'property_id',
  'property_id': 'property_id',
  
  // Agent fields - first non-empty wins
  'field agent name (pole permission)': 'agent',
  'installer name': 'agent',
  'agent': 'agent',
  
  // Status fields
  'status': 'status',
  'job status': 'status',
  
  // Location fields
  'pole number': 'pole_number',
  'drop number': 'drop_number',
  'address': 'address'
};

// Process in batches for performance
async processData(data) {
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await this.processBatch(batch);
  }
}
```

#### 2. Duplicate Detection
```sql
-- Check for existing record before insert
SELECT COUNT(*) FROM status_changes 
WHERE property_id = ? 
  AND pole_number = ? 
  AND drop_number = ? 
  AND status = ? 
  AND status_date = ?
```

#### 3. Pole Capacity Tracking
```sql
-- Update pole capacity after each insert
INSERT OR REPLACE INTO pole_capacity (pole_number, drop_count)
SELECT pole_number, COUNT(DISTINCT drop_number)
FROM status_changes
WHERE pole_number = ?
GROUP BY pole_number
```

### SQLite Schema
```sql
-- Main data table
CREATE TABLE status_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT,
  pole_number TEXT,
  drop_number TEXT,
  status TEXT,
  status_date TEXT,
  agent TEXT,
  address TEXT,
  -- ... other fields
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  import_batch_id INTEGER
);

-- Tracking tables
CREATE TABLE pole_capacity (
  pole_number TEXT PRIMARY KEY,
  drop_count INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  total_rows INTEGER,
  imported_rows INTEGER,
  duplicate_rows INTEGER,
  failed_rows INTEGER,
  started_at DATETIME,
  completed_at DATETIME,
  status TEXT
);
```

## PostgreSQL Import Process (postgresql_staging)

### Directory Structure
```
postgresql_staging/
├── scripts/
│   ├── import-lawley-robust.js    # Production import
│   ├── generate-import-report.js  # Report generation
│   ├── check-duplicates.js        # Data validation
│   └── postgres-to-supabase-sync.sh  # Cloud sync
├── config/
│   ├── column-mapping.json        # Excel→DB mapping
│   ├── database.json              # Connection config
│   └── lawley-schema.sql          # Database schema
└── reports/
    └── import-report-*.html       # Generated reports
```

### Import Script Details

#### 1. Robust Import (`import-lawley-robust.js`)
```javascript
// Row-by-row processing with error recovery
async processRow(row, rowIndex) {
  const client = await this.pool.connect();
  try {
    // Build dynamic query based on non-null fields
    const fields = [];
    const values = [];
    const updates = [];
    
    // Type-specific processing
    if (row['Property ID']) {
      fields.push('property_id');
      values.push(parseInt(row['Property ID']) || null);
    }
    
    // Handle combined lat/long field
    if (row['Drop GPS']) {
      const [lat, long] = this.parseLatLong(row['Drop GPS']);
      fields.push('drop_gps_lat', 'drop_gps_long');
      values.push(lat, long);
    }
    
    // Calculate data quality score
    const qualityScore = this.calculateDataQuality(row);
    fields.push('data_quality_score');
    values.push(qualityScore);
    
    // UPSERT operation
    const query = `
      INSERT INTO onemap_lawley_raw (${fields.join(', ')})
      VALUES (${fields.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (file_name, property_id)
      DO UPDATE SET ${updates.join(', ')}, updated_at = NOW()
    `;
    
    await client.query(query, values);
    this.stats.successCount++;
    
  } catch (error) {
    this.handleRowError(error, rowIndex, row);
  } finally {
    client.release();
  }
}

// Data quality scoring
calculateDataQuality(row) {
  const weights = {
    'property_id': 0.2,
    'status': 0.2,
    'pole_number': 0.15,
    'drop_number': 0.15,
    'address': 0.1,
    'gps_coordinates': 0.2
  };
  
  let score = 0;
  for (const [field, weight] of Object.entries(weights)) {
    if (row[field] && row[field].toString().trim()) {
      score += weight;
    }
  }
  return score;
}
```

#### 2. Error Tracking
```javascript
// Detailed error capture
handleRowError(error, rowIndex, row) {
  this.stats.errorCount++;
  
  if (this.stats.errors.length < 5) {
    this.stats.errors.push({
      row: rowIndex + 2, // Excel row number
      error: error.message,
      data: {
        property_id: row['Property ID'],
        status: row['Status'],
        pole_number: row['Pole Number']
      }
    });
  }
  
  // Log to database
  this.logErrorToDatabase(error, rowIndex, row);
}
```

### PostgreSQL Schema
```sql
-- Main import table with strict types
CREATE TABLE onemap_lawley_raw (
  id SERIAL PRIMARY KEY,
  property_id INTEGER,
  phase TEXT,
  feeder TEXT,
  status TEXT,
  status_date DATE,
  pole_number TEXT,
  drop_number TEXT,
  address TEXT,
  -- GPS fields
  drop_gps_lat DECIMAL(10, 8),
  drop_gps_long DECIMAL(11, 8),
  -- Metadata
  data_quality_score DECIMAL(3, 2),
  file_name TEXT NOT NULL,
  import_batch_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Constraints
  CONSTRAINT unique_file_property 
    UNIQUE (file_name, property_id)
);

-- Import tracking
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT,
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pole_number ON onemap_lawley_raw(pole_number);
CREATE INDEX idx_status ON onemap_lawley_raw(status);
CREATE INDEX idx_import_batch ON onemap_lawley_raw(import_batch_id);
```

## Sync to Supabase

### PostgreSQL → Supabase (Direct)
```bash
#!/bin/bash
# postgres-to-supabase-sync.sh

# One-command full sync
sync_full() {
  echo "Starting full sync to Supabase..."
  
  # Dump local PostgreSQL
  pg_dump \
    --no-owner \
    --no-privileges \
    --exclude-table-data='import_batches' \
    $LOCAL_DB_URL | \
  
  # Pipe directly to Supabase
  psql $SUPABASE_DB_URL
  
  echo "Sync completed!"
}

# Incremental sync (recent changes only)
sync_incremental() {
  local since_date=$1
  
  pg_dump \
    --no-owner \
    --data-only \
    --table="onemap_lawley_raw" \
    --where="updated_at > '$since_date'" \
    $LOCAL_DB_URL | \
  psql $SUPABASE_DB_URL
}
```

### SQLite → Supabase (Conversion Required)
```python
# convert_sqlite_to_postgres.py
import sqlite3
import re

def convert_sqlite_to_postgres(sqlite_file, output_file):
    """Convert SQLite dump to PostgreSQL format"""
    
    conversions = {
        # Data type conversions
        'INTEGER': 'INTEGER',
        'TEXT': 'TEXT',
        'REAL': 'DECIMAL',
        'DATETIME': 'TIMESTAMP',
        
        # SQLite specific
        'AUTOINCREMENT': 'SERIAL',
        'datetime(\'now\')': 'NOW()',
        'date(\'now\')': 'CURRENT_DATE'
    }
    
    with open(sqlite_file, 'r') as f:
        sql = f.read()
    
    # Apply conversions
    for sqlite_term, pg_term in conversions.items():
        sql = sql.replace(sqlite_term, pg_term)
    
    # Handle boolean conversions
    sql = re.sub(r'\b0\b', 'FALSE', sql)
    sql = re.sub(r'\b1\b', 'TRUE', sql)
    
    # Remove SQLite-specific commands
    sql = re.sub(r'BEGIN TRANSACTION;', 'BEGIN;', sql)
    sql = re.sub(r'PRAGMA.*?;', '', sql)
    
    with open(output_file, 'w') as f:
        f.write(sql)
```

## Performance Optimization

### SQLite Optimizations
```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Increase cache size
PRAGMA cache_size = -64000;  -- 64MB

-- Optimize queries during import
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
```

### PostgreSQL Optimizations
```sql
-- Bulk import settings
SET synchronous_commit = OFF;
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';

-- Disable constraints during import
ALTER TABLE onemap_lawley_raw DISABLE TRIGGER ALL;
-- ... perform import ...
ALTER TABLE onemap_lawley_raw ENABLE TRIGGER ALL;

-- Update statistics after import
ANALYZE onemap_lawley_raw;
```