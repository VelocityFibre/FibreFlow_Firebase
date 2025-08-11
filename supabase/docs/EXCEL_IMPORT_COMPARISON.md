# Excel Import Process Comparison: SQLite vs PostgreSQL

*Last Updated: 2025-01-30*

## Overview

FibreFlow supports two distinct pathways for importing Excel data into Supabase. This document compares both approaches and provides recommendations for different use cases.

## Import Pathways

### 1. Current Process: Excel → SQLite → Supabase
```
Excel Files → SQLite (OneMap/SQL) → Manual Export → Data Conversion → Supabase
```

### 2. Alternative Process: Excel → PostgreSQL → Supabase
```
Excel Files → PostgreSQL (staging) → Direct pg_dump/psql → Supabase
```

## Detailed Comparison

### Data Type Handling

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Type System | Dynamic typing | Strict typing |
| Date Handling | String-based, flexible parsing | Native timestamp types |
| Boolean Values | 0/1 integers | True native boolean |
| Arrays/JSON | Text storage | Native JSONB support |
| NULL Handling | Flexible | Strict NULL semantics |

### Import Performance

| Metric | SQLite | PostgreSQL |
|--------|--------|------------|
| Import Speed | ~10,000 rows/second (batch) | ~500 rows/second (row-by-row) |
| Error Recovery | Transaction rollback | Row-level continuation |
| Memory Usage | Loads full file | Streaming processing |
| Concurrent Access | Single writer | Multiple connections |
| Progress Tracking | Basic | Detailed with resume capability |

### Error Handling

#### SQLite Implementation
```javascript
// Transaction-based approach
try {
  await db.beginTransaction();
  // Process entire batch
  await db.commit();
} catch (error) {
  await db.rollback();
  // Limited error details
}
```

#### PostgreSQL Implementation
```javascript
// Row-by-row with detailed tracking
for (const row of data) {
  try {
    await processRow(row);
  } catch (error) {
    errorLog.push({ row: rowNum, error: error.message });
    continue; // Process next row
  }
}
```

### Supabase Synchronization

#### SQLite → Supabase Challenges
1. **Data Type Conversion Required**
   - Dates: String → Timestamp
   - Booleans: 0/1 → true/false
   - Arrays: JSON string → JSONB
   
2. **Schema Translation**
   - Manual mapping of column types
   - Constraint definitions differ
   - Index structures incompatible

3. **Multi-Step Process**
   ```bash
   # 1. Export from SQLite
   sqlite3 onemap.db ".dump" > export.sql
   
   # 2. Convert SQL dialect
   python convert_sqlite_to_postgres.py export.sql
   
   # 3. Import to Supabase
   psql $SUPABASE_URL < converted.sql
   ```

#### PostgreSQL → Supabase Benefits
1. **Direct Compatibility**
   - Same SQL dialect
   - Identical data types
   - Native constraint support
   
2. **One-Command Sync**
   ```bash
   # Direct database-to-database transfer
   ./postgres-to-supabase-sync.sh push
   ```

3. **Native Features Preserved**
   - UPSERT operations
   - JSONB arrays for history
   - Check constraints
   - Foreign key relationships

## Feature Comparison

### SQLite Strengths
- ✅ Simpler local setup
- ✅ Faster initial import
- ✅ Flexible schema evolution
- ✅ Lower resource requirements
- ✅ Good for prototyping

### PostgreSQL Strengths
- ✅ Production-ready from start
- ✅ Zero data loss to Supabase
- ✅ Better error tracking
- ✅ Concurrent access support
- ✅ Native cloud compatibility

## Use Case Recommendations

### Use SQLite When:
1. **Local Analytics Only**
   - No need for cloud sync
   - Single-user access
   - Quick data exploration
   
2. **Rapid Prototyping**
   - Schema still evolving
   - Data quality uncertain
   - Testing import logic

3. **Resource Constraints**
   - Limited memory/CPU
   - No PostgreSQL available
   - Simplicity preferred

### Use PostgreSQL When:
1. **Production Data Pipeline**
   - Regular Supabase sync needed
   - Multiple users/systems
   - Data integrity critical
   
2. **Large Datasets**
   - 100k+ records
   - Concurrent processing
   - Resume capability needed

3. **Complex Data Types**
   - JSON/JSONB storage
   - Array columns
   - Custom types

## Migration Path

### From SQLite to PostgreSQL
```bash
# 1. Export SQLite data
sqlite3 onemap.db ".dump" > sqlite_export.sql

# 2. Convert using provided script
python scripts/convert_sqlite_to_postgres.py \
  sqlite_export.sql \
  postgres_import.sql

# 3. Import to PostgreSQL
psql local_postgres < postgres_import.sql

# 4. Sync to Supabase
./postgres-to-supabase-sync.sh push
```

## Performance Benchmarks

### Import Performance (50,000 rows)
- **SQLite**: ~5 seconds (batch mode)
- **PostgreSQL**: ~100 seconds (with error handling)

### Sync to Supabase
- **SQLite → Supabase**: ~10 minutes (with conversion)
- **PostgreSQL → Supabase**: ~2 minutes (direct sync)

### Total End-to-End
- **SQLite Route**: ~11 minutes
- **PostgreSQL Route**: ~4 minutes

## Conclusion

While SQLite offers simplicity and speed for local analytics, the **PostgreSQL → Supabase** route provides superior production capabilities:

1. **Zero Data Loss**: Native type compatibility
2. **Operational Simplicity**: One-command deployment
3. **Better Observability**: Detailed error tracking
4. **Future-Proof**: Scales with growing needs
5. **Cloud-Native**: Designed for distributed systems

For any production use case involving Supabase, PostgreSQL staging is the recommended approach.