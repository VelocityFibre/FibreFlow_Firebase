-- Analyze status changes between August 1 and August 2 data
WITH status_comparison AS (
  SELECT 
    s.property_id,
    s.pole_number,
    s.drop_number,
    c.status as old_status,
    s.status as new_status,
    s.status_date,
    s.agent,
    s.address,
    CASE 
      WHEN c.property_id IS NULL THEN 'new'
      WHEN c.status != s.status THEN 'update'
      ELSE 'duplicate'
    END as change_type,
    -- Check for concerning patterns
    CASE
      WHEN c.status = 'Home Installation: Installed' AND s.status = 'Home Installation: In Progress' THEN 'revert'
      WHEN c.status LIKE '%Declined%' AND s.status LIKE '%In Progress%' THEN 'bypassed_approval'
      WHEN c.status != s.status THEN 'normal'
      ELSE NULL
    END as change_category
  FROM status_changes_staging s
  LEFT JOIN status_changes c ON s.property_id = c.property_id
)
SELECT 
  change_type,
  COUNT(*) as count,
  COUNT(CASE WHEN change_category = 'revert' THEN 1 END) as reverts,
  COUNT(CASE WHEN change_category = 'bypassed_approval' THEN 1 END) as bypassed
FROM status_comparison
GROUP BY change_type;