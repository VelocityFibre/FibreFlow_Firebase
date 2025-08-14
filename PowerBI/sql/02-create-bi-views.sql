-- PowerBI Business Intelligence Views
-- These views provide clean, business-friendly data for PowerBI dashboards

-- Switch to bi_views schema
SET search_path TO bi_views, public;

-- =============================================================================
-- PROPERTY STATUS VIEW (Main operational data)
-- =============================================================================
CREATE OR REPLACE VIEW bi_views.property_status AS
SELECT 
    -- Core identifiers
    (data->>'property_id')::VARCHAR AS "Property ID",
    (data->>'pole_number')::VARCHAR AS "Pole Number",
    (data->>'drop_number')::VARCHAR AS "Drop Number",
    
    -- Status information
    (data->>'status')::VARCHAR AS "Current Status",
    CASE 
        WHEN data->>'status' LIKE '%Approved%' THEN 'Approved'
        WHEN data->>'status' LIKE '%In Progress%' THEN 'In Progress'
        WHEN data->>'status' LIKE '%Declined%' THEN 'Declined'
        WHEN data->>'status' LIKE '%Scheduled%' THEN 'Scheduled'
        WHEN data->>'status' LIKE '%Installed%' THEN 'Completed'
        ELSE 'Other'
    END AS "Status Category",
    
    -- Agent/Contractor
    COALESCE(
        data->>'agent_name',
        data->>'contractor_name',
        data->>'assigned_to'
    )::VARCHAR AS "Agent Name",
    
    -- Location details
    (data->>'address')::VARCHAR AS "Address",
    (data->>'suburb')::VARCHAR AS "Suburb",
    (data->>'zone')::VARCHAR AS "Zone",
    (data->>'distribution')::VARCHAR AS "Distribution",
    (data->>'feeder')::VARCHAR AS "Feeder",
    
    -- GPS coordinates
    (data->>'latitude')::DECIMAL(10,8) AS "Latitude",
    (data->>'longitude')::DECIMAL(11,8) AS "Longitude",
    
    -- Dates (converted from ISO strings)
    CASE 
        WHEN data->>'permission_date' IS NOT NULL 
        THEN (data->>'permission_date')::DATE 
        ELSE NULL 
    END AS "Permission Date",
    
    CASE 
        WHEN data->>'signup_date' IS NOT NULL 
        THEN (data->>'signup_date')::DATE 
        ELSE NULL 
    END AS "Signup Date",
    
    CASE 
        WHEN data->>'installation_date' IS NOT NULL 
        THEN (data->>'installation_date')::DATE 
        ELSE NULL 
    END AS "Installation Date",
    
    -- Calculated fields
    CASE 
        WHEN data->>'pole_number' IS NOT NULL THEN 1 
        ELSE 0 
    END AS "Has Pole",
    
    CASE 
        WHEN data->>'drop_number' IS NOT NULL THEN 1 
        ELSE 0 
    END AS "Has Drop",
    
    -- Metadata
    last_updated AS "Last Updated",
    collection AS "Source Collection"
    
FROM firebase_current_state
WHERE collection IN ('status_changes', 'planned-poles', 'pole-installations')
AND deleted = FALSE;

-- =============================================================================
-- PROJECT SUMMARY VIEW
-- =============================================================================
CREATE OR REPLACE VIEW bi_views.project_summary AS
SELECT 
    (data->>'id')::VARCHAR AS "Project ID",
    (data->>'title')::VARCHAR AS "Project Name",
    (data->>'client'->>'name')::VARCHAR AS "Client Name",
    (data->>'type')::VARCHAR AS "Project Type",
    (data->>'status')::VARCHAR AS "Project Status",
    (data->>'priority')::VARCHAR AS "Priority",
    (data->>'location')::VARCHAR AS "Location",
    
    -- Dates
    CASE 
        WHEN data->>'startDate' IS NOT NULL 
        THEN (data->>'startDate')::DATE 
        ELSE NULL 
    END AS "Start Date",
    
    CASE 
        WHEN data->>'endDate' IS NOT NULL 
        THEN (data->>'endDate')::DATE 
        ELSE NULL 
    END AS "End Date",
    
    -- Progress
    (data->>'progress')::INTEGER AS "Progress Percentage",
    
    -- Calculated fields
    CASE 
        WHEN data->>'status' = 'active' THEN 'Active'
        WHEN data->>'status' = 'completed' THEN 'Completed'
        WHEN data->>'status' = 'on-hold' THEN 'On Hold'
        ELSE 'Pending'
    END AS "Status Group",
    
    last_updated AS "Last Updated"
    
FROM firebase_current_state
WHERE collection = 'projects'
AND deleted = FALSE;

-- =============================================================================
-- AGENT PERFORMANCE VIEW
-- =============================================================================
CREATE OR REPLACE VIEW bi_views.agent_performance AS
WITH agent_stats AS (
    SELECT 
        COALESCE(
            data->>'agent_name',
            data->>'contractor_name',
            'Unassigned'
        ) AS agent,
        COUNT(*) AS total_properties,
        SUM(CASE WHEN data->>'status' LIKE '%Approved%' THEN 1 ELSE 0 END) AS approvals,
        SUM(CASE WHEN data->>'status' LIKE '%Installed%' THEN 1 ELSE 0 END) AS completions,
        SUM(CASE WHEN data->>'status' LIKE '%Declined%' THEN 1 ELSE 0 END) AS declines,
        MAX(last_updated) AS last_activity
    FROM firebase_current_state
    WHERE collection IN ('status_changes', 'planned-poles')
    AND deleted = FALSE
    GROUP BY agent
)
SELECT 
    agent AS "Agent Name",
    total_properties AS "Total Properties",
    approvals AS "Approvals",
    completions AS "Completions",
    declines AS "Declines",
    ROUND(100.0 * completions / NULLIF(total_properties, 0), 2) AS "Completion Rate %",
    ROUND(100.0 * approvals / NULLIF(total_properties, 0), 2) AS "Approval Rate %",
    last_activity AS "Last Activity"
