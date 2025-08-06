-- SQL Views for OneMap Progress Summary Dashboard
-- These views transform the raw OneMap Excel data (159 columns) into the dashboard format

-- First, create the status_changes table to hold the imported OneMap data
CREATE TABLE IF NOT EXISTS status_changes (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(50),
  address TEXT,
  project_name VARCHAR(100),
  zone INTEGER,
  agent_name VARCHAR(100),
  pole_number VARCHAR(50),
  drop_number VARCHAR(50),
  status TEXT,
  date_stamp TIMESTAMP,
  flow_name_groups TEXT,
  permission_date DATE,
  pole_planted_date DATE,
  stringing_date DATE,
  signup_date DATE,
  drop_date DATE,
  connected_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_status_changes_project ON status_changes(project_name);
CREATE INDEX idx_status_changes_zone ON status_changes(zone);
CREATE INDEX idx_status_changes_pole ON status_changes(pole_number);
CREATE INDEX idx_status_changes_dates ON status_changes(date_stamp);

-- View 1: Build Milestones Summary (matches Excel dashboard top section)
CREATE OR REPLACE VIEW build_milestones_summary AS
WITH milestone_counts AS (
  SELECT 
    'Permissions' as milestone_type,
    COUNT(DISTINCT pole_number) as scope,
    COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN pole_number END) as completed,
    MIN(permission_date) as start_date,
    MAX(permission_date) as end_date
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT 
    'Poles Planted',
    COUNT(DISTINCT pole_number),
    COUNT(DISTINCT CASE WHEN status LIKE '%Pole%Planted%' THEN pole_number END),
    MIN(pole_planted_date),
    MAX(pole_planted_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT 
    'Stringing',
    COUNT(DISTINCT pole_number),
    COUNT(DISTINCT CASE WHEN status LIKE '%Stringing%Complete%' THEN pole_number END),
    MIN(stringing_date),
    MAX(stringing_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT 
    'Sign Ups',
    COUNT(DISTINCT property_id),
    COUNT(DISTINCT CASE WHEN status LIKE '%Sign%Up%' THEN property_id END),
    MIN(signup_date),
    MAX(signup_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT 
    'Home Drops',
    COUNT(DISTINCT property_id),
    COUNT(DISTINCT CASE WHEN status LIKE '%Drop%Complete%' THEN property_id END),
    MIN(drop_date),
    MAX(drop_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT 
    'Homes Connected',
    COUNT(DISTINCT property_id),
    COUNT(DISTINCT CASE WHEN status LIKE '%Connected%' THEN property_id END),
    MIN(connected_date),
    MAX(connected_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
)
SELECT 
  milestone_type as name,
  scope,
  completed,
  ROUND((completed::numeric / NULLIF(scope, 0)) * 100, 1) as percentage,
  EXTRACT(DAY FROM (end_date - start_date)::interval)::integer as duration_days,
  ROUND(EXTRACT(DAY FROM (end_date - start_date)::interval)::numeric / 30, 1) as duration_months,
  CASE 
    WHEN milestone_type = 'Permissions' THEN 'Pole permissions from homeowners'
    WHEN milestone_type = 'Poles Planted' THEN 'Physical pole installation'
    WHEN milestone_type = 'Stringing' THEN 'Cable stringing between poles'
    WHEN milestone_type = 'Sign Ups' THEN 'Customer sign-ups for service'
    WHEN milestone_type = 'Home Drops' THEN 'Fiber drops to homes'
    WHEN milestone_type = 'Homes Connected' THEN 'Active fiber connections'
  END as notes
FROM milestone_counts
ORDER BY 
  CASE milestone_type
    WHEN 'Permissions' THEN 1
    WHEN 'Poles Planted' THEN 2
    WHEN 'Stringing' THEN 3
    WHEN 'Sign Ups' THEN 4
    WHEN 'Home Drops' THEN 5
    WHEN 'Homes Connected' THEN 6
  END;

-- View 2: Zone Progress Detail (matches Excel zone-by-zone breakdown)
CREATE OR REPLACE VIEW zone_progress_detail AS
WITH zone_metrics AS (
  SELECT 
    zone,
    COUNT(DISTINCT property_id) as home_count,
    COUNT(DISTINCT pole_number) as permission_scope,
    COUNT(DISTINCT pole_number) as pole_scope,
    COUNT(DISTINCT pole_number) as stringing_scope,
    COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN pole_number END) as permissions_completed,
    COUNT(DISTINCT CASE WHEN status LIKE '%Pole%Planted%' THEN pole_number END) as poles_planted,
    COUNT(DISTINCT CASE WHEN status LIKE '%Stringing%Complete%' THEN pole_number END) as stringing_completed,
    COUNT(DISTINCT CASE WHEN status LIKE '%Sign%Up%' THEN property_id END) as signups_completed,
    COUNT(DISTINCT CASE WHEN status LIKE '%Drop%Complete%' THEN property_id END) as drops_completed,
    COUNT(DISTINCT CASE WHEN status LIKE '%Connected%' THEN property_id END) as connected_completed
  FROM status_changes
  WHERE project_name = 'Lawley' AND zone IS NOT NULL
  GROUP BY zone
)
SELECT 
  zone,
  home_count,
  permission_scope,
  pole_scope,
  stringing_scope,
  permissions_completed,
  poles_planted,
  stringing_completed,
  signups_completed,
  drops_completed,
  connected_completed,
  ROUND((permissions_completed::numeric / NULLIF(permission_scope, 0)) * 100, 1) as permissions_percentage,
  ROUND((poles_planted::numeric / NULLIF(pole_scope, 0)) * 100, 1) as poles_planted_percentage,
  ROUND((stringing_completed::numeric / NULLIF(stringing_scope, 0)) * 100, 1) as stringing_percentage,
  ROUND((signups_completed::numeric / NULLIF(home_count, 0)) * 100, 1) as signups_percentage,
  ROUND((drops_completed::numeric / NULLIF(home_count, 0)) * 100, 1) as drops_percentage,
  ROUND((connected_completed::numeric / NULLIF(home_count, 0)) * 100, 1) as connected_percentage
FROM zone_metrics
ORDER BY zone;

-- View 3: Daily Progress for Last 7 Days (matches Excel daily tracking)
CREATE OR REPLACE VIEW daily_progress_7days AS
WITH daily_counts AS (
  SELECT 
    DATE(date_stamp) as progress_date,
    TO_CHAR(DATE(date_stamp), 'Dy') as day_name,
    COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN pole_number END) as permissions,
    COUNT(DISTINCT CASE WHEN status LIKE '%Pole%Planted%' THEN pole_number END) as poles_planted,
    COUNT(DISTINCT CASE WHEN status LIKE '%Stringing%D%' THEN pole_number END) as stringing_d,
    COUNT(DISTINCT CASE WHEN status LIKE '%Stringing%F%' THEN pole_number END) as stringing_f,
    COUNT(DISTINCT CASE WHEN status LIKE '%Sign%Up%' THEN property_id END) as sign_ups,
    COUNT(DISTINCT CASE WHEN status LIKE '%Drop%Complete%' THEN property_id END) as home_drops,
    COUNT(DISTINCT CASE WHEN status LIKE '%Connected%' THEN property_id END) as homes_connected
  FROM status_changes
  WHERE project_name = 'Lawley' 
    AND DATE(date_stamp) >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(date_stamp)
)
SELECT * FROM daily_counts
ORDER BY progress_date DESC;

-- View 4: Key Milestones (project timeline)
CREATE OR REPLACE VIEW key_milestones AS
WITH milestone_dates AS (
  SELECT
    'Project Start' as milestone_name,
    'Complete' as status,
    MIN(date_stamp)::date as actual_date
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT
    '50% Permissions',
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN pole_number END) >= 
           COUNT(DISTINCT pole_number) * 0.5
      THEN 'Complete'
      ELSE 'In Progress'
    END,
    MIN(CASE 
      WHEN COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN pole_number END) OVER (ORDER BY date_stamp) >= 
           COUNT(DISTINCT pole_number) OVER () * 0.5
      THEN date_stamp::date
    END)
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT
    '100% Poles Planted',
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN status LIKE '%Pole%Planted%' THEN pole_number END) >= 
           COUNT(DISTINCT pole_number)
      THEN 'Complete'
      ELSE 'In Progress'
    END,
    MAX(pole_planted_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
  
  UNION ALL
  
  SELECT
    'All Stringing Complete',
    CASE 
      WHEN COUNT(DISTINCT CASE WHEN status LIKE '%Stringing%Complete%' THEN pole_number END) >= 
           COUNT(DISTINCT pole_number)
      THEN 'Complete'
      ELSE 'In Progress'
    END,
    MAX(stringing_date)
  FROM status_changes
  WHERE project_name = 'Lawley'
)
SELECT 
  milestone_name,
  status,
  COALESCE(TO_CHAR(actual_date + INTERVAL '30 days', 'YYYY-MM-DD'), 'TBD') as eta,
  COALESCE(TO_CHAR(actual_date, 'YYYY-MM-DD'), 'Not Started') as actual_date
FROM milestone_dates;

-- View 5: Prerequisites (project dependencies)
CREATE OR REPLACE VIEW prerequisites AS
SELECT 
  prerequisite_name,
  responsible,
  status
FROM (
  VALUES 
    ('Environmental Clearance', 'Project Manager', 'Complete'),
    ('Wayleave Permissions', 'Legal Team', 'Complete'),
    ('Equipment Procurement', 'Procurement', 'Complete'),
    ('Contractor Onboarding', 'Operations', 'Complete'),
    ('Safety Training', 'HSE Team', 'In Progress'),
    ('Material Delivery', 'Logistics', 'In Progress')
) AS t(prerequisite_name, responsible, status);

-- Function to get all progress data in one call
CREATE OR REPLACE FUNCTION get_project_progress_summary(project_name TEXT DEFAULT 'Lawley')
RETURNS TABLE (
  build_milestones JSON,
  zone_progress JSON,
  daily_progress JSON,
  key_milestones JSON,
  prerequisites JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT json_agg(row_to_json(bm)) FROM build_milestones_summary bm) as build_milestones,
    (SELECT json_agg(row_to_json(zp)) FROM zone_progress_detail zp) as zone_progress,
    (SELECT json_agg(row_to_json(dp)) FROM daily_progress_7days dp) as daily_progress,
    (SELECT json_agg(row_to_json(km)) FROM key_milestones km) as key_milestones,
    (SELECT json_agg(row_to_json(pr)) FROM prerequisites pr) as prerequisites;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the anon role (Supabase public access)
GRANT SELECT ON status_changes TO anon;
GRANT SELECT ON build_milestones_summary TO anon;
GRANT SELECT ON zone_progress_detail TO anon;
GRANT SELECT ON daily_progress_7days TO anon;
GRANT SELECT ON key_milestones TO anon;
GRANT SELECT ON prerequisites TO anon;
GRANT EXECUTE ON FUNCTION get_project_progress_summary(TEXT) TO anon;