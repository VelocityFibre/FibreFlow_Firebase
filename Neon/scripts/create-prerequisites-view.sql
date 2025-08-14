-- Create prerequisites view for analytics dashboard
CREATE OR REPLACE VIEW prerequisites AS
SELECT 
  'Pole Permissions' as prerequisite,
  COUNT(DISTINCT pole_number) as completed,
  5000 as target,
  ROUND((COUNT(DISTINCT pole_number)::numeric / 5000 * 100)::numeric, 2) as percentage,
  CASE WHEN COUNT(DISTINCT pole_number) >= 5000 THEN true ELSE false END as met
FROM status_changes
WHERE status = 'Pole Permission: Approved'

UNION ALL

SELECT 
  'Home Sign Ups' as prerequisite,
  COUNT(DISTINCT address) as completed,
  10000 as target,
  ROUND((COUNT(DISTINCT address)::numeric / 10000 * 100)::numeric, 2) as percentage,
  CASE WHEN COUNT(DISTINCT address) >= 10000 THEN true ELSE false END as met
FROM status_changes
WHERE status LIKE 'Home Sign Ups:%'

UNION ALL

SELECT 
  'Contractor Assignments' as prerequisite,
  COUNT(DISTINCT agent_name) as completed,
  10 as target,
  ROUND((COUNT(DISTINCT agent_name)::numeric / 10 * 100)::numeric, 2) as percentage,
  CASE WHEN COUNT(DISTINCT agent_name) >= 10 THEN true ELSE false END as met
FROM status_changes
WHERE agent_name IS NOT NULL

UNION ALL

SELECT 
  'Zone Coverage' as prerequisite,
  COUNT(DISTINCT zone) as completed,
  20 as target,
  ROUND((COUNT(DISTINCT zone)::numeric / 20 * 100)::numeric, 2) as percentage,
  CASE WHEN COUNT(DISTINCT zone) >= 20 THEN true ELSE false END as met
FROM status_changes
WHERE zone IS NOT NULL;