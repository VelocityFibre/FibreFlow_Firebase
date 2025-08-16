#!/bin/bash

# Load environment variables
source ../../.env.local

echo "🔍 Checking SOW Database Status"
echo "================================"

# Use psql to check current status
psql "$NEON_CONNECTION_STRING" << EOF
-- Check if tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name) as exists
FROM (VALUES ('sow_poles'), ('sow_drops'), ('sow_fibre')) AS t(table_name);

-- Check current counts
SELECT 
    'sow_poles' as table_name, 
    COUNT(*) as row_count,
    COUNT(DISTINCT project_id) as projects
FROM sow_poles
UNION ALL
SELECT 
    'sow_drops' as table_name, 
    COUNT(*) as row_count,
    COUNT(DISTINCT project_id) as projects
FROM sow_drops
UNION ALL
SELECT 
    'sow_fibre' as table_name, 
    COUNT(*) as row_count,
    COUNT(DISTINCT project_id) as projects
FROM sow_fibre;

-- Check sample data
SELECT 'Sample Poles:' as info;
SELECT pole_number, status, designer FROM sow_poles LIMIT 5;

SELECT 'Sample Drops:' as info;
SELECT drop_number, pole_number, designer FROM sow_drops LIMIT 5;
EOF