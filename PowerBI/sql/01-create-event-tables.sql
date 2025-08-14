-- PowerBI Integration: Event Store Tables
-- This schema receives all Firebase changes and maintains current state

-- Create schema for PowerBI views
CREATE SCHEMA IF NOT EXISTS bi_views;

-- Main event store table
CREATE TABLE IF NOT EXISTS firebase_events (
    id SERIAL PRIMARY KEY,
    collection VARCHAR(100) NOT NULL,
    document_id VARCHAR(200) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    data JSONB,
    previous_data JSONB,
    timestamp TIMESTAMP NOT NULL,
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate events
    UNIQUE(collection, document_id, timestamp)
);

-- Current state table for fast lookups
CREATE TABLE IF NOT EXISTS firebase_current_state (
    collection VARCHAR(100) NOT NULL,
    document_id VARCHAR(200) NOT NULL,
    data JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    
    PRIMARY KEY (collection, document_id)
);

-- Failed sync tracking
CREATE TABLE IF NOT EXISTS sync_failures (
    id SERIAL PRIMARY KEY,
    collection VARCHAR(100) NOT NULL,
    document_id VARCHAR(200) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_firebase_events_collection ON firebase_events(collection);
CREATE INDEX idx_firebase_events_document ON firebase_events(document_id);
CREATE INDEX idx_firebase_events_timestamp ON firebase_events(sync_timestamp DESC);
CREATE INDEX idx_firebase_events_operation ON firebase_events(operation);
CREATE INDEX idx_firebase_events_composite ON firebase_events(collection, document_id, timestamp DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_firebase_events_data ON firebase_events USING GIN(data);
CREATE INDEX idx_firebase_current_state_data ON firebase_current_state USING GIN(data);

-- Index for current state lookups
CREATE INDEX idx_firebase_current_state_collection ON firebase_current_state(collection);
CREATE INDEX idx_firebase_current_state_updated ON firebase_current_state(last_updated DESC);

-- Index for sync failures
CREATE INDEX idx_sync_failures_pending ON sync_failures(retry_count, created_at) 
WHERE resolved_at IS NULL;

-- Function to get latest data for a document
CREATE OR REPLACE FUNCTION get_latest_document(
    p_collection VARCHAR,
    p_document_id VARCHAR
) RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT data 
        FROM firebase_current_state 
        WHERE collection = p_collection 
        AND document_id = p_document_id 
        AND deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get document history
CREATE OR REPLACE FUNCTION get_document_history(
    p_collection VARCHAR,
    p_document_id VARCHAR,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    operation VARCHAR,
    data JSONB,
    timestamp TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.operation,
        e.data,
        e.timestamp
    FROM firebase_events e
    WHERE e.collection = p_collection 
    AND e.document_id = p_document_id
    ORDER BY e.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create sync statistics view
CREATE OR REPLACE VIEW sync_statistics AS
SELECT 
    collection,
    COUNT(*) as total_events,
    COUNT(DISTINCT document_id) as unique_documents,
    MAX(sync_timestamp) as last_sync,
    MIN(sync_timestamp) as first_sync,
    SUM(CASE WHEN operation = 'create' THEN 1 ELSE 0 END) as creates,
    SUM(CASE WHEN operation = 'update' THEN 1 ELSE 0 END) as updates,
    SUM(CASE WHEN operation = 'delete' THEN 1 ELSE 0 END) as deletes
FROM firebase_events
GROUP BY collection;

-- Grant permissions for PowerBI user
CREATE USER IF NOT EXISTS powerbi_reader WITH PASSWORD 'changeme';
GRANT CONNECT ON DATABASE neondb TO powerbi_reader;
GRANT USAGE ON SCHEMA public TO powerbi_reader;
GRANT USAGE ON SCHEMA bi_views TO powerbi_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powerbi_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA bi_views TO powerbi_reader;

-- Make sure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powerbi_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA bi_views GRANT SELECT ON TABLES TO powerbi_reader;