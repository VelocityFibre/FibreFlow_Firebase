# Neon SOW Import - Quick Reference Guide

## Connection

```bash
# Get connection string from Neon dashboard
psql "postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Or use Neon CLI
neon connection-string
```

## Initial Setup

```bash
# 1. Run the main setup script
psql -f neon-staging-setup.sql

# 2. Run validation procedures
psql -f neon-validation-procedures.sql

# 3. Run migration procedures
psql -f neon-migration-procedures.sql
```

## Common Operations

### Import New Batch

```sql
-- 1. Create import batch record
INSERT INTO import_batches (batch_id, filename, total_rows, created_by)
VALUES ('BATCH-2025-01-30-001', 'sow_data_jan2025.xlsx', 1500, 'user@fibreflow.com');

-- 2. Insert staging data (from Node.js script)
-- See node-import-to-neon.js

-- 3. Validate the batch
SELECT validate_import_batch_complete('BATCH-2025-01-30-001');

-- 4. Check validation results
SELECT * FROM validation_error_summary WHERE import_batch_id = 'BATCH-2025-01-30-001';

-- 5. Pre-migration check
SELECT pre_migration_check('BATCH-2025-01-30-001');
```

### Export for Firestore

```sql
-- Export all valid rows
SELECT * FROM export_batch_for_firestore('BATCH-2025-01-30-001');

-- Export with pagination (100 rows at a time)
SELECT * FROM export_batch_paginated('BATCH-2025-01-30-001', 100, 0);  -- First page
SELECT * FROM export_batch_paginated('BATCH-2025-01-30-001', 100, 100); -- Second page
```

### Mark as Processed

```sql
-- Mark single row
SELECT mark_row_processed(123, 'firestore-doc-id-xyz', 'import@fibreflow.com');

-- Mark multiple rows
SELECT mark_rows_processed(
    ARRAY[123, 124, 125], 
    ARRAY['doc-1', 'doc-2', 'doc-3'],
    'import@fibreflow.com'
);
```

### Monitor Progress

```sql
-- Overall status
SELECT * FROM migration_progress;

-- Processing statistics
SELECT * FROM get_processing_status();

-- Recent activity
SELECT * FROM get_recent_activity(24); -- Last 24 hours

-- Import statistics
SELECT * FROM get_import_stats('BATCH-2025-01-30-001');
```

### Data Quality Checks

```sql
-- Analyze data quality
SELECT analyze_data_quality('BATCH-2025-01-30-001');

-- Find duplicate SOW numbers
SELECT * FROM find_duplicate_sow_numbers('BATCH-2025-01-30-001');

-- Check project references
SELECT * FROM validate_project_references('BATCH-2025-01-30-001');

-- Check contractor references
SELECT * FROM validate_contractor_references('BATCH-2025-01-30-001');
```

### Handle Issues

```sql
-- Resolve duplicates (keep newest)
SELECT * FROM resolve_duplicate_sow_numbers('BATCH-2025-01-30-001', 'keep_newest');

-- Rollback processed rows
SELECT rollback_processed_rows('BATCH-2025-01-30-001', NULL, 'Data issue found', 'admin@fibreflow.com');

-- View failed migrations
SELECT * FROM failed_migrations;
```

### Maintenance

```sql
-- Archive completed batch
SELECT archive_completed_batch('BATCH-2025-01-30-001', 'Monthly archive');

-- Clean up old data
SELECT archive_processed_data(30); -- Archive data older than 30 days
SELECT cleanup_failed_imports(7);   -- Remove failed imports older than 7 days
```

## Quick SQL Snippets

### Check Batch Status
```sql
SELECT batch_id, status, total_rows, valid_rows, processed_rows,
       ROUND(processed_rows::NUMERIC / NULLIF(valid_rows, 0) * 100, 2) as pct_complete
FROM import_batches 
ORDER BY started_at DESC 
LIMIT 10;
```

### View Validation Errors
```sql
SELECT field_name, error_message, COUNT(*) as error_count
FROM validation_error_summary
WHERE import_batch_id = 'BATCH-2025-01-30-001'
GROUP BY field_name, error_message
ORDER BY error_count DESC;
```

### Export Ready Records
```sql
SELECT COUNT(*) as ready_for_export
FROM sow_import_staging
WHERE validation_status = 'valid'
  AND processed_to_firestore = FALSE
  AND import_batch_id = 'BATCH-2025-01-30-001';
```

### Update Validation Rule
```sql
UPDATE validation_rules
SET rule_config = '{"pattern": "^SOW-\\d{4}-\\d{4}$", "message": "SOW number must match SOW-YYYY-XXXX"}'
WHERE field_name = 'sow_number' AND rule_type = 'format';
```

## Troubleshooting

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE '%sow%' OR tablename LIKE '%import%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### View Running Queries
```sql
SELECT pid, age(clock_timestamp(), query_start), usename, query 
FROM pg_stat_activity 
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' 
ORDER BY query_start DESC;
```

### Cancel Long Running Query
```sql
SELECT pg_cancel_backend(pid);
-- or for force kill:
-- SELECT pg_terminate_backend(pid);
```

### Analyze Tables for Performance
```sql
ANALYZE sow_import_staging;
ANALYZE import_batches;
VACUUM ANALYZE sow_import_staging;
```

## Node.js Integration

See the companion Node.js scripts:
- `node-import-to-neon.js` - Import Excel to Neon staging
- `neon-to-firestore.js` - Migrate from Neon to Firestore
- `neon-monitor.js` - Real-time monitoring dashboard

## Best Practices

1. **Always validate before migration** - Run pre_migration_check()
2. **Use transactions** - Wrap operations in BEGIN/COMMIT
3. **Monitor progress** - Check migration_progress view regularly
4. **Archive completed data** - Keep staging table size manageable
5. **Test with small batches first** - Verify process before large imports
6. **Keep audit trail** - All operations are logged automatically
7. **Handle duplicates early** - Resolve before migration
8. **Verify Firestore imports** - Mark as processed only after confirmation