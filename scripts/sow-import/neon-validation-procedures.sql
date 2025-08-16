-- Neon Data Validation Procedures
-- Advanced validation functions for SOW data import
-- Version: 1.0
-- Last Updated: 2025-01-30

-- ============================================================================
-- ROW-LEVEL VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sow_row_complete(p_row_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_row RECORD;
    v_errors JSONB = '[]'::JSONB;
    v_warnings JSONB = '[]'::JSONB;
    v_rule RECORD;
    v_is_valid BOOLEAN;
    v_error_msg TEXT;
    v_field_value TEXT;
BEGIN
    -- Get the row data
    SELECT * INTO v_row FROM sow_import_staging WHERE id = p_row_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Row not found');
    END IF;
    
    -- Process each active validation rule
    FOR v_rule IN 
        SELECT * FROM validation_rules 
        WHERE is_active = TRUE 
        ORDER BY field_name, rule_type
    LOOP
        v_is_valid := TRUE;
        v_error_msg := NULL;
        
        -- Get field value dynamically
        EXECUTE format('SELECT ($1).%I::TEXT', v_rule.field_name) 
        INTO v_field_value 
        USING v_row;
        
        CASE v_rule.rule_type
            WHEN 'required' THEN
                IF v_field_value IS NULL OR v_field_value = '' THEN
                    v_is_valid := FALSE;
                    v_error_msg := v_rule.rule_config->>'message';
                END IF;
                
            WHEN 'format' THEN
                IF v_field_value IS NOT NULL AND v_field_value != '' THEN
                    v_is_valid := v_field_value ~ (v_rule.rule_config->>'pattern');
                    IF NOT v_is_valid THEN
                        v_error_msg := v_rule.rule_config->>'message';
                    END IF;
                END IF;
                
            WHEN 'numeric' THEN
                IF v_field_value IS NOT NULL THEN
                    DECLARE
                        v_num NUMERIC;
                        v_min NUMERIC := (v_rule.rule_config->>'min')::NUMERIC;
                        v_max NUMERIC := (v_rule.rule_config->>'max')::NUMERIC;
                    BEGIN
                        v_num := v_field_value::NUMERIC;
                        IF v_min IS NOT NULL AND v_num < v_min THEN
                            v_is_valid := FALSE;
                            v_error_msg := v_rule.rule_config->>'message';
                        ELSIF v_max IS NOT NULL AND v_num > v_max THEN
                            v_is_valid := FALSE;
                            v_error_msg := v_rule.rule_config->>'message';
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        v_is_valid := FALSE;
                        v_error_msg := 'Invalid numeric value';
                    END;
                END IF;
                
            WHEN 'calculated' THEN
                IF v_rule.field_name = 'total' AND v_row.qty IS NOT NULL AND v_row.rate IS NOT NULL THEN
                    DECLARE
                        v_calculated NUMERIC := v_row.qty * v_row.rate;
                        v_tolerance NUMERIC := COALESCE((v_rule.rule_config->>'tolerance')::NUMERIC, 0.01);
                    BEGIN
                        IF v_row.total IS NOT NULL AND ABS(v_calculated - v_row.total) > v_tolerance THEN
                            v_is_valid := FALSE;
                            v_error_msg := format('%s (expected: %s, got: %s)', 
                                v_rule.rule_config->>'message', v_calculated, v_row.total);
                        END IF;
                    END;
                END IF;
                
            WHEN 'custom' THEN
                -- Handle custom validations
                IF v_rule.rule_config->>'maxLength' IS NOT NULL THEN
                    IF LENGTH(v_field_value) > (v_rule.rule_config->>'maxLength')::INTEGER THEN
                        v_is_valid := FALSE;
                        v_error_msg := v_rule.rule_config->>'message';
                    END IF;
                END IF;
        END CASE;
        
        -- Add to appropriate array based on severity
        IF NOT v_is_valid AND v_error_msg IS NOT NULL THEN
            IF v_rule.error_severity = 'error' THEN
                v_errors := v_errors || jsonb_build_object(
                    'field', v_rule.field_name,
                    'type', v_rule.rule_type,
                    'error', v_error_msg
                );
            ELSE
                v_warnings := v_warnings || jsonb_build_object(
                    'field', v_rule.field_name,
                    'type', v_rule.rule_type,
                    'warning', v_error_msg
                );
            END IF;
        END IF;
    END LOOP;
    
    -- Update the row with validation results
    UPDATE sow_import_staging
    SET 
        validation_errors = v_errors,
        validation_status = CASE 
            WHEN jsonb_array_length(v_errors) = 0 THEN 'valid'
            ELSE 'invalid'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_row_id;
    
    -- Return validation results
    RETURN jsonb_build_object(
        'row_id', p_row_id,
        'status', CASE WHEN jsonb_array_length(v_errors) = 0 THEN 'valid' ELSE 'invalid' END,
        'errors', v_errors,
        'warnings', v_warnings,
        'error_count', jsonb_array_length(v_errors),
        'warning_count', jsonb_array_length(v_warnings)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BATCH VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_import_batch_complete(p_batch_id VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_row RECORD;
    v_validation_result JSONB;
    v_total_rows INTEGER := 0;
    v_valid_rows INTEGER := 0;
    v_invalid_rows INTEGER := 0;
    v_error_summary JSONB = '{}'::JSONB;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Update batch status
    UPDATE import_batches 
    SET status = 'validating' 
    WHERE batch_id = p_batch_id;
    
    -- Log start of validation
    INSERT INTO import_audit_log (batch_id, action, details)
    VALUES (p_batch_id, 'validation_started', jsonb_build_object('timestamp', v_start_time));
    
    -- Validate each row in the batch
    FOR v_row IN 
        SELECT id FROM sow_import_staging 
        WHERE import_batch_id = p_batch_id
        ORDER BY id
    LOOP
        v_total_rows := v_total_rows + 1;
        v_validation_result := validate_sow_row_complete(v_row.id);
        
        IF v_validation_result->>'status' = 'valid' THEN
            v_valid_rows := v_valid_rows + 1;
        ELSE
            v_invalid_rows := v_invalid_rows + 1;
            
            -- Aggregate errors by type
            FOR i IN 0..jsonb_array_length(v_validation_result->'errors') - 1 LOOP
                DECLARE
                    v_error JSONB := v_validation_result->'errors'->i;
                    v_key TEXT := v_error->>'field' || '::' || v_error->>'type';
                BEGIN
                    IF v_error_summary->v_key IS NULL THEN
                        v_error_summary := v_error_summary || 
                            jsonb_build_object(v_key, 1);
                    ELSE
                        v_error_summary := jsonb_set(
                            v_error_summary, 
                            ARRAY[v_key], 
                            to_jsonb((v_error_summary->>v_key)::INTEGER + 1)
                        );
                    END IF;
                END;
            END LOOP;
        END IF;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    -- Update batch with results
    UPDATE import_batches
    SET 
        valid_rows = v_valid_rows,
        invalid_rows = v_invalid_rows,
        status = CASE 
            WHEN v_invalid_rows = 0 THEN 'processing'
            ELSE 'validation_failed'
        END,
        error_summary = v_error_summary,
        validation_duration_ms = EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER
    WHERE batch_id = p_batch_id;
    
    -- Log completion
    INSERT INTO import_audit_log (batch_id, action, details)
    VALUES (p_batch_id, 'validation_completed', jsonb_build_object(
        'total_rows', v_total_rows,
        'valid_rows', v_valid_rows,
        'invalid_rows', v_invalid_rows,
        'duration_ms', EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER
    ));
    
    RETURN jsonb_build_object(
        'batch_id', p_batch_id,
        'total_rows', v_total_rows,
        'valid_rows', v_valid_rows,
        'invalid_rows', v_invalid_rows,
        'validation_time_ms', EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER,
        'error_summary', v_error_summary,
        'status', CASE WHEN v_invalid_rows = 0 THEN 'success' ELSE 'failed' END
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DUPLICATE DETECTION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION find_duplicate_sow_numbers(p_batch_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
    sow_number VARCHAR,
    occurrence_count INTEGER,
    batch_ids TEXT[],
    row_ids INTEGER[],
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.sow_number,
        COUNT(*)::INTEGER as occurrence_count,
        array_agg(DISTINCT s.import_batch_id ORDER BY s.import_batch_id) as batch_ids,
        array_agg(s.id ORDER BY s.created_at) as row_ids,
        MIN(s.created_at) as first_seen,
        MAX(s.created_at) as last_seen
    FROM sow_import_staging s
    WHERE (p_batch_id IS NULL OR s.import_batch_id = p_batch_id)
        AND s.sow_number IS NOT NULL
        AND s.validation_status = 'valid'
    GROUP BY s.sow_number
    HAVING COUNT(*) > 1
    ORDER BY occurrence_count DESC, s.sow_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REFERENCE VALIDATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_project_references(p_batch_id VARCHAR)
RETURNS TABLE (
    project_code VARCHAR,
    usage_count INTEGER,
    exists_in_firestore BOOLEAN,
    sample_sow_numbers TEXT[]
) AS $$
BEGIN
    -- This would normally check against a synced project table
    -- For now, we'll return all unique project codes for manual verification
    RETURN QUERY
    SELECT 
        s.project_code,
        COUNT(*)::INTEGER as usage_count,
        FALSE as exists_in_firestore, -- Would be checked against project table
        array_agg(DISTINCT s.sow_number ORDER BY s.sow_number)[:5] as sample_sow_numbers
    FROM sow_import_staging s
    WHERE s.import_batch_id = p_batch_id
        AND s.project_code IS NOT NULL
        AND s.validation_status = 'valid'
    GROUP BY s.project_code
    ORDER BY usage_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_contractor_references(p_batch_id VARCHAR)
RETURNS TABLE (
    contractor_code VARCHAR,
    contractor_name VARCHAR,
    usage_count INTEGER,
    exists_in_firestore BOOLEAN,
    name_variations TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.contractor_code,
        MIN(s.contractor_name) as contractor_name,
        COUNT(*)::INTEGER as usage_count,
        FALSE as exists_in_firestore, -- Would be checked against contractor table
        CASE 
            WHEN COUNT(DISTINCT s.contractor_name) > 1 
            THEN array_agg(DISTINCT s.contractor_name)
            ELSE NULL
        END as name_variations
    FROM sow_import_staging s
    WHERE s.import_batch_id = p_batch_id
        AND s.contractor_code IS NOT NULL
        AND s.validation_status = 'valid'
    GROUP BY s.contractor_code
    ORDER BY usage_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA QUALITY ANALYSIS
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_data_quality(p_batch_id VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH quality_metrics AS (
        SELECT 
            COUNT(*) as total_rows,
            COUNT(sow_number) as rows_with_sow,
            COUNT(project_code) as rows_with_project,
            COUNT(contractor_code) as rows_with_contractor,
            COUNT(description) as rows_with_description,
            COUNT(qty) as rows_with_qty,
            COUNT(rate) as rows_with_rate,
            COUNT(total) as rows_with_total,
            COUNT(CASE WHEN qty IS NOT NULL AND rate IS NOT NULL AND total IS NOT NULL THEN 1 END) as complete_pricing_rows,
            COUNT(DISTINCT project_code) as unique_projects,
            COUNT(DISTINCT contractor_code) as unique_contractors,
            COUNT(DISTINCT category) as unique_categories,
            SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid_rows,
            SUM(CASE WHEN validation_status = 'invalid' THEN 1 ELSE 0 END) as invalid_rows
        FROM sow_import_staging
        WHERE import_batch_id = p_batch_id
    ),
    pricing_analysis AS (
        SELECT 
            MIN(qty) as min_qty,
            MAX(qty) as max_qty,
            AVG(qty) as avg_qty,
            MIN(rate) as min_rate,
            MAX(rate) as max_rate,
            AVG(rate) as avg_rate,
            MIN(total) as min_total,
            MAX(total) as max_total,
            SUM(total) as sum_total
        FROM sow_import_staging
        WHERE import_batch_id = p_batch_id
            AND validation_status = 'valid'
    ),
    category_distribution AS (
        SELECT 
            jsonb_object_agg(
                COALESCE(category, 'Uncategorized'), 
                count_by_category
            ) as categories
        FROM (
            SELECT 
                category,
                COUNT(*) as count_by_category
            FROM sow_import_staging
            WHERE import_batch_id = p_batch_id
            GROUP BY category
        ) cat
    )
    SELECT jsonb_build_object(
        'batch_id', p_batch_id,
        'total_rows', total_rows,
        'valid_rows', valid_rows,
        'invalid_rows', invalid_rows,
        'completeness', jsonb_build_object(
            'sow_number_pct', ROUND((rows_with_sow::NUMERIC / NULLIF(total_rows, 0)) * 100, 2),
            'project_pct', ROUND((rows_with_project::NUMERIC / NULLIF(total_rows, 0)) * 100, 2),
            'contractor_pct', ROUND((rows_with_contractor::NUMERIC / NULLIF(total_rows, 0)) * 100, 2),
            'description_pct', ROUND((rows_with_description::NUMERIC / NULLIF(total_rows, 0)) * 100, 2),
            'pricing_complete_pct', ROUND((complete_pricing_rows::NUMERIC / NULLIF(total_rows, 0)) * 100, 2)
        ),
        'uniqueness', jsonb_build_object(
            'projects', unique_projects,
            'contractors', unique_contractors,
            'categories', unique_categories
        ),
        'pricing_stats', jsonb_build_object(
            'qty_range', jsonb_build_object('min', min_qty, 'max', max_qty, 'avg', ROUND(avg_qty, 2)),
            'rate_range', jsonb_build_object('min', min_rate, 'max', max_rate, 'avg', ROUND(avg_rate, 2)),
            'total_sum', sum_total
        ),
        'category_distribution', categories
    ) INTO v_result
    FROM quality_metrics, pricing_analysis, category_distribution;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION pre_migration_check(p_batch_id VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_issues JSONB = '[]'::JSONB;
    v_batch RECORD;
    v_duplicate_count INTEGER;
    v_invalid_count INTEGER;
    v_processed_count INTEGER;
BEGIN
    -- Get batch info
    SELECT * INTO v_batch FROM import_batches WHERE batch_id = p_batch_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Batch not found');
    END IF;
    
    -- Check batch status
    IF v_batch.status NOT IN ('processing', 'completed') THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'batch_status',
            'severity', 'error',
            'message', format('Batch status is %s, expected processing or completed', v_batch.status)
        );
    END IF;
    
    -- Check for invalid rows
    SELECT COUNT(*) INTO v_invalid_count
    FROM sow_import_staging
    WHERE import_batch_id = p_batch_id
        AND validation_status = 'invalid';
    
    IF v_invalid_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'invalid_rows',
            'severity', 'error',
            'message', format('%s invalid rows found', v_invalid_count),
            'count', v_invalid_count
        );
    END IF;
    
    -- Check for already processed rows
    SELECT COUNT(*) INTO v_processed_count
    FROM sow_import_staging
    WHERE import_batch_id = p_batch_id
        AND processed_to_firestore = TRUE;
    
    IF v_processed_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'already_processed',
            'severity', 'warning',
            'message', format('%s rows already processed to Firestore', v_processed_count),
            'count', v_processed_count
        );
    END IF;
    
    -- Check for duplicates within batch
    SELECT COUNT(*) INTO v_duplicate_count
    FROM (
        SELECT sow_number
        FROM sow_import_staging
        WHERE import_batch_id = p_batch_id
            AND sow_number IS NOT NULL
            AND validation_status = 'valid'
        GROUP BY sow_number
        HAVING COUNT(*) > 1
    ) dups;
    
    IF v_duplicate_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'duplicate_sow_numbers',
            'severity', 'warning',
            'message', format('%s duplicate SOW numbers in batch', v_duplicate_count),
            'count', v_duplicate_count
        );
    END IF;
    
    -- Return check results
    RETURN jsonb_build_object(
        'batch_id', p_batch_id,
        'ready_for_migration', jsonb_array_length(v_issues) = 0 OR 
            NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_issues) elem 
                WHERE elem->>'severity' = 'error'
            ),
        'issues', v_issues,
        'summary', jsonb_build_object(
            'total_rows', v_batch.total_rows,
            'valid_rows', v_batch.valid_rows,
            'invalid_rows', v_invalid_count,
            'processed_rows', v_processed_count,
            'ready_to_process', v_batch.valid_rows - v_processed_count
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Validate a single row
SELECT validate_sow_row_complete(123);

-- Validate entire batch
SELECT validate_import_batch_complete('BATCH-2025-01-30-001');

-- Find duplicates in batch
SELECT * FROM find_duplicate_sow_numbers('BATCH-2025-01-30-001');

-- Check project references
SELECT * FROM validate_project_references('BATCH-2025-01-30-001');

-- Analyze data quality
SELECT analyze_data_quality('BATCH-2025-01-30-001');

-- Pre-migration check
SELECT pre_migration_check('BATCH-2025-01-30-001');

-- Get import statistics
SELECT * FROM get_import_stats('BATCH-2025-01-30-001');
*/