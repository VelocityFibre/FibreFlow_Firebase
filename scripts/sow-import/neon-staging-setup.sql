-- Neon Staging Table Setup Script
-- Run this script on your Neon database to set up the SOW import staging infrastructure
-- Version: 1.0
-- Last Updated: 2025-01-30

-- Start transaction
BEGIN;

-- Create schema if needed (optional - uncomment if you want a separate schema)
-- CREATE SCHEMA IF NOT EXISTS sow_import;
-- SET search_path TO sow_import, public;

-- Drop existing tables if doing a fresh setup (uncomment if needed)
-- DROP TABLE IF EXISTS sow_import_staging CASCADE;
-- DROP TABLE IF EXISTS import_batches CASCADE;
-- DROP TABLE IF EXISTS validation_rules CASCADE;

-- ============================================================================
-- MAIN STAGING TABLE
-- ============================================================================

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
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
    validation_errors JSONB DEFAULT '[]'::JSONB,
    processed_to_firestore BOOLEAN DEFAULT FALSE,
    firestore_doc_id VARCHAR(100),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Row versioning for optimistic locking
    row_version INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sow_staging_batch_id ON sow_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_sow_staging_sow_number ON sow_import_staging(sow_number);
CREATE INDEX IF NOT EXISTS idx_sow_staging_validation_status ON sow_import_staging(validation_status);
CREATE INDEX IF NOT EXISTS idx_sow_staging_processed ON sow_import_staging(processed_to_firestore);
CREATE INDEX IF NOT EXISTS idx_sow_staging_project_code ON sow_import_staging(project_code);
CREATE INDEX IF NOT EXISTS idx_sow_staging_contractor_code ON sow_import_staging(contractor_code);
CREATE INDEX IF NOT EXISTS idx_sow_staging_created_at ON sow_import_staging(created_at);

-- ============================================================================
-- IMPORT BATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_batches (
    batch_id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    file_hash VARCHAR(64), -- SHA256 hash for duplicate detection
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'validating', 'processing', 'completed', 'failed', 'cancelled', 'rolled_back')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    error_summary JSONB,
    metadata JSONB, -- Additional metadata like source system, version, etc.
    
    -- Performance tracking
    validation_duration_ms INTEGER,
    processing_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_started_at ON import_batches(started_at);
CREATE INDEX IF NOT EXISTS idx_batches_created_by ON import_batches(created_by);

-- ============================================================================
-- VALIDATION RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS validation_rules (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('required', 'format', 'numeric', 'calculated', 'reference', 'custom')),
    rule_config JSONB NOT NULL,
    error_severity VARCHAR(10) DEFAULT 'error' CHECK (error_severity IN ('error', 'warning', 'info')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(field_name, rule_type)
);

