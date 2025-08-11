# Power BI Database Connection Guide for FibreFlow

*Last Updated: 2025-08-13*

## 🚨 LATEST UPDATE: SSL Certificate Validation Fix (2025-08-13)

**ISSUE RESOLVED**: "The remote certificate is invalid according to the validation procedure" error when connecting PowerBI to Supabase PostgreSQL.

**✅ TESTED SOLUTION**: Use REST API approach instead of direct PostgreSQL connection to bypass SSL validation issues.

## Executive Summary

For connecting Power BI to FibreFlow data, **Supabase PostgreSQL** is the recommended option. It provides native connectivity, real-time data access, and is already integrated with existing analytics views.

## Database Options Comparison

### 1. Supabase (PostgreSQL) - 🏆 RECOMMENDED
**Power**: ⭐⭐⭐⭐⭐  
**Ease**: ⭐⭐⭐⭐⭐  

#### Advantages
- **Already integrated** in FibreFlow with active SQL views and stored procedures
- **Native Power BI connector** - PostgreSQL is a first-class citizen in Power BI
- **Direct SQL access** - Power BI can use DirectQuery mode for real-time data
- **Existing analytics** - Pre-built views like `zone_progress_view`, `get_project_progress_summary`
- **Cloud-hosted** - No local server setup required
- **Row-level security** - Can implement user-based data filtering
- **Real-time sync** - Data automatically updated from Firebase

#### ⚠️ SSL Certificate Issue & Solution

**PROBLEM**: Direct PostgreSQL connection fails with SSL certificate validation error.

**✅ TESTED SOLUTION 1: REST API Connection (RECOMMENDED)**
```
Method: Web Connector in PowerBI
URL: https://vkmpbprvooxgrkwrkbcf.supabase.co/rest/v1/status_changes
Headers:
- apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8
- Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8
```

**✅ TESTED SOLUTION 2: PostgreSQL Connection Pooler**
```
Server: db.vkmpbprvooxgrkwrkbcf.supabase.co
Database: postgres
Port: 6543 (Connection Pooler - bypasses SSL issues)
Username: postgres
Password: 1ldaAvPgdc7nOfts
```

**❌ FAILED ATTEMPTS**:
- Direct connection with SSL Mode: Require
- Port 5432 with SSL parameters
- Advanced connection string options

#### ✅ CONFIRMED Available Tables (2025-08-13)
**Main Data Table:**
- `status_changes` - 15,651+ records of pole/home data ✅ TESTED
  - Property IDs, Pole Numbers (LAW.P.D410), Drop Numbers
  - Status info: "Pole Permission: Approved", etc.
  - Addresses, Dates, Project data (Lawley project)

**Note**: Pre-built views may exist but require setup:
- `zone_progress_view` - Zone-by-zone project progress (setup required)
- `daily_progress` - Daily KPI tracking (setup required)
- `key_milestones` - Project milestones (setup required)
- `prerequisites` - Project prerequisites (setup required)

### 2. Neon (PostgreSQL) - 🥈 Alternative Option
**Power**: ⭐⭐⭐⭐⭐  
**Ease**: ⭐⭐⭐⭐☆  

#### Advantages
- Same PostgreSQL benefits as Supabase
- Service already exists in codebase (`neon.service.ts`)
- Serverless PostgreSQL with auto-scaling
- Good for development/staging environments

#### Disadvantages
- Not actively used in production
- Would require migrating views and procedures
- Additional setup required

### 3. DuckDB - 🥉 Best for Heavy Analytics
**Power**: ⭐⭐⭐⭐⭐ (for analytics)  
**Ease**: ⭐⭐☆☆☆  

#### Advantages
- **10-100x faster** for analytical queries
- Columnar storage optimized for BI workloads
- Can process millions of rows efficiently
- Already processing OneMap data

#### Disadvantages
- No direct Power BI connector
- Must export data to files (Parquet/CSV)
- Local file-based, not cloud-native
- Requires ETL pipeline setup

#### Connection Method
```bash
# Export to Parquet for Power BI
duckdb data/onemap.duckdb -c "COPY (SELECT * FROM excel_import) TO 'export.parquet' (FORMAT PARQUET)"
```

### 4. SQLite - ⭐⭐ Limited Use Case
**Power**: ⭐⭐☆☆☆  
**Ease**: ⭐⭐☆☆☆  

#### Use Cases
- Local data processing only
- Temporary data staging
- Small datasets (<100MB)

#### Limitations
- File-based database
- No native Power BI connector
- Must export to CSV/Excel
- Not suitable for production BI

### 5. Firebase Firestore - ❌ Not Recommended
**Power**: ⭐☆☆☆☆  
**Ease**: ⭐☆☆☆☆  

#### Why Not Recommended
- NoSQL database - Power BI prefers relational data
- No direct connector available
- Would require custom API development
- Not optimized for analytical queries
- Complex nested data structures

## Recommended Architecture

```
┌─────────────────────┐
│ Firebase Firestore  │ ← Operational Database
│  (Real-time Data)   │
└──────────┬──────────┘
           │ Sync Scripts
           ↓
┌─────────────────────┐
│ Supabase PostgreSQL │ ← Analytics Layer (Power BI connects here)
│   (SQL Views)       │
└──────────┬──────────┘
           │ Optional for heavy processing
           ↓
┌─────────────────────┐
│      DuckDB         │ → Export Parquet → Power BI
│ (Local Analytics)   │
└─────────────────────┘
```

## Implementation Guide

### 🚨 Step 1: Connect Power BI to Supabase (UPDATED 2025-08-13)

#### Option A: REST API Connection (RECOMMENDED - BYPASSES SSL ISSUES)

