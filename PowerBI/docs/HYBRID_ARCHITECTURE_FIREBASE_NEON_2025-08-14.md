# Hybrid Architecture: Firebase + Neon for PowerBI
*Date: 2025-08-14*

## Executive Summary

This document outlines the optimal long-term architecture for FibreFlow that maintains Firebase's operational advantages while providing a stable, unified data connection for PowerBI reporting through Neon PostgreSQL.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Best of Both Worlds                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FibreFlow App (Angular)                                      │
│      ↓                                                        │
│  Firebase (Operations)                                        │
│  - Offline support ✓                                          │
│  - Real-time sync ✓                                          │
│  - Auth & Storage ✓                                          │
│      ↓                                                        │
│  Firebase Functions (Auto-sync)                               │
│      ↓                                                        │
│  ┌─────────────────────────────────────┐                    │
│  │         Neon PostgreSQL              │                    │
│  │                                      │                    │
│  │  Raw Tables:                         │                    │
│  │  - firebase_events (JSONB stream)    │                    │
│  │  - excel_imports (OneMap data)       │                    │
│  │                                      │                    │
│  │  BI Views:                           │                    │
│  │  - project_overview                  │                    │
│  │  - pole_status                       │                    │
│  │  - agent_performance                 │                    │
│  │  - installation_progress             │                    │
│  └─────────────────────────────────────┘                    │
│                     ↓                                         │
│              PowerBI (One Connection)                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

### 1. **Zero App Changes Required**
- FibreFlow continues using Firebase
- All offline features work
- Real-time sync maintained
- Authentication remains unchanged

### 2. **Single Stable Connection for PowerBI**
- PowerBI connects only to Neon
- Views abstract all complexity
- Schema changes don't break reports
- One set of credentials

### 3. **Complete Data Picture**
- Firebase operational data (real-time)
- OneMap historical imports
- Unified analytics views
- All data in one place

### 4. **Future-Proof Architecture**
- When Firebase schema changes, only update views
- PowerBI reports continue working
- No vendor lock-in
- Easy to extend

## Implementation Components

### 1. Firebase Function for Streaming