CREATE INDEX IF NOT EXISTS idx_rules_active ON validation_rules(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ARCHIVE TABLE (for historical data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sow_import_staging_archive (
    LIKE sow_import_staging INCLUDING ALL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archive_reason VARCHAR(100)
);

-- Add archive-specific indexes
CREATE INDEX IF NOT EXISTS idx_archive_archived_at ON sow_import_staging_archive(archived_at);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_audit_log (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_batch_id ON import_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON import_audit_log(performed_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.row_version = OLD.row_version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to main tables
DROP TRIGGER IF EXISTS update_sow_staging_updated_at ON sow_import_staging;
CREATE TRIGGER update_sow_staging_updated_at 
    BEFORE UPDATE ON sow_import_staging 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_validation_rules_updated_at ON validation_rules;
CREATE TRIGGER update_validation_rules_updated_at 
    BEFORE UPDATE ON validation_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VALIDATION FUNCTIONS
-- ============================================================================

-- Validate SOW number format
CREATE OR REPLACE FUNCTION validate_sow_number(sow_num VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Example: SOW-2024-001
    RETURN sow_num ~ '^SOW-\d{4}-\d{3}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate total validation
CREATE OR REPLACE FUNCTION validate_total(qty DECIMAL, rate DECIMAL, total DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow for small rounding differences (0.01)
    RETURN ABS((COALESCE(qty, 0) * COALESCE(rate, 0)) - COALESCE(total, 0)) < 0.01;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Summary view of import batches
CREATE OR REPLACE VIEW import_batch_summary AS
SELECT 
    b.batch_id,
    b.filename,
    b.status,
    b.total_rows,
    b.valid_rows,
    b.invalid_rows,
    b.processed_rows,
    CASE 
        WHEN b.valid_rows > 0 THEN ROUND((b.processed_rows::NUMERIC / b.valid_rows) * 100, 2)
        ELSE 0
    END as processing_percentage,
    b.started_at,
    b.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(b.completed_at, CURRENT_TIMESTAMP) - b.started_at))::INTEGER as duration_seconds,
    b.created_by,
    COUNT(DISTINCT s.project_code) as unique_projects,
    COUNT(DISTINCT s.contractor_code) as unique_contractors
FROM import_batches b
LEFT JOIN sow_import_staging s ON b.batch_id = s.import_batch_id
GROUP BY b.batch_id, b.filename, b.status, b.total_rows, b.valid_rows, 
         b.invalid_rows, b.processed_rows, b.started_at, b.completed_at, b.created_by;

-- Validation error summary
CREATE OR REPLACE VIEW validation_error_summary AS
SELECT 
    import_batch_id,
    jsonb_array_elements(validation_errors)->>'field' as field_name,
    jsonb_array_elements(validation_errors)->>'error' as error_message,
    COUNT(*) as error_count
FROM sow_import_staging
WHERE validation_status = 'invalid'
GROUP BY import_batch_id, field_name, error_message
ORDER BY error_count DESC;

-- Data quality metrics
CREATE OR REPLACE VIEW data_quality_metrics AS
SELECT 
    import_batch_id,
    COUNT(*) as total_rows,
    COUNT(sow_number) as rows_with_sow_number,
    COUNT(project_code) as rows_with_project,
    COUNT(contractor_code) as rows_with_contractor,
    COUNT(CASE WHEN qty IS NOT NULL AND rate IS NOT NULL THEN 1 END) as rows_with_pricing,
    ROUND(COUNT(sow_number)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as sow_completeness_pct,
    ROUND(COUNT(project_code)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as project_completeness_pct,
    ROUND(COUNT(contractor_code)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as contractor_completeness_pct
FROM sow_import_staging
GROUP BY import_batch_id;

-- ============================================================================
-- DEFAULT VALIDATION RULES
-- ============================================================================

INSERT INTO validation_rules (field_name, rule_type, rule_config, error_severity) VALUES
-- Required fields
('sow_number', 'required', '{"message": "SOW number is required"}', 'error'),
('project_code', 'required', '{"message": "Project code is required"}', 'error'),
('contractor_code', 'required', '{"message": "Contractor code is required"}', 'error'),
('description', 'required', '{"message": "Description is required"}', 'error'),

-- Format validation
('sow_number', 'format', '{"pattern": "^SOW-\\d{4}-\\d{3}$", "message": "SOW number must match format SOW-YYYY-XXX"}', 'error'),

-- Numeric validation
('qty', 'numeric', '{"min": 0, "max": 999999, "message": "Quantity must be between 0 and 999999"}', 'error'),
('rate', 'numeric', '{"min": 0, "max": 999999, "message": "Rate must be between 0 and 999999"}', 'error'),

-- Calculated field validation
('total', 'calculated', '{"formula": "qty * rate", "tolerance": 0.01, "message": "Total must equal qty * rate"}', 'warning'),

-- Length validation
('description', 'custom', '{"maxLength": 1000, "message": "Description cannot exceed 1000 characters"}', 'warning'),
('item_code', 'custom', '{"maxLength": 50, "message": "Item code cannot exceed 50 characters"}', 'warning')

ON CONFLICT (field_name, rule_type) DO UPDATE 
SET rule_config = EXCLUDED.rule_config,
    error_severity = EXCLUDED.error_severity,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Get import statistics
CREATE OR REPLACE FUNCTION get_import_stats(p_batch_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
    metric_name VARCHAR,
    metric_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT import_batch_id) as total_batches,
            COUNT(*) FILTER (WHERE validation_status = 'valid') as valid_records,
            COUNT(*) FILTER (WHERE validation_status = 'invalid') as invalid_records,
            COUNT(*) FILTER (WHERE processed_to_firestore = TRUE) as processed_records,
            COUNT(DISTINCT project_code) as unique_projects,
            COUNT(DISTINCT contractor_code) as unique_contractors,
            COUNT(DISTINCT sow_number) as unique_sow_numbers
        FROM sow_import_staging
        WHERE p_batch_id IS NULL OR import_batch_id = p_batch_id
    )
    SELECT 'Total Records'::VARCHAR, total_records::NUMERIC FROM stats
    UNION ALL SELECT 'Total Batches', total_batches FROM stats
    UNION ALL SELECT 'Valid Records', valid_records FROM stats
    UNION ALL SELECT 'Invalid Records', invalid_records FROM stats
    UNION ALL SELECT 'Processed Records', processed_records FROM stats
    UNION ALL SELECT 'Unique Projects', unique_projects FROM stats
    UNION ALL SELECT 'Unique Contractors', unique_contractors FROM stats
    UNION ALL SELECT 'Unique SOW Numbers', unique_sow_numbers FROM stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSIONS (adjust as needed for your database users)
-- ============================================================================

-- Example: Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE ON sow_import_staging TO fibreflow_app;
-- GRANT SELECT, INSERT, UPDATE ON import_batches TO fibreflow_app;
-- GRANT SELECT ON validation_rules TO fibreflow_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO fibreflow_app;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- POST-SETUP VERIFICATION
-- ============================================================================

-- Verify tables were created
SELECT table_name, 
       pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_name IN ('sow_import_staging', 'import_batches', 'validation_rules', 
                     'sow_import_staging_archive', 'import_audit_log')
ORDER BY table_name;

-- Verify indexes were created
SELECT tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename IN ('sow_import_staging', 'import_batches', 'validation_rules')
ORDER BY tablename, indexname;

-- Verify validation rules were inserted
SELECT field_name, rule_type, error_severity, is_active
FROM validation_rules
ORDER BY field_name, rule_type;