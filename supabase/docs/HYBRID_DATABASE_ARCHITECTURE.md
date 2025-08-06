# Hybrid Database Architecture: Firebase + Supabase

## Overview
FibreFlow uses a hybrid database approach:
- **Firebase Firestore**: Primary database for real-time operations
- **Supabase PostgreSQL**: Analytics and reporting for complex queries

## When to Use Each Database

### Firebase (Existing)
- Real-time updates (projects, tasks, staff)
- Document-based data (BOQ, contractors)
- User authentication
- File storage
- Simple CRUD operations

### Supabase (New for Analytics)
- Complex SQL queries with JOINs
- Aggregations and summaries
- Time-series analysis
- Cross-table reporting
- Data warehousing

## Architecture

```
FibreFlow App
│
├── Regular Pages
│   └── Firebase Service → Firestore
│
└── Analytics Pages
    └── Supabase Service → PostgreSQL
        └── SQL Views for:
            - Project Progress Summary
            - Zone Analytics
            - Agent Performance
            - Daily Trends
```

## Benefits of This Approach

1. **Best of Both Worlds**
   - Firebase: Real-time, offline support
   - Supabase: SQL power, complex analytics

2. **Performance**
   - Heavy queries don't impact main app
   - Optimized indexes for analytics

3. **Scalability**
   - Analytics can scale independently
   - Can add read replicas if needed

4. **Developer Experience**
   - SQL for complex reports
   - NoSQL for app features

## Implementation Example

### Supabase Query (Progress Summary)
```sql
WITH zone_summary AS (
  SELECT 
    zone,
    COUNT(DISTINCT pole_number) as total_poles,
    COUNT(DISTINCT CASE WHEN status = 'Approved' THEN pole_number END) as approved_poles,
    COUNT(DISTINCT CASE WHEN status = 'Installed' THEN property_id END) as installed_homes
  FROM status_changes
  WHERE project = 'Lawley'
  GROUP BY zone
)
SELECT 
  zone,
  total_poles,
  approved_poles,
  ROUND(approved_poles::numeric / NULLIF(total_poles, 0) * 100, 1) as approval_percentage,
  installed_homes
FROM zone_summary
ORDER BY zone;
```

### Firebase Query (Simple Lookup)
```typescript
// Still use Firebase for simple queries
this.firestore.collection('projects')
  .doc(projectId)
  .valueChanges();
```

## Data Sync Strategy

1. **OneMap SQL → Supabase**
   - Daily ETL process
   - Incremental updates
   - Data validation

2. **Supabase Views**
   - Pre-calculated summaries
   - Materialized views for performance
   - Real-time triggers for updates

3. **Caching**
   - Client-side caching for analytics
   - 5-minute cache for dashboards
   - Manual refresh option

## Security

- Supabase Row Level Security (RLS)
- API key in environment variables
- Read-only access for analytics
- Same auth token as Firebase

## Next Steps

1. Set up Supabase project
2. Create database schema
3. Migrate OneMap data
4. Build Angular service
5. Create Progress Summary page