```typescript
// functions/src/stream-to-neon.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { Pool } from 'pg';

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL
});

// Stream ALL Firestore changes to Neon
export const streamToNeon = onDocumentWritten(
  '{collection}/{docId}',
  async (event) => {
    const { collection, docId } = event.params;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    
    // Insert event into Neon
    await neonPool.query(`
      INSERT INTO firebase_events (
        collection,
        document_id,
        event_type,
        before_data,
        after_data,
        timestamp,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [
      collection,
      docId,
      !beforeData ? 'create' : !afterData ? 'delete' : 'update',
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      JSON.stringify({
        projectId: afterData?.projectId,
        userId: event.auth?.uid
      })
    ]);
  }
);
```

### 2. Neon Database Schema

```sql
-- Raw event storage (never changes)
CREATE TABLE firebase_events (
  id BIGSERIAL PRIMARY KEY,
  collection VARCHAR(100),
  document_id VARCHAR(100),
  event_type VARCHAR(20),
  before_data JSONB,
  after_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for performance
CREATE INDEX idx_firebase_collection ON firebase_events(collection);
CREATE INDEX idx_firebase_timestamp ON firebase_events(timestamp);
CREATE INDEX idx_firebase_jsonb ON firebase_events USING GIN(after_data);
```

### 3. PowerBI-Ready Views

```sql
-- Smart view for projects (handles schema changes)
CREATE OR REPLACE VIEW bi_project_overview AS
SELECT 
  after_data->>'id' as project_id,
  after_data->>'projectCode' as project_code,
  after_data->>'name' as project_name,
  COALESCE(
    after_data->>'clientOrganization',
    after_data->>'clientName'
  ) as client,
  (after_data->>'budget')::NUMERIC as budget,
  after_data->>'status' as status,
  timestamp as last_updated
FROM firebase_events
WHERE collection = 'projects'
  AND event_type != 'delete'
  AND after_data IS NOT NULL
  AND timestamp = (
    SELECT MAX(timestamp)
    FROM firebase_events e2
    WHERE e2.collection = 'projects'
      AND e2.document_id = firebase_events.document_id
  );

-- Agent Performance Dashboard
CREATE MATERIALIZED VIEW bi_agent_performance AS
WITH agent_stats AS (
  SELECT 
    agent,
    DATE(last_updated) as work_date,
    COUNT(*) as poles_completed,
    COUNT(DISTINCT project_code) as projects_worked
  FROM bi_unified_status
  WHERE status ILIKE '%complete%' OR status ILIKE '%installed%'
  GROUP BY agent, DATE(last_updated)
)
SELECT 
  agent,
  work_date,
  poles_completed,
  projects_worked,
  SUM(poles_completed) OVER (
    PARTITION BY agent 
    ORDER BY work_date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as weekly_total,
  AVG(poles_completed) OVER (
    PARTITION BY agent 
    ORDER BY work_date 
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) as monthly_average
FROM agent_stats;
```

## PowerBI Connection Configuration

### Connection Details
```yaml
Host: ep-your-project.neon.tech
Database: neondb
Schema: public
Username: powerbi_reader
Password: [secure-password]
SSL Mode: require

# Available Tables/Views:
- bi_project_overview
- bi_pole_status  
- bi_agent_performance
- bi_unified_status
- bi_daily_completions
```

### What PowerBI Users See
```
PowerBI Desktop
  └── Data Source: Neon PostgreSQL
       └── Tables Available:
            ├── Project Overview (budget, progress, status)
            ├── Pole Status (all poles from all sources)
            ├── Agent Performance (daily/weekly/monthly)
            ├── Installation Progress (by zone/date)
            └── Custom Views (any new requirements)
```

## Handling Schema Changes

When Firebase schema changes, update only the view:

```sql
-- Example: Adding a new field
CREATE OR REPLACE VIEW bi_pole_status AS
SELECT 
  -- existing fields...
  after_data->>'poleNumber' as pole_number,
  after_data->>'status' as pole_status,
  -- NEW FIELD added without breaking PowerBI
  after_data->>'newFieldName' as new_field_name
FROM firebase_events
WHERE collection = 'planned-poles'
-- rest of query...
```

## Project Linking Strategy

### Current Situation
- Hein created project scope in Firebase (Law-001)
- OneMap data imports to Neon without project linkage
- Need to establish connection between systems

### Solution: Project Mapping

```sql
-- Create project mapping table
CREATE TABLE project_mappings (
  pole_prefix VARCHAR(10) PRIMARY KEY,
  firebase_project_id VARCHAR(50),
  project_code VARCHAR(20),
  project_name VARCHAR(100)
);

-- Insert mappings
INSERT INTO project_mappings VALUES 
('LAW', '6edHoC3ZakUTbXznbQ5a', 'Law-001', 'Lawley'),
('MOH', 'mohadin-id', 'MO-001', 'Mohadin');

-- Use in views
CREATE OR REPLACE VIEW bi_unified_pole_data AS
SELECT 
  p.*,
  pm.project_code,
  pm.project_name
FROM poles p
JOIN project_mappings pm 
  ON SUBSTRING(p.pole_number FROM '^([A-Z]+)') = pm.pole_prefix;
```

## Implementation Timeline

### Week 1: Foundation
1. Set up Firebase Function for streaming
2. Create Neon tables and base views
3. Test data flow Firebase → Neon
4. Create project mappings

### Week 2: Integration  
1. Connect OneMap imports to projects
2. Create unified views
3. Build PowerBI-ready views
4. Test with sample reports

### Week 3: Polish & Deploy
1. Add materialized views for performance
2. Create monitoring dashboard
3. Document for PowerBI users
4. Deploy to production

## Maintenance Considerations

### 1. View Updates
- When Firebase schema changes, update views
- Document all view changes
- Test in development first

### 2. Performance Monitoring
- Monitor query performance
- Refresh materialized views on schedule
- Add indexes as needed

### 3. Data Retention
- Archive old firebase_events after X months
- Keep aggregated data longer
- Implement data lifecycle policies

## Security Best Practices

1. **Read-Only Access for PowerBI**
   ```sql
   CREATE USER powerbi_reader WITH PASSWORD 'secure-password';
   GRANT CONNECT ON DATABASE neondb TO powerbi_reader;
   GRANT USAGE ON SCHEMA public TO powerbi_reader;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO powerbi_reader;
   ```

2. **Row-Level Security**
   - Implement RLS for multi-tenant scenarios
   - Filter data based on user roles

3. **Audit Trail**
   - All changes tracked in firebase_events
   - Complete history preserved

## Conclusion

This hybrid architecture provides:
- ✅ Continued Firebase advantages (offline, real-time)
- ✅ Single stable connection for PowerBI
- ✅ Complete data unification
- ✅ Future-proof design
- ✅ Minimal implementation effort

By streaming Firebase data to Neon and exposing it through stable views, we achieve the best of both worlds: operational excellence with Firebase and analytical power with PostgreSQL/PowerBI.