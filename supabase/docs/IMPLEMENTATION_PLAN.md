# Supabase Integration Implementation Plan

## Overview
This document outlines the steps to implement the Lawley Project Progress Summary page in FibreFlow using Supabase for analytics.

## Current Status

### ✅ Completed
1. Created directory structure under `/supabase/`
2. Created Supabase service with all necessary methods
3. Built Angular component for Progress Summary page
4. Added routing configuration
5. Created SQL views for Supabase
6. Documented hybrid database strategy

### 📍 Files Created
- `/supabase/services/supabase.service.ts` - Main service
- `/supabase/sql/create_progress_views.sql` - SQL views
- `/src/app/features/analytics/pages/project-progress-summary/` - Component files
- `/src/app/core/services/supabase.service.ts` - Service copy in core
- `/docs/FIREBASE_SUPABASE_HYBRID_STRATEGY.md` - Architecture doc

## Next Steps

### 1. Set Up Supabase Project
```bash
# Go to https://supabase.com
# Create new project
# Get these values:
- Project URL: https://xxxxxxxxxxxx.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Update Environment Configuration
Add to `/src/environments/environment.ts`:
```typescript
export const environment = {
  // ... existing config
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 3. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 4. Migrate OneMap SQL Data to Supabase

#### Option A: Direct SQL Import
1. Export OneMap SQLite data:
```bash
cd OneMap/SQL/scripts
sqlite3 ../database/onemap.db .dump > onemap_export.sql
```

2. Import to Supabase via SQL Editor in dashboard

#### Option B: Use Migration Script
Create `/OneMap/SQL/scripts/migrate-to-supabase.js`:
```javascript
const sqlite3 = require('sqlite3');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('YOUR_URL', 'YOUR_KEY');
// Migration logic here
```

### 5. Create SQL Views in Supabase
Run the SQL from `/supabase/sql/create_progress_views.sql` in Supabase SQL Editor

### 6. Test the Integration
1. Navigate to: `/analytics/project-progress`
2. Verify data loads correctly
3. Check all tabs display proper information

## Data Flow Architecture

```
OneMap SQLite Database
        ↓
Daily ETL Process (cron job)
        ↓
Supabase PostgreSQL
        ↓
SQL Views (pre-calculated)
        ↓
FibreFlow Angular App
        ↓
Progress Summary Dashboard
```

## Security Considerations

1. **Row Level Security (RLS)**
   - Enable RLS on all tables
   - Create policies for read-only access

2. **API Keys**
   - Use anon key for client
   - Service key only for ETL

3. **Data Privacy**
   - No sensitive data in analytics
   - Aggregate data only

## Performance Optimization

1. **Materialized Views**
   ```sql
   CREATE MATERIALIZED VIEW zone_progress_cached AS
   SELECT * FROM zone_progress_detail;
   
   -- Refresh daily
   REFRESH MATERIALIZED VIEW zone_progress_cached;
   ```

2. **Indexes**
   ```sql
   CREATE INDEX idx_status_changes_project ON status_changes(project);
   CREATE INDEX idx_status_changes_zone ON status_changes(zone);
   CREATE INDEX idx_status_changes_date ON status_changes(status_date);
   ```

3. **Client-Side Caching**
   - 5-minute cache for dashboard data
   - Manual refresh button available

## Monitoring & Maintenance

1. **Daily Tasks**
   - Sync data from OneMap
   - Refresh materialized views
   - Check data integrity

2. **Weekly Tasks**
   - Review query performance
   - Check storage usage
   - Backup Supabase data

3. **Monthly Tasks**
   - Optimize slow queries
   - Archive old data
   - Review access logs

## Troubleshooting

### Common Issues

1. **No data showing**
   - Check Supabase connection
   - Verify environment variables
   - Check browser console for errors

2. **Slow performance**
   - Check if views are indexed
   - Consider materialized views
   - Review query complexity

3. **Authentication errors**
   - Verify API keys
   - Check RLS policies
   - Review CORS settings

## Future Enhancements

1. **Real-time Updates**
   - Use Supabase realtime subscriptions
   - Live dashboard updates

2. **Export Features**
   - Excel export functionality
   - PDF report generation

3. **Custom Queries**
   - Query builder interface
   - Save custom reports

4. **Mobile App**
   - Progress summary on mobile
   - Offline support with sync

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Angular Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/angular)
- [SQL Views Tutorial](https://supabase.com/docs/guides/database/views)
- OneMap SQL Documentation: `/OneMap/SQL/README.md`