FROM agent_stats
WHERE agent IS NOT NULL
ORDER BY total_properties DESC;

-- =============================================================================
-- DAILY KPI VIEW
-- =============================================================================
CREATE OR REPLACE VIEW bi_views.daily_kpis AS
SELECT 
    (data->>'date')::DATE AS "Date",
    (data->>'projectId')::VARCHAR AS "Project ID",
    
    -- Poles metrics
    (data->>'newPolesPlanned')::INTEGER AS "New Poles Planned",
    (data->>'polesInstalled')::INTEGER AS "Poles Installed",
    (data->>'totalActivePoles')::INTEGER AS "Total Active Poles",
    
    -- Drops metrics
    (data->>'dropsConnected')::INTEGER AS "Drops Connected",
    (data->>'totalActiveDrops')::INTEGER AS "Total Active Drops",
    
    -- Financial metrics
    (data->>'dailyCost')::DECIMAL(10,2) AS "Daily Cost",
    (data->>'cumulativeCost')::DECIMAL(10,2) AS "Cumulative Cost",
    
    -- Quality metrics
    (data->>'qualityScore')::INTEGER AS "Quality Score",
    (data->>'safetyIncidents')::INTEGER AS "Safety Incidents",
    (data->>'reworkRequired')::INTEGER AS "Rework Required",
    
    -- Progress metrics
    (data->>'progressPercentage')::DECIMAL(5,2) AS "Progress %",
    
    last_updated AS "Last Updated"
    
FROM firebase_current_state
WHERE collection IN ('daily-kpis', 'dailyProgress')
AND deleted = FALSE;

-- =============================================================================
-- MEETINGS AND ACTION ITEMS VIEW
-- =============================================================================
CREATE OR REPLACE VIEW bi_views.meetings_action_items AS
SELECT 
    (data->>'id')::VARCHAR AS "Meeting ID",
    (data->>'title')::VARCHAR AS "Meeting Title",
    (data->>'date')::TIMESTAMP AS "Meeting Date",
    (data->>'duration')::INTEGER AS "Duration (minutes)",
    
    -- Extract action items from array
    action_item->>'text' AS "Action Item",
    action_item->>'assignee' AS "Assignee",
    action_item->>'priority' AS "Priority",
    (action_item->>'completed')::BOOLEAN AS "Completed",
    (action_item->>'dueDate')::DATE AS "Due Date",
    
    last_updated AS "Last Updated"
    
FROM firebase_current_state,
LATERAL jsonb_array_elements(data->'actionItems') AS action_item
WHERE collection = 'meetings'
AND deleted = FALSE
AND data->'actionItems' IS NOT NULL;

-- =============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================================================

-- Daily Summary (refreshed nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS bi_views.daily_summary AS
WITH daily_data AS (
    SELECT 
        (data->>'signup_date')::DATE AS activity_date,
        (data->>'zone')::VARCHAR AS zone,
        COALESCE(data->>'agent_name', 'Unassigned') AS agent,
        (data->>'status')::VARCHAR AS status
    FROM firebase_current_state
    WHERE collection = 'status_changes'
    AND deleted = FALSE
    AND data->>'signup_date' IS NOT NULL
)
SELECT 
    activity_date AS "Date",
    zone AS "Zone",
    agent AS "Agent",
    COUNT(*) AS "Total Activities",
    SUM(CASE WHEN status LIKE '%Approved%' THEN 1 ELSE 0 END) AS "Approvals",
    SUM(CASE WHEN status LIKE '%Declined%' THEN 1 ELSE 0 END) AS "Declines",
    SUM(CASE WHEN status LIKE '%Installed%' THEN 1 ELSE 0 END) AS "Installations"
FROM daily_data
WHERE activity_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY activity_date, zone, agent;

-- Create indexes on materialized view
CREATE INDEX idx_daily_summary_date ON bi_views.daily_summary("Date");
CREATE INDEX idx_daily_summary_zone ON bi_views.daily_summary("Zone");
CREATE INDEX idx_daily_summary_agent ON bi_views.daily_summary("Agent");

-- =============================================================================
-- HELPER FUNCTIONS FOR POWERBI
-- =============================================================================

-- Function to get current metric value
CREATE OR REPLACE FUNCTION bi_views.get_current_metric(metric_name VARCHAR)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        SELECT (data->>metric_name)::DECIMAL
        FROM firebase_current_state
        WHERE collection = 'metrics'
        AND data->>'metric_type' = metric_name
        ORDER BY last_updated DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- REFRESH MATERIALIZED VIEWS FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION bi_views.refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY bi_views.daily_summary;
    -- Add more materialized views here as created
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================
COMMENT ON VIEW bi_views.property_status IS 'Main operational view showing all properties, poles, and their current status';
COMMENT ON VIEW bi_views.project_summary IS 'Project overview with status, progress, and key metrics';
COMMENT ON VIEW bi_views.agent_performance IS 'Agent/contractor performance metrics and rankings';
COMMENT ON VIEW bi_views.daily_kpis IS 'Daily key performance indicators for operations';
COMMENT ON VIEW bi_views.meetings_action_items IS 'Meeting records with associated action items';
COMMENT ON MATERIALIZED VIEW bi_views.daily_summary IS 'Pre-aggregated daily statistics for fast dashboard loading';