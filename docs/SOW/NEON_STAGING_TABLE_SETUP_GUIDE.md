# Neon Staging Table Setup Guide

## Overview

This guide provides comprehensive instructions for setting up the staging table in Neon for the SOW (Statement of Work) data import system. The staging table serves as an intermediate layer between Excel uploads and the production Firestore database, enabling data validation, transformation, and auditing.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Database Schema](#database-schema)
4. [Setup Instructions](#setup-instructions)
5. [Data Validation Scripts](#data-validation-scripts)
6. [Migration Workflows](#migration-workflows)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

```
Excel Upload → Neon Staging Table → Validation → Firestore Production
                     ↓
                Audit Trail
```

### Benefits of Staging Table Approach

1. **Data Validation**: Validate data quality before production import
2. **Rollback Capability**: Easy to undo problematic imports
3. **Audit Trail**: Complete history of all imports and changes
4. **Performance**: Bulk operations are faster in PostgreSQL
5. **Data Transformation**: Complex transformations before Firestore import

## Prerequisites

- Neon account with project created
- PostgreSQL client (psql, pgAdmin, or Neon Console)
- Node.js environment for running import scripts
- Access to FibreFlow Firestore project

## Database Schema

### Main Staging Table: `sow_import_staging`

This table stores the raw SOW data from Excel imports with additional metadata for tracking and validation.

```sql
-- Main staging table for SOW data imports
CREATE TABLE IF NOT EXISTS sow_import_staging (
    -- Primary identifier
    id SERIAL PRIMARY KEY,
    
    -- Import tracking
    import_batch_id VARCHAR(50) NOT NULL,
    import_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Excel row data (all columns from SOW)
    sow_number VARCHAR(50),
    description TEXT,
    qty DECIMAL(10,2),
    unit VARCHAR(20),
    rate DECIMAL(10,2),
    total DECIMAL(10,2),
    
    -- Material fields
    brand VARCHAR(100),
    item_description TEXT,
    item_code VARCHAR(50),
    
    -- Location and project info
    location VARCHAR(200),
    project_code VARCHAR(50),
    project_name VARCHAR(200),
    
    -- Contractor info
    contractor_name VARCHAR(200),
    contractor_code VARCHAR(50),
    
    -- Additional fields from Excel
    category VARCHAR(100),
    subcategory VARCHAR(100),
    status VARCHAR(50),
    
    -- Validation and processing
    validation_status VARCHAR(20) DEFAULT 'pending',
    validation_errors JSONB,
    processed_to_firestore BOOLEAN DEFAULT FALSE,
    firestore_doc_id VARCHAR(100),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Indexes for performance
    INDEX idx_import_batch_id (import_batch_id),
    INDEX idx_sow_number (sow_number),
    INDEX idx_validation_status (validation_status),
    INDEX idx_processed (processed_to_firestore)
);
```

### Import Batch Tracking Table

```sql
-- Track import batches
CREATE TABLE IF NOT EXISTS import_batches (
    batch_id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    error_summary JSONB,
    
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);
```

### Validation Rules Table

```sql
-- Store validation rules for dynamic validation
CREATE TABLE IF NOT EXISTS validation_rules (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(field_name, rule_type)
);
```

## Setup Instructions

### 1. Connect to Neon Database

```bash
# Using connection string from Neon dashboard
psql "postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

### 2. Create Database Schema

Run the following SQL script to create all necessary tables:

```sql
-- Run the complete schema creation script
-- This creates all tables with proper indexes and constraints

BEGIN;

-- Create main staging table
CREATE TABLE IF NOT EXISTS sow_import_staging (
    id SERIAL PRIMARY KEY,
    import_batch_id VARCHAR(50) NOT NULL,
    import_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Excel columns
    sow_number VARCHAR(50),
    description TEXT,
    qty DECIMAL(10,2),
    unit VARCHAR(20),
    rate DECIMAL(10,2),
    total DECIMAL(10,2),
    brand VARCHAR(100),
    item_description TEXT,
    item_code VARCHAR(50),
    location VARCHAR(200),
    project_code VARCHAR(50),
    project_name VARCHAR(200),
    contractor_name VARCHAR(200),
    contractor_code VARCHAR(50),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    status VARCHAR(50),
    
    -- Metadata
    validation_status VARCHAR(20) DEFAULT 'pending',
    validation_errors JSONB,
    processed_to_firestore BOOLEAN DEFAULT FALSE,
    firestore_doc_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_import_batch_id ON sow_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_sow_number ON sow_import_staging(sow_number);
CREATE INDEX IF NOT EXISTS idx_validation_status ON sow_import_staging(validation_status);
CREATE INDEX IF NOT EXISTS idx_processed ON sow_import_staging(processed_to_firestore);

-- Create import batches table
CREATE TABLE IF NOT EXISTS import_batches (
    batch_id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    error_summary JSONB
);

-- Create validation rules table
CREATE TABLE IF NOT EXISTS validation_rules (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(field_name, rule_type)
);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sow_staging_updated_at BEFORE UPDATE
    ON sow_import_staging FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

### 3. Insert Default Validation Rules

```sql
-- Insert default validation rules
INSERT INTO validation_rules (field_name, rule_type, rule_config) VALUES
('sow_number', 'required', '{"message": "SOW number is required"}'),
('sow_number', 'format', '{"pattern": "^SOW-\\d{4}-\\d{3}$", "message": "SOW number must match format SOW-YYYY-XXX"}'),
('qty', 'numeric', '{"min": 0, "message": "Quantity must be positive"}'),
('rate', 'numeric', '{"min": 0, "message": "Rate must be positive"}'),
('total', 'calculated', '{"formula": "qty * rate", "tolerance": 0.01}'),
('project_code', 'required', '{"message": "Project code is required"}'),
('contractor_code', 'required', '{"message": "Contractor code is required"}')
ON CONFLICT (field_name, rule_type) DO UPDATE SET rule_config = EXCLUDED.rule_config;
```

## Data Validation Scripts

### 1. Validation Stored Procedures

```sql
-- Validate a single row
CREATE OR REPLACE FUNCTION validate_sow_row(row_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    validation_errors JSONB = '[]'::JSONB;
    row_data RECORD;
    rule RECORD;
    error_msg TEXT;
BEGIN
    -- Get row data
    SELECT * INTO row_data FROM sow_import_staging WHERE id = row_id;
    
    -- Check each validation rule
    FOR rule IN SELECT * FROM validation_rules WHERE is_active = TRUE LOOP
        -- Required field validation
        IF rule.rule_type = 'required' THEN
            EXECUTE format('SELECT $1.%I IS NULL OR $1.%I = ''''', rule.field_name, rule.field_name)
            USING row_data
            INTO error_msg;
            
            IF error_msg::BOOLEAN THEN
                validation_errors = validation_errors || 
                    jsonb_build_object('field', rule.field_name, 'error', rule.rule_config->>'message');
            END IF;
        END IF;
        
        -- Add more validation types as needed
    END LOOP;
    
    -- Update row with validation results
    UPDATE sow_import_staging 
    SET validation_errors = validation_errors,
        validation_status = CASE 
            WHEN jsonb_array_length(validation_errors) = 0 THEN 'valid'
            ELSE 'invalid'
        END
    WHERE id = row_id;
    
    RETURN validation_errors;
END;
$$ LANGUAGE plpgsql;

-- Validate entire batch
CREATE OR REPLACE FUNCTION validate_import_batch(batch_id VARCHAR)
RETURNS TABLE(total_rows INTEGER, valid_rows INTEGER, invalid_rows INTEGER) AS $$
DECLARE
    row_record RECORD;
BEGIN
    -- Validate each row in the batch
    FOR row_record IN 
        SELECT id FROM sow_import_staging WHERE import_batch_id = batch_id
    LOOP
        PERFORM validate_sow_row(row_record.id);
    END LOOP;
    
    -- Return summary
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_rows,
        COUNT(*) FILTER (WHERE validation_status = 'valid')::INTEGER as valid_rows,
        COUNT(*) FILTER (WHERE validation_status = 'invalid')::INTEGER as invalid_rows
    FROM sow_import_staging
    WHERE import_batch_id = batch_id;
END;
$$ LANGUAGE plpgsql;
```

### 2. Data Quality Checks

```sql
-- Check for duplicates
CREATE OR REPLACE VIEW duplicate_sow_entries AS
SELECT 
    sow_number,
    COUNT(*) as duplicate_count,
    array_agg(id) as row_ids,
    array_agg(import_batch_id) as batch_ids
FROM sow_import_staging
WHERE validation_status = 'valid'
GROUP BY sow_number
HAVING COUNT(*) > 1;

-- Check for missing references
CREATE OR REPLACE VIEW missing_project_references AS
SELECT DISTINCT
    project_code,
    COUNT(*) as usage_count
FROM sow_import_staging
WHERE validation_status = 'valid'
    AND project_code NOT IN (
        SELECT DISTINCT project_code 
        FROM project_master -- Assuming this table exists
    )
GROUP BY project_code;

-- Data completeness report
CREATE OR REPLACE VIEW data_completeness_report AS
SELECT 
    import_batch_id,
    COUNT(*) as total_rows,
    COUNT(sow_number) as rows_with_sow,
    COUNT(project_code) as rows_with_project,
    COUNT(contractor_code) as rows_with_contractor,
    COUNT(qty) as rows_with_qty,
    COUNT(rate) as rows_with_rate,
    ROUND(COUNT(sow_number)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as sow_completeness_pct,
    ROUND(COUNT(project_code)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as project_completeness_pct
FROM sow_import_staging
GROUP BY import_batch_id;
```

## Migration Workflows

### 1. Pre-Migration Validation

```sql
-- Pre-migration validation query
WITH validation_summary AS (
    SELECT 
        import_batch_id,
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE validation_status = 'valid') as valid_rows,
        COUNT(*) FILTER (WHERE validation_status = 'invalid') as invalid_rows,
        COUNT(*) FILTER (WHERE processed_to_firestore = TRUE) as already_processed
    FROM sow_import_staging
    WHERE import_batch_id = $1
    GROUP BY import_batch_id
)
SELECT 
    *,
    CASE 
        WHEN already_processed > 0 THEN 'WARNING: Some rows already processed'
        WHEN invalid_rows > 0 THEN 'ERROR: Invalid rows found'
        WHEN valid_rows = 0 THEN 'ERROR: No valid rows to process'
        ELSE 'OK: Ready for migration'
    END as status
FROM validation_summary;
```

### 2. Export for Firestore Import

```sql
-- Export valid rows as JSON for Firestore import
CREATE OR REPLACE FUNCTION export_for_firestore(batch_id VARCHAR)
RETURNS TABLE(firestore_data JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jsonb_build_object(
            'sowNumber', sow_number,
            'description', description,
            'quantity', qty,
            'unit', unit,
            'rate', rate,
            'total', total,
            'brand', brand,
            'itemDescription', item_description,
            'itemCode', item_code,
            'location', location,
            'projectCode', project_code,
            'projectName', project_name,
            'contractorName', contractor_name,
            'contractorCode', contractor_code,
            'category', category,
            'subcategory', subcategory,
            'status', status,
            'importBatchId', import_batch_id,
            'importedAt', import_timestamp,
            'neonStagingId', id
        ) as firestore_data
    FROM sow_import_staging
    WHERE import_batch_id = batch_id
        AND validation_status = 'valid'
        AND processed_to_firestore = FALSE;
END;
$$ LANGUAGE plpgsql;
```

### 3. Mark as Processed

```sql
-- Mark rows as processed after successful Firestore import
CREATE OR REPLACE FUNCTION mark_as_processed(
    staging_ids INTEGER[], 
    firestore_ids TEXT[]
) RETURNS VOID AS $$
BEGIN
    -- Update staging records with Firestore document IDs
    FOR i IN 1..array_length(staging_ids, 1) LOOP
        UPDATE sow_import_staging
        SET 
            processed_to_firestore = TRUE,
            firestore_doc_id = firestore_ids[i],
            updated_at = CURRENT_TIMESTAMP
        WHERE id = staging_ids[i];
    END LOOP;
    
    -- Update batch status if all rows processed
    UPDATE import_batches b
    SET 
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        processed_rows = (
            SELECT COUNT(*) 
            FROM sow_import_staging s
            WHERE s.import_batch_id = b.batch_id
                AND s.processed_to_firestore = TRUE
        )
    WHERE batch_id IN (
        SELECT DISTINCT import_batch_id 
        FROM sow_import_staging 
        WHERE id = ANY(staging_ids)
    )
    AND NOT EXISTS (
        SELECT 1 
        FROM sow_import_staging s
        WHERE s.import_batch_id = b.batch_id
            AND s.validation_status = 'valid'
            AND s.processed_to_firestore = FALSE
    );
END;
$$ LANGUAGE plpgsql;
```

## Monitoring and Maintenance

### 1. Import Status Dashboard Queries

```sql
-- Overall import status
CREATE OR REPLACE VIEW import_status_dashboard AS
SELECT 
    b.batch_id,
    b.filename,
    b.status as batch_status,
    b.total_rows,
    b.valid_rows,
    b.invalid_rows,
    b.processed_rows,
    ROUND(b.processed_rows::NUMERIC / NULLIF(b.valid_rows, 0)::NUMERIC * 100, 2) as processing_pct,
    b.started_at,
    b.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(b.completed_at, CURRENT_TIMESTAMP) - b.started_at)) as duration_seconds,
    b.created_by
FROM import_batches b
ORDER BY b.started_at DESC;

-- Recent validation errors
CREATE OR REPLACE VIEW recent_validation_errors AS
SELECT 
    s.import_batch_id,
    s.sow_number,
    jsonb_array_elements(s.validation_errors) as error,
    s.created_at
FROM sow_import_staging s
WHERE s.validation_status = 'invalid'
    AND s.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY s.created_at DESC
LIMIT 100;
```

### 2. Cleanup Scripts

```sql
-- Archive old processed data
CREATE OR REPLACE FUNCTION archive_processed_data(days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE(archived_count INTEGER) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
    
    -- Create archive table if not exists
    CREATE TABLE IF NOT EXISTS sow_import_staging_archive (LIKE sow_import_staging INCLUDING ALL);
    
    -- Move processed records to archive
    WITH moved AS (
        DELETE FROM sow_import_staging
        WHERE processed_to_firestore = TRUE
            AND created_at < cutoff_date
        RETURNING *
    )
    INSERT INTO sow_import_staging_archive
    SELECT * FROM moved;
    
    -- Return count
    RETURN QUERY
    SELECT COUNT(*)::INTEGER FROM moved;
END;
$$ LANGUAGE plpgsql;

-- Clean up failed imports
CREATE OR REPLACE FUNCTION cleanup_failed_imports(days_old INTEGER DEFAULT 7)
RETURNS VOID AS $$
BEGIN
    -- Delete old failed import records
    DELETE FROM sow_import_staging
    WHERE validation_status = 'invalid'
        AND created_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL
        AND import_batch_id IN (
            SELECT batch_id 
            FROM import_batches 
            WHERE status IN ('failed', 'cancelled')
        );
        
    -- Delete orphaned batch records
    DELETE FROM import_batches
    WHERE status IN ('failed', 'cancelled')
        AND started_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Import Performance Issues

```sql
-- Analyze table statistics
ANALYZE sow_import_staging;

-- Check for missing indexes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'sow_import_staging'
ORDER BY n_distinct DESC;

-- Monitor long-running queries
SELECT 
    pid,
    age(clock_timestamp(), query_start) as duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
    AND query_start < clock_timestamp() - interval '1 minute'
ORDER BY duration DESC;
```

#### 2. Data Integrity Issues

```sql
-- Find orphaned records
SELECT s.*
FROM sow_import_staging s
LEFT JOIN import_batches b ON s.import_batch_id = b.batch_id
WHERE b.batch_id IS NULL;

-- Check for data type mismatches
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'sow_import_staging'
ORDER BY ordinal_position;
```

#### 3. Recovery Procedures

```sql
-- Rollback a batch import
CREATE OR REPLACE FUNCTION rollback_import_batch(batch_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    -- Mark batch as rolled back
    UPDATE import_batches
    SET status = 'rolled_back',
        completed_at = CURRENT_TIMESTAMP
    WHERE batch_id = batch_id;
    
    -- Delete staging records
    DELETE FROM sow_import_staging
    WHERE import_batch_id = batch_id;
    
    -- Note: Firestore rollback must be handled separately
END;
$$ LANGUAGE plpgsql;
```

## Security Considerations

1. **Connection Security**: Always use SSL connections to Neon
2. **Access Control**: Limit database user permissions to minimum required
3. **Data Encryption**: Sensitive data should be encrypted at rest
4. **Audit Logging**: All data modifications are tracked with timestamps and user info
5. **Input Validation**: All data is validated before processing

## Next Steps

1. Set up automated import scripts in Node.js
2. Configure Firestore import workers
3. Create monitoring dashboard in FibreFlow
4. Set up regular maintenance jobs
5. Implement real-time sync capabilities

## References

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [FibreFlow SOW Import Strategy](./SOW_DATA_IMPORT_STRATEGY.md)