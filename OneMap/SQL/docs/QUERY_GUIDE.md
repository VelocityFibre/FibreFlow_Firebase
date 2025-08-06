# OneMap SQL Query Guide
*Date: 2025/08/06*

## Overview
Common SQL queries for analyzing OneMap data. Use these directly in the custom query option or as templates for new analyses.

## Basic Queries

### 1. Count Total Records
```sql
SELECT COUNT(*) as total_records 
FROM status_changes;
```

### 2. Unique Poles and Drops
```sql
SELECT 
  COUNT(DISTINCT pole_number) as unique_poles,
  COUNT(DISTINCT drop_number) as unique_drops,
  COUNT(DISTINCT property_id) as unique_properties
FROM status_changes
WHERE pole_number IS NOT NULL;
```

### 3. Date Range of Data
```sql
SELECT 
  MIN(status_date) as earliest_date,
  MAX(status_date) as latest_date,
  CAST(julianday(MAX(status_date)) - julianday(MIN(status_date)) AS INTEGER) as days_span
FROM status_changes;
```

## Pole Analysis Queries

### 4. First Approval Per Pole
```sql
SELECT 
  pole_number,
  MIN(status_date) as first_approval_date,
  agent as first_approval_agent
FROM status_changes
WHERE status LIKE '%Approved%'
  AND pole_number IS NOT NULL
GROUP BY pole_number
ORDER BY first_approval_date DESC
LIMIT 100;
```

### 5. Poles with Most Drops
```sql
SELECT 
  pole_number,
  COUNT(DISTINCT drop_number) as drop_count,
  COUNT(DISTINCT property_id) as property_count,
  GROUP_CONCAT(DISTINCT agent) as agents_involved
FROM status_changes
WHERE pole_number IS NOT NULL
GROUP BY pole_number
HAVING drop_count > 0
ORDER BY drop_count DESC
LIMIT 20;
```

### 6. Pole Capacity Utilization
```sql
SELECT 
  pole_number,
  COUNT(DISTINCT drop_number) as drops_used,
  12 as max_capacity,
  12 - COUNT(DISTINCT drop_number) as drops_available,
  ROUND(COUNT(DISTINCT drop_number) * 100.0 / 12, 2) as utilization_percent
FROM status_changes
WHERE pole_number IS NOT NULL
GROUP BY pole_number
HAVING drops_used > 8  -- Show poles over 66% capacity
ORDER BY utilization_percent DESC;
```

## Agent Performance Queries

### 7. Agent Productivity Summary
```sql
SELECT 
  agent,
  COUNT(DISTINCT pole_number) as poles_handled,
  COUNT(DISTINCT drop_number) as drops_handled,
  COUNT(*) as total_actions,
  DATE(MIN(status_date)) as first_action,
  DATE(MAX(status_date)) as last_action,
  CAST(julianday(MAX(status_date)) - julianday(MIN(status_date)) AS INTEGER) as days_active
FROM status_changes
WHERE agent IS NOT NULL AND agent != ''
GROUP BY agent
ORDER BY poles_handled DESC;
```

### 8. Agent Daily Activity
```sql
SELECT 
  agent,
  DATE(status_date) as work_date,
  COUNT(DISTINCT pole_number) as poles_touched,
  COUNT(*) as actions_performed
FROM status_changes
WHERE agent IS NOT NULL
  AND status_date >= date('now', '-30 days')
GROUP BY agent, DATE(status_date)
ORDER BY work_date DESC, actions_performed DESC;
```

### 9. Top Performing Agents (Last Month)
```sql
SELECT 
  agent,
  COUNT(DISTINCT pole_number) as poles_approved,
  COUNT(DISTINCT DATE(status_date)) as days_worked,
  ROUND(COUNT(DISTINCT pole_number) * 1.0 / COUNT(DISTINCT DATE(status_date)), 2) as avg_poles_per_day
FROM status_changes
WHERE status LIKE '%Approved%'
  AND status_date >= date('now', '-30 days')
  AND agent IS NOT NULL
GROUP BY agent
HAVING days_worked > 5  -- At least 5 working days
ORDER BY avg_poles_per_day DESC
LIMIT 10;
```

## Time-Based Analysis

### 10. Monthly Summary
```sql
SELECT 
  strftime('%Y-%m', status_date) as month,
  COUNT(DISTINCT pole_number) as poles_processed,
  COUNT(DISTINCT drop_number) as drops_processed,
  COUNT(DISTINCT agent) as active_agents,
  COUNT(*) as total_changes
FROM status_changes
WHERE status_date IS NOT NULL
GROUP BY strftime('%Y-%m', status_date)
ORDER BY month DESC;
```

### 11. Weekly Progress
```sql
SELECT 
  strftime('%Y-W%W', status_date) as week,
  COUNT(DISTINCT pole_number) as poles,
  COUNT(DISTINCT drop_number) as drops,
  COUNT(DISTINCT agent) as agents
FROM status_changes
WHERE status_date >= date('now', '-90 days')
GROUP BY strftime('%Y-W%W', status_date)
ORDER BY week DESC;
```

### 12. Daily Trend (Last 30 Days)
```sql
SELECT 
  DATE(status_date) as date,
  COUNT(DISTINCT pole_number) as poles,
  COUNT(*) as total_actions,
  CASE 
    WHEN strftime('%w', status_date) = '0' THEN 'Sunday'
    WHEN strftime('%w', status_date) = '1' THEN 'Monday'
    WHEN strftime('%w', status_date) = '2' THEN 'Tuesday'
    WHEN strftime('%w', status_date) = '3' THEN 'Wednesday'
    WHEN strftime('%w', status_date) = '4' THEN 'Thursday'
    WHEN strftime('%w', status_date) = '5' THEN 'Friday'
    WHEN strftime('%w', status_date) = '6' THEN 'Saturday'
  END as day_of_week
FROM status_changes
WHERE status_date >= date('now', '-30 days')
GROUP BY DATE(status_date)
ORDER BY date DESC;
```

## Status Analysis

### 13. Status Distribution
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM status_changes), 2) as percentage,
  COUNT(DISTINCT pole_number) as unique_poles
FROM status_changes
GROUP BY status
ORDER BY count DESC;
```

### 14. Status Transition Pattern
```sql
WITH status_ordered AS (
  SELECT 
    pole_number,
    status,
    status_date,
    ROW_NUMBER() OVER (PARTITION BY pole_number ORDER BY status_date) as seq
  FROM status_changes
  WHERE pole_number IS NOT NULL
)
SELECT 
  a.status as from_status,
  b.status as to_status,
  COUNT(*) as transition_count
FROM status_ordered a
JOIN status_ordered b ON a.pole_number = b.pole_number 
  AND b.seq = a.seq + 1
GROUP BY a.status, b.status
ORDER BY transition_count DESC
LIMIT 20;
```

## Data Quality Queries

### 15. Find Duplicates
```sql
SELECT 
  pole_number,
  drop_number,
  status,
  status_date,
  COUNT(*) as duplicate_count
FROM status_changes
GROUP BY pole_number, drop_number, status, status_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### 16. Missing Data Analysis
```sql
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN pole_number IS NULL OR pole_number = '' THEN 1 ELSE 0 END) as missing_pole,
  SUM(CASE WHEN drop_number IS NULL OR drop_number = '' THEN 1 ELSE 0 END) as missing_drop,
  SUM(CASE WHEN agent IS NULL OR agent = '' THEN 1 ELSE 0 END) as missing_agent,
  SUM(CASE WHEN status_date IS NULL THEN 1 ELSE 0 END) as missing_date
FROM status_changes;
```

### 17. Data Validation Issues
```sql
-- Find poles with > 12 drops (capacity violation)
SELECT 
  pole_number,
  COUNT(DISTINCT drop_number) as drop_count
FROM status_changes
WHERE pole_number IS NOT NULL
GROUP BY pole_number
HAVING drop_count > 12;

-- Find drops without poles
SELECT 
  COUNT(DISTINCT drop_number) as orphan_drops
FROM status_changes
WHERE (pole_number IS NULL OR pole_number = '')
  AND drop_number IS NOT NULL;
```

## Zone/Area Analysis

### 18. Zone Performance
```sql
SELECT 
  zone,
  COUNT(DISTINCT pole_number) as poles,
  COUNT(DISTINCT drop_number) as drops,
  COUNT(DISTINCT agent) as agents
FROM status_changes
WHERE zone IS NOT NULL
GROUP BY zone
ORDER BY poles DESC;
```

### 19. Feeder Distribution
```sql
SELECT 
  feeder,
  COUNT(DISTINCT pole_number) as poles,
  COUNT(DISTINCT property_id) as properties
FROM status_changes
WHERE feeder IS NOT NULL
GROUP BY feeder
ORDER BY poles DESC;
```

## Advanced Analytics

### 20. Pole Completion Timeline
```sql
-- Time from first to last status change per pole
SELECT 
  pole_number,
  MIN(status_date) as first_status,
  MAX(status_date) as last_status,
  CAST(julianday(MAX(status_date)) - julianday(MIN(status_date)) AS INTEGER) as days_to_complete,
  COUNT(DISTINCT status) as status_count
FROM status_changes
WHERE pole_number IS NOT NULL
GROUP BY pole_number
HAVING days_to_complete > 0
ORDER BY days_to_complete DESC
LIMIT 50;
```

## Using These Queries

### In CLI
```bash
# Run custom query
node src/cli.js analyze
# Select "Custom SQL Query"
# Paste query
```

### Export Results
After running any query, you can export to:
- Excel (.xlsx)
- CSV (.csv)
- JSON (.json)

### Performance Tips
1. Always use indexes (pole_number, drop_number, status_date)
2. Limit results with `LIMIT` clause
3. Use `WHERE` to filter early
4. Avoid `SELECT *` - specify columns

### Common Modifications
- Change date ranges: `status_date >= date('now', '-X days')`
- Filter by status: `WHERE status LIKE '%Approved%'`
- Limit results: `LIMIT 100`
- Order differently: `ORDER BY column DESC/ASC`