-- Create daily_progress view for analytics dashboard
CREATE OR REPLACE VIEW daily_progress AS
WITH daily_stats AS (
  SELECT 
    DATE(COALESCE(permission_date, created_at)) as progress_date,
    COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' AND DATE(permission_date) = DATE(COALESCE(permission_date, created_at)) THEN pole_number END) as permissions,
    COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' AND DATE(permission_date) = DATE(COALESCE(permission_date, created_at)) THEN pole_number END) as poles_planted,
    COUNT(DISTINCT CASE WHEN status LIKE 'Home Sign Ups:%' AND DATE(signup_date) = DATE(COALESCE(permission_date, created_at)) THEN address END) as sign_ups,
    COUNT(DISTINCT CASE WHEN status = 'Home Installation: Installed' AND DATE(installation_date) = DATE(COALESCE(permission_date, created_at)) THEN address END) as installations
  FROM status_changes
  WHERE COALESCE(permission_date, created_at) IS NOT NULL
  GROUP BY DATE(COALESCE(permission_date, created_at))
)
SELECT 
  progress_date,
  permissions,
  poles_planted,
  sign_ups,
  installations,
  SUM(permissions) OVER (ORDER BY progress_date) as cumulative_permissions,
  SUM(poles_planted) OVER (ORDER BY progress_date) as cumulative_poles,
  SUM(sign_ups) OVER (ORDER BY progress_date) as cumulative_signups,
  SUM(installations) OVER (ORDER BY progress_date) as cumulative_installations
FROM daily_stats
WHERE progress_date IS NOT NULL
ORDER BY progress_date DESC;