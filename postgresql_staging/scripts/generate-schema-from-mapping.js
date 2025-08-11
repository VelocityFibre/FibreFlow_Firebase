#!/usr/bin/env node

/**
 * Generate PostgreSQL schema from column mapping
 */

const fs = require('fs');
const path = require('path');

// Load the column mapping
const columnMapping = require('../config/column-mapping.json');

// Generate CREATE TABLE statement
let schema = `-- PostgreSQL schema for OneMap Lawley project data
-- Generated from column mapping
-- Total columns: ${Object.keys(columnMapping).length}

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed (be careful!)
-- DROP TABLE IF EXISTS onemap_lawley_raw CASCADE;
-- DROP TABLE IF EXISTS onemap_status_history CASCADE;
-- DROP TABLE IF EXISTS onemap_import_batches CASCADE;

CREATE TABLE IF NOT EXISTS onemap_lawley_raw (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Import metadata
    import_date TIMESTAMPTZ DEFAULT NOW(),
    source_file TEXT NOT NULL,
    row_number INTEGER,
    
    -- OneMap data columns (from Excel)
`;

// Add all mapped columns
Object.entries(columnMapping).forEach(([excelName, pgName]) => {
    // Determine data type based on column name
    let dataType = 'TEXT'; // Default to TEXT
    
    if (pgName === 'property_id' || pgName === '1map_nad_id' || 
        pgName === 'sections' || pgName === 'pons' || 
        pgName === 'stand_number' || pgName === 'signature_of_the_authorised_person') {
        dataType = 'INTEGER';
    } else if (pgName === 'latitude' || pgName === 'longitude' || 
               pgName.includes('_latitude') || pgName.includes('_longitude')) {
        dataType = 'DECIMAL(15,8)';
    } else if (pgName === 'lst_mod_dt' || pgName.includes('_date')) {
        dataType = 'DATE';
    } else if (pgName === 'id_number' || pgName.includes('contact_number')) {
        dataType = 'BIGINT';
    }
    
    schema += `    "${pgName}" ${dataType}, -- Original: "${excelName}"\n`;
});

schema += `    
    -- Computed fields for analysis
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    data_quality_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Constraints
    UNIQUE(source_file, property_id) -- Prevent duplicates per file
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_status ON onemap_lawley_raw USING btree (status);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_pole ON onemap_lawley_raw USING btree (pole_number);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_drop ON onemap_lawley_raw USING btree (drop_number);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_property ON onemap_lawley_raw USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_import ON onemap_lawley_raw USING btree (import_date);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_source ON onemap_lawley_raw USING btree (source_file);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_agent_pole ON onemap_lawley_raw USING btree (field_agent_name_pole_permission);
CREATE INDEX IF NOT EXISTS idx_onemap_lawley_location ON onemap_lawley_raw USING btree (latitude, longitude);

-- Status history tracking table
CREATE TABLE IF NOT EXISTS onemap_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT DEFAULT 'Lawley',
    entity_type TEXT NOT NULL, -- 'property', 'pole', 'drop'
    entity_id TEXT NOT NULL, -- property_id, pole_number, or drop_number
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_date TIMESTAMPTZ DEFAULT NOW(),
    source_file TEXT NOT NULL,
    import_batch_id UUID,
    change_type TEXT DEFAULT 'update', -- 'create', 'update', 'delete'
    raw_data_id UUID REFERENCES onemap_lawley_raw(id),
    metadata JSONB
);

-- Import batch tracking
CREATE TABLE IF NOT EXISTS onemap_import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT DEFAULT 'Lawley',
    source_file TEXT NOT NULL,
    import_started TIMESTAMPTZ DEFAULT NOW(),
    import_completed TIMESTAMPTZ,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    new_entities INTEGER DEFAULT 0,
    updated_entities INTEGER DEFAULT 0,
    status_changes INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing', -- processing, completed, failed
    error_details JSONB DEFAULT '{}',
    UNIQUE(project_name, source_file)
);

-- Create indexes for status history
CREATE INDEX IF NOT EXISTS idx_status_history_entity ON onemap_status_history USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON onemap_status_history USING btree (change_date);
CREATE INDEX IF NOT EXISTS idx_status_history_field ON onemap_status_history USING btree (field_name);
CREATE INDEX IF NOT EXISTS idx_status_history_batch ON onemap_status_history USING btree (import_batch_id);

-- Create indexes for import batches
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON onemap_import_batches USING btree (status);
CREATE INDEX IF NOT EXISTS idx_import_batches_project_file ON onemap_import_batches USING btree (project_name, source_file);

-- Comments for documentation
COMMENT ON TABLE onemap_lawley_raw IS 'Raw import data from OneMap Excel files for Lawley project';
COMMENT ON TABLE onemap_status_history IS 'Complete history of all status changes for tracking';
COMMENT ON TABLE onemap_import_batches IS 'Track each Excel file import batch';

-- Useful views
CREATE OR REPLACE VIEW current_pole_statuses AS
SELECT DISTINCT ON (pole_number)
    pole_number,
    status,
    field_agent_name_pole_permission,
    import_date,
    source_file
FROM onemap_lawley_raw
WHERE pole_number IS NOT NULL
ORDER BY pole_number, import_date DESC;

CREATE OR REPLACE VIEW status_change_summary AS
SELECT 
    date_trunc('day', change_date) as change_day,
    entity_type,
    field_name,
    COUNT(*) as change_count
FROM onemap_status_history
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;
`;

// Save the schema
const schemaPath = path.join(__dirname, '..', 'config', 'lawley-schema-v2.sql');
fs.writeFileSync(schemaPath, schema);

console.log('Schema generated successfully!');
console.log(`Saved to: ${schemaPath}`);
console.log(`Total columns: ${Object.keys(columnMapping).length + 4} (including metadata)`);