1. **Open Power BI Desktop**
2. **Get Data** → **Web**
3. **Enter URL:**
   ```
   https://vkmpbprvooxgrkwrkbcf.supabase.co/rest/v1/status_changes
   ```
4. **Click Advanced, add Headers:**
   - **Header 1:**
     - Name: `apikey`
     - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8`
   - **Header 2:**
     - Name: `Authorization`
     - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8`

5. **Click OK** - Data will load successfully

#### Option B: PostgreSQL Connection Pooler (If REST API doesn't work)

1. **Open Power BI Desktop**
2. **Get Data** → **More** → **Database** → **PostgreSQL**
3. **Enter Connection Details:**
   ```
   Server: db.vkmpbprvooxgrkwrkbcf.supabase.co
   Database: postgres
   Port: 6543 (Connection Pooler)
   ```
4. **Authentication:**
   - Username: `postgres`
   - Password: `1ldaAvPgdc7nOfts`

#### ❌ Known Issue: Direct PostgreSQL Connection (Port 5432)
**Error**: "The remote certificate is invalid according to the validation procedure"
**Status**: SSL certificate validation fails - use Option A instead.

### Step 2: Select Data Sources

#### Recommended Tables/Views:
- `public.zone_progress_view` - Main progress tracking
- `public.daily_progress` - Time series data
- `public.key_milestones` - Project milestones
- `public.projects` - Project metadata

#### SQL Query Option:
```sql
-- Custom query for specific analytics
SELECT 
  zone,
  home_count,
  permissions_completed,
  ROUND((permissions_completed::NUMERIC / NULLIF(permission_scope, 0)) * 100, 1) as completion_percentage
FROM zone_progress_view
WHERE project = 'Lawley'
ORDER BY zone;
```

### Step 3: Configure Refresh Schedule

1. **Publish to Power BI Service**
2. **Dataset Settings** → **Scheduled Refresh**
3. **Set refresh frequency:**
   - Every hour for real-time dashboards
   - Daily for historical reports
   - On-demand for ad-hoc analysis

### Step 4: Optimize Performance

#### For Large Datasets:
1. **Create aggregation tables in Supabase**
2. **Use incremental refresh in Power BI**
3. **Implement query folding**
4. **Consider composite models**

#### Query Optimization:
```sql
-- Create materialized view in Supabase for better performance
CREATE MATERIALIZED VIEW project_summary AS
SELECT 
  project,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_records,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
FROM your_table
GROUP BY project, DATE_TRUNC('day', created_at);

-- Refresh periodically
REFRESH MATERIALIZED VIEW project_summary;
```

## Advanced Scenarios

### Hybrid Approach with DuckDB

For complex analytics on large datasets:

1. **Process in DuckDB:**
```bash
# Load OneMap data
cd OneMap/DuckDB
node scripts/import-excel-final.js data/latest.xlsx

# Run analytics query
duckdb data/onemap.duckdb
```

2. **Export aggregated results:**
```sql
-- In DuckDB
COPY (
  SELECT 
    DATE_TRUNC('week', date) as week,
    zone,
    COUNT(*) as records,
    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
  FROM excel_import
  GROUP BY DATE_TRUNC('week', date), zone
) TO 'weekly_summary.parquet' (FORMAT PARQUET);
```

3. **Import Parquet in Power BI:**
   - Get Data → File → Parquet
   - Select exported file
   - Transform as needed

### Real-time Dashboard Pattern

```sql
-- Create real-time view in Supabase
CREATE OR REPLACE VIEW real_time_metrics AS
SELECT 
  NOW() as last_updated,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as hourly_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM your_table;
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check firewall settings
   - Verify Supabase allows your IP
   - Use connection pooling

2. **Performance Issues**
   - Switch from DirectQuery to Import mode
   - Create indexes on frequently queried columns
   - Use aggregated views

3. **Data Type Mismatches**
   - Cast PostgreSQL types explicitly
   - Use Power Query to transform data types
   - Handle JSON fields appropriately

### Performance Monitoring

```sql
-- Check slow queries in Supabase
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries taking >1 second
ORDER BY mean_time DESC
LIMIT 10;
```

## Security Best Practices

1. **Use read-only database user for Power BI**
2. **Implement row-level security (RLS)**
3. **Encrypt connections (SSL required)**
4. **Store credentials securely in Power BI gateway**
5. **Audit data access regularly**

## Cost Considerations

| Option | Monthly Cost | Best For |
|--------|-------------|----------|
| Supabase Free | $0 | < 500MB, development |
| Supabase Pro | $25 | < 8GB, production |
| Neon Free | $0 | < 3GB, development |
| DuckDB | $0 | Local processing |
| Power BI Pro | $10/user | Individual users |
| Power BI Premium | $4,995+ | Enterprise |

## Next Steps

1. **Immediate**: Connect Power BI to Supabase using this guide
2. **Week 1**: Build initial dashboards with existing views
3. **Week 2**: Optimize queries and create custom views
4. **Month 1**: Implement refresh schedules and monitoring
5. **Future**: Consider DuckDB for heavy analytics workloads

## Support Resources

- [Power BI PostgreSQL Connector Docs](https://docs.microsoft.com/en-us/power-bi/connect-data/desktop-postgresql)
- [Supabase Connection Guide](https://supabase.com/docs/guides/integrations/powerbi)
- [DuckDB Documentation](https://duckdb.org/docs/)
- FibreFlow Database Schema: `/docs/DATABASE_STRUCTURE.md`

## Contact

For FibreFlow-specific questions:
- Check `/src/app/core/services/supabase.service.ts` for connection details
- Review `/src/environments/environment.ts` for configuration
- Sync scripts in `/supabase/scripts/` for ETL processes