-- Neon Migration Procedures
-- Functions for migrating validated data from Neon to Firestore
-- Version: 1.0
-- Last Updated: 2025-01-30

-- ============================================================================
-- EXPORT FUNCTIONS FOR FIRESTORE
-- ============================================================================

-- Export single batch as JSON for Firestore import
CREATE OR REPLACE FUNCTION export_batch_for_firestore(p_batch_id VARCHAR)
RETURNS TABLE (
    staging_id INTEGER,
    firestore_document JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as staging_id,
        jsonb_build_object(
            -- Core SOW fields
            'sowNumber', s.sow_number,
            'description', s.description,
            'quantity', s.qty,
            'unit', s.unit,
            'rate', s.rate,
            'total', s.total,
            
            -- Material information
            'material', jsonb_build_object(
                'brand', s.brand,
                'itemDescription', s.item_description,
                'itemCode', s.item_code
            ),
            
            -- Project information
            'project', jsonb_build_object(
                'projectCode', s.project_code,
                'projectName', s.project_name,
                'location', s.location
            ),
            
            -- Contractor information
            'contractor', jsonb_build_object(
                'contractorCode', s.contractor_code,
                'contractorName', s.contractor_name
            ),
            
            -- Category information
            'category', s.category,
            'subcategory', s.subcategory,
            'status', COALESCE(s.status, 'active'),
            
            -- Import metadata
            'importMetadata', jsonb_build_object(
                'batchId', s.import_batch_id,
                'importedAt', s.import_timestamp,
                'neonStagingId', s.id,
                'importedBy', s.created_by
            ),
            
            -- Timestamps
            'createdAt', s.created_at,
            'updatedAt', s.updated_at
        ) as firestore_document
    FROM sow_import_staging s
    WHERE s.import_batch_id = p_batch_id
        AND s.validation_status = 'valid'
        AND s.processed_to_firestore = FALSE
    ORDER BY s.id;
END;
$$ LANGUAGE plpgsql;

-- Export batch with pagination support
CREATE OR REPLACE FUNCTION export_batch_paginated(
    p_batch_id VARCHAR,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    staging_id INTEGER,
    firestore_document JSONB,
    total_count INTEGER
) AS $$
DECLARE
    v_total INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM sow_import_staging
    WHERE import_batch_id = p_batch_id
        AND validation_status = 'valid'
        AND processed_to_firestore = FALSE;
    
    -- Return paginated results
    RETURN QUERY
    SELECT 
        s.staging_id,
        s.firestore_document,
        v_total as total_count
    FROM export_batch_for_firestore(p_batch_id) s
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCESSING TRACKING FUNCTIONS
-- ============================================================================

-- Mark single row as processed
CREATE OR REPLACE FUNCTION mark_row_processed(
    p_staging_id INTEGER,
    p_firestore_doc_id VARCHAR,
    p_processed_by VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sow_import_staging
    SET 
        processed_to_firestore = TRUE,
        firestore_doc_id = p_firestore_doc_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_staging_id
        AND processed_to_firestore = FALSE;
    
    -- Log the processing
    INSERT INTO import_audit_log (batch_id, action, details, performed_by)
    SELECT 
        import_batch_id,
        'row_processed',
        jsonb_build_object(
            'staging_id', p_staging_id,
            'firestore_doc_id', p_firestore_doc_id
        ),
        p_processed_by
    FROM sow_import_staging
    WHERE id = p_staging_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Mark multiple rows as processed
CREATE OR REPLACE FUNCTION mark_rows_processed(
    p_staging_ids INTEGER[],
    p_firestore_doc_ids VARCHAR[],
    p_processed_by VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_batch_ids VARCHAR[];
BEGIN
    -- Validate array lengths match
    IF array_length(p_staging_ids, 1) != array_length(p_firestore_doc_ids, 1) THEN
        RAISE EXCEPTION 'Array lengths must match';
    END IF;
    
    -- Process each row
    FOR i IN 1..array_length(p_staging_ids, 1) LOOP
        IF mark_row_processed(p_staging_ids[i], p_firestore_doc_ids[i], p_processed_by) THEN
            v_processed_count := v_processed_count + 1;
        END IF;
    END LOOP;
    
    -- Get affected batch IDs
    SELECT array_agg(DISTINCT import_batch_id) INTO v_batch_ids
    FROM sow_import_staging
    WHERE id = ANY(p_staging_ids);
    
    -- Update batch statistics
    FOR i IN 1..array_length(v_batch_ids, 1) LOOP
        PERFORM update_batch_progress(v_batch_ids[i]);
    END LOOP;
    
    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress(p_batch_id VARCHAR)
RETURNS VOID AS $$
DECLARE
    v_stats RECORD;
BEGIN
    -- Calculate current statistics
    SELECT 
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE validation_status = 'valid') as valid_rows,
        COUNT(*) FILTER (WHERE processed_to_firestore = TRUE) as processed_rows,
        COUNT(*) FILTER (WHERE validation_status = 'valid' AND processed_to_firestore = FALSE) as pending_rows
    INTO v_stats
    FROM sow_import_staging
    WHERE import_batch_id = p_batch_id;
    
    -- Update batch record
    UPDATE import_batches
    SET 
        processed_rows = v_stats.processed_rows,
        status = CASE
            WHEN v_stats.pending_rows = 0 AND v_stats.valid_rows > 0 THEN 'completed'
            WHEN v_stats.processed_rows > 0 THEN 'processing'
            ELSE status
        END,
        completed_at = CASE
            WHEN v_stats.pending_rows = 0 AND v_stats.valid_rows > 0 THEN CURRENT_TIMESTAMP
            ELSE completed_at
        END
    WHERE batch_id = p_batch_id;
    
    -- Log progress update
    INSERT INTO import_audit_log (batch_id, action, details)
    VALUES (p_batch_id, 'progress_update', jsonb_build_object(
        'total_rows', v_stats.total_rows,
        'valid_rows', v_stats.valid_rows,
        'processed_rows', v_stats.processed_rows,
        'pending_rows', v_stats.pending_rows,
        'completion_pct', CASE 
            WHEN v_stats.valid_rows > 0 
            THEN ROUND((v_stats.processed_rows::NUMERIC / v_stats.valid_rows) * 100, 2)
            ELSE 0
        END
    ));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROLLBACK FUNCTIONS
-- ============================================================================

-- Rollback processed rows
CREATE OR REPLACE FUNCTION rollback_processed_rows(
    p_batch_id VARCHAR DEFAULT NULL,
    p_staging_ids INTEGER[] DEFAULT NULL,
    p_reason VARCHAR DEFAULT 'Manual rollback',
    p_performed_by VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_rollback_count INTEGER;
    v_affected_batches VARCHAR[];
BEGIN
    -- Rollback based on batch or specific IDs
    IF p_staging_ids IS NOT NULL THEN
        UPDATE sow_import_staging
        SET 
            processed_to_firestore = FALSE,
            firestore_doc_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(p_staging_ids)
            AND processed_to_firestore = TRUE;
    ELSIF p_batch_id IS NOT NULL THEN
        UPDATE sow_import_staging
        SET 
            processed_to_firestore = FALSE,
            firestore_doc_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE import_batch_id = p_batch_id
            AND processed_to_firestore = TRUE;
    ELSE
        RAISE EXCEPTION 'Either batch_id or staging_ids must be provided';
    END IF;
    
    GET DIAGNOSTICS v_rollback_count = ROW_COUNT;
    
    -- Get affected batches
    IF p_staging_ids IS NOT NULL THEN
        SELECT array_agg(DISTINCT import_batch_id) INTO v_affected_batches
        FROM sow_import_staging
        WHERE id = ANY(p_staging_ids);
    ELSE
        v_affected_batches := ARRAY[p_batch_id];
    END IF;
    
    -- Update batch status
    UPDATE import_batches
    SET 
        status = 'rolled_back',
        completed_at = CURRENT_TIMESTAMP
    WHERE batch_id = ANY(v_affected_batches);
    
    -- Log rollback
    INSERT INTO import_audit_log (batch_id, action, details, performed_by)
    VALUES (
        CASE WHEN p_batch_id IS NOT NULL THEN p_batch_id ELSE 'MULTIPLE' END,
        'rollback',
        jsonb_build_object(
            'reason', p_reason,
            'rollback_count', v_rollback_count,
            'affected_batches', v_affected_batches,
            'staging_ids', p_staging_ids
        ),
        p_performed_by
    );
    
    -- Update batch progress for affected batches
    FOREACH p_batch_id IN ARRAY v_affected_batches LOOP
        PERFORM update_batch_progress(p_batch_id);
    END LOOP;
    
    RETURN v_rollback_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONFLICT RESOLUTION FUNCTIONS
-- ============================================================================

-- Handle duplicate SOW numbers during migration
CREATE OR REPLACE FUNCTION resolve_duplicate_sow_numbers(
    p_batch_id VARCHAR,
    p_resolution_strategy VARCHAR DEFAULT 'keep_newest'
) RETURNS TABLE (
    sow_number VARCHAR,
    kept_id INTEGER,
    rejected_ids INTEGER[]
) AS $$
BEGIN
    -- Strategies: keep_newest, keep_oldest, keep_highest_total, manual
    RETURN QUERY
    WITH duplicates AS (
        SELECT 
            sow_number,
            array_agg(id ORDER BY 
                CASE p_resolution_strategy
                    WHEN 'keep_newest' THEN created_at DESC
                    WHEN 'keep_oldest' THEN created_at ASC
                    WHEN 'keep_highest_total' THEN total DESC
                    ELSE created_at DESC
                END
            ) as ids
        FROM sow_import_staging
        WHERE import_batch_id = p_batch_id
            AND sow_number IS NOT NULL
            AND validation_status = 'valid'
        GROUP BY sow_number
        HAVING COUNT(*) > 1
    )
    SELECT 
        d.sow_number,
        d.ids[1] as kept_id,
        d.ids[2:] as rejected_ids
    FROM duplicates d;
    
    -- Mark rejected duplicates as invalid
    UPDATE sow_import_staging s
    SET 
        validation_status = 'invalid',
        validation_errors = validation_errors || jsonb_build_object(
            'field', 'sow_number',
            'error', 'Duplicate SOW number - rejected by ' || p_resolution_strategy
        )
    FROM (
        SELECT unnest(rejected_ids) as reject_id
        FROM resolve_duplicate_sow_numbers(p_batch_id, p_resolution_strategy)
    ) r
    WHERE s.id = r.reject_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION STATUS VIEWS
-- ============================================================================

-- Real-time migration progress view
CREATE OR REPLACE VIEW migration_progress AS
SELECT 
    b.batch_id,
    b.filename,
    b.status as batch_status,
    b.total_rows,
    b.valid_rows,
    b.processed_rows,
    b.valid_rows - b.processed_rows as pending_rows,
    CASE 
        WHEN b.valid_rows > 0 
        THEN ROUND((b.processed_rows::NUMERIC / b.valid_rows) * 100, 2)
        ELSE 0
    END as completion_percentage,
    b.started_at,
    b.completed_at,
    CASE 
        WHEN b.status = 'processing' 
        THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.started_at))::INTEGER
        WHEN b.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (b.completed_at - b.started_at))::INTEGER
        ELSE NULL
    END as duration_seconds,
    CASE
        WHEN b.status = 'processing' AND b.processed_rows > 0
        THEN ROUND((b.valid_rows - b.processed_rows)::NUMERIC / 
             (b.processed_rows::NUMERIC / 
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.started_at))))
        ELSE NULL
    END as estimated_seconds_remaining
FROM import_batches b
WHERE b.status IN ('processing', 'completed', 'validation_failed')
ORDER BY b.started_at DESC;

-- Failed migrations requiring attention
CREATE OR REPLACE VIEW failed_migrations AS
SELECT 
    s.import_batch_id,
    s.id as staging_id,
    s.sow_number,
    s.validation_errors,
    s.created_at,
    b.filename
FROM sow_import_staging s
JOIN import_batches b ON s.import_batch_id = b.batch_id
WHERE s.validation_status = 'invalid'
   OR (s.validation_status = 'valid' AND s.processed_to_firestore = FALSE AND b.status = 'failed')
ORDER BY s.created_at DESC;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Archive completed migrations
CREATE OR REPLACE FUNCTION archive_completed_batch(
    p_batch_id VARCHAR,
    p_archive_reason VARCHAR DEFAULT 'Completed migration'
) RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- Verify batch is completed
    IF NOT EXISTS (
        SELECT 1 FROM import_batches 
        WHERE batch_id = p_batch_id 
        AND status = 'completed'
    ) THEN
        RAISE EXCEPTION 'Batch % is not completed', p_batch_id;
    END IF;
    
    -- Move to archive table
    WITH archived AS (
        DELETE FROM sow_import_staging
        WHERE import_batch_id = p_batch_id
            AND processed_to_firestore = TRUE
        RETURNING *
    )
    INSERT INTO sow_import_staging_archive
    SELECT *, CURRENT_TIMESTAMP, p_archive_reason
    FROM archived;
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    -- Log archival
    INSERT INTO import_audit_log (batch_id, action, details)
    VALUES (p_batch_id, 'archived', jsonb_build_object(
        'reason', p_archive_reason,
        'archived_count', v_archived_count
    ));
    
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Get current processing status across all batches
CREATE OR REPLACE FUNCTION get_processing_status()
RETURNS TABLE (
    status VARCHAR,
    batch_count INTEGER,
    total_rows INTEGER,
    processed_rows INTEGER,
    pending_rows INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.status,
        COUNT(DISTINCT b.batch_id)::INTEGER as batch_count,
        SUM(b.total_rows)::INTEGER as total_rows,
        SUM(b.processed_rows)::INTEGER as processed_rows,
        SUM(b.valid_rows - b.processed_rows)::INTEGER as pending_rows
    FROM import_batches b
    GROUP BY b.status
    ORDER BY 
        CASE b.status
            WHEN 'processing' THEN 1
            WHEN 'validating' THEN 2
            WHEN 'validation_failed' THEN 3
            WHEN 'completed' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql;

-- Get recent processing activity
CREATE OR REPLACE FUNCTION get_recent_activity(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    timestamp TIMESTAMP WITH TIME ZONE,
    batch_id VARCHAR,
    action VARCHAR,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        performed_at as timestamp,
        a.batch_id,
        a.action,
        a.details
    FROM import_audit_log a
    WHERE a.performed_at > CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
    ORDER BY a.performed_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Export batch for Firestore
SELECT * FROM export_batch_for_firestore('BATCH-2025-01-30-001');

-- Export with pagination
SELECT * FROM export_batch_paginated('BATCH-2025-01-30-001', 50, 0);

-- Mark rows as processed
SELECT mark_rows_processed(
    ARRAY[1, 2, 3], 
    ARRAY['firestore-id-1', 'firestore-id-2', 'firestore-id-3'],
    'import-script@fibreflow.com'
);

-- Check migration progress
SELECT * FROM migration_progress;

-- Rollback a batch
SELECT rollback_processed_rows('BATCH-2025-01-30-001', NULL, 'Data quality issue', 'admin@fibreflow.com');

-- Handle duplicates
SELECT * FROM resolve_duplicate_sow_numbers('BATCH-2025-01-30-001', 'keep_newest');

-- Archive completed batch
SELECT archive_completed_batch('BATCH-2025-01-30-001', 'Monthly archival');

-- Get processing status
SELECT * FROM get_processing_status();

-- Get recent activity
SELECT * FROM get_recent_activity(48); -- Last 48 hours
*/