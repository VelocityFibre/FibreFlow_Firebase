-- Create key_milestones view for analytics dashboard
CREATE OR REPLACE VIEW key_milestones AS
WITH milestone_data AS (
  SELECT 
    'First Pole Permission' as milestone,
    MIN(permission_date) as milestone_date,
    'Pole Permission: Approved' as status,
    1 as display_order
  FROM status_changes
  WHERE status = 'Pole Permission: Approved' AND permission_date IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'First Home Sign Up' as milestone,
    MIN(signup_date) as milestone_date,
    'Home Sign Ups' as status,
    2 as display_order
  FROM status_changes
  WHERE status LIKE 'Home Sign Ups:%' AND signup_date IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'First Installation' as milestone,
    MIN(installation_date) as milestone_date,
    'Home Installation: Installed' as status,
    3 as display_order
  FROM status_changes
  WHERE status = 'Home Installation: Installed' AND installation_date IS NOT NULL
  
  UNION ALL
  
  SELECT 
    '1000th Pole Permission' as milestone,
    permission_date as milestone_date,
    'Pole Permission: Approved' as status,
    4 as display_order
  FROM (
    SELECT permission_date, ROW_NUMBER() OVER (ORDER BY permission_date) as rn
    FROM (
      SELECT DISTINCT pole_number, permission_date
      FROM status_changes
      WHERE status = 'Pole Permission: Approved' AND permission_date IS NOT NULL
    ) t
  ) t2
  WHERE rn = 1000
  
  UNION ALL
  
  SELECT 
    '100th Installation' as milestone,
    installation_date as milestone_date,
    'Home Installation: Installed' as status,
    5 as display_order
  FROM (
    SELECT installation_date, ROW_NUMBER() OVER (ORDER BY installation_date) as rn
    FROM (
      SELECT DISTINCT address, installation_date
      FROM status_changes
      WHERE status = 'Home Installation: Installed' AND installation_date IS NOT NULL
    ) t
  ) t2
  WHERE rn = 100
)
SELECT 
  milestone,
  milestone_date,
  status,
  CASE WHEN milestone_date <= CURRENT_DATE THEN true ELSE false END as achieved
FROM milestone_data
WHERE milestone_date IS NOT NULL
ORDER BY display_order;