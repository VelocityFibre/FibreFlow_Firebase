-- Create zone_progress view for analytics dashboard
CREATE OR REPLACE VIEW zone_progress AS
WITH zone_stats AS (
  SELECT 
    zone,
    COUNT(DISTINCT CASE WHEN address IS NOT NULL THEN address END) as home_count,
    COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) as permissions,
    COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) as poles,
    COUNT(DISTINCT CASE WHEN status = 'Home Installation: In Progress' THEN pole_number END) as stringing,
    COUNT(DISTINCT CASE WHEN status LIKE 'Home Sign Ups:%' THEN address END) as signups,
    COUNT(DISTINCT CASE WHEN status = 'Home Installation: Installed' THEN address END) as installations,
    COUNT(DISTINCT CASE WHEN permission_date IS NOT NULL THEN pole_number END) as pole_permissions_with_date,
    COUNT(DISTINCT CASE WHEN signup_date IS NOT NULL THEN address END) as signups_with_date
  FROM status_changes
  WHERE zone IS NOT NULL
  GROUP BY zone
)
SELECT 
  zone,
  home_count,
  permissions,
  poles,
  stringing,
  signups,
  installations,
  CASE 
    WHEN home_count > 0 THEN ROUND((signups::numeric / home_count::numeric * 100)::numeric, 2)
    ELSE 0 
  END as signup_percentage,
  CASE 
    WHEN home_count > 0 THEN ROUND((installations::numeric / home_count::numeric * 100)::numeric, 2)
    ELSE 0 
  END as installation_percentage
FROM zone_stats
ORDER BY zone;