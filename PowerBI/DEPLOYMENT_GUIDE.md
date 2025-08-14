# PowerBI Integration Deployment Guide

## Complete Implementation for One Connection, Never Breaks

This guide will set up automatic Firebase → Neon synchronization with business-friendly views for PowerBI.

---

## 📋 Pre-Deployment Checklist

### 1. Neon Database Requirements
- [ ] Neon PostgreSQL database active
- [ ] Database credentials available
- [ ] Network access configured

### 2. Firebase Functions Setup
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] Project selected (`firebase use fibreflow-73daf`)

### 3. Required Information
- [ ] Neon host, database, username, password
- [ ] Password for PowerBI reader user

---

## 🚀 Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd functions
npm install pg @types/pg
```

### Step 2: Configure Neon Credentials

```bash
# Set Firebase Functions configuration
firebase functions:config:set neon.host="ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech"
firebase functions:config:set neon.database="neondb"
firebase functions:config:set neon.user="neondb_owner"
firebase functions:config:set neon.password="your_neon_password"
```

### Step 3: Set Up Database Schema

```bash
cd PowerBI
chmod +x setup-powerbi-integration.sh
./setup-powerbi-integration.sh
```

**Follow the prompts to:**
- Enter Neon database details
- Set PowerBI reader password
- Initialize tables and views

### Step 4: Deploy Firebase Functions

```bash
firebase deploy --only functions:syncToNeon,functions:retryFailedSyncs,functions:syncHealthCheck
```

### Step 5: Test the Integration

```bash
# Test database connection
./test-powerbi-connection.sh your_powerbi_password

# Check sync health
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/syncHealthCheck
```

### Step 6: Verify Data Flow

1. **Create a test document in Firebase**:
   ```javascript
   // In Firebase Console
   db.collection('status_changes').add({
     property_id: 'TEST001',
     status: 'Test Status',
     agent_name: 'Test Agent'
   });
   ```

2. **Check if it appears in Neon**:
   ```sql
   SELECT * FROM firebase_events WHERE collection = 'status_changes' ORDER BY sync_timestamp DESC LIMIT 5;
   SELECT * FROM bi_views.property_status WHERE "Property ID" = 'TEST001';
   ```

---

## 📊 PowerBI Setup for Lew

### Connection Details
```
Server: ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech
Database: neondb
Username: powerbi_reader
Password: [Password set during setup]
```

### Available Views
- `bi_views.property_status` - Main operational data
- `bi_views.project_summary` - Project overview
- `bi_views.agent_performance` - Agent metrics
- `bi_views.daily_kpis` - Daily KPIs
- `bi_views.meetings_action_items` - Meeting action items
- `bi_views.daily_summary` - Pre-aggregated daily stats

### PowerBI Connection Steps
1. Open PowerBI Desktop
2. Get Data → PostgreSQL database
3. Enter server and database details
4. Select Import mode
5. Choose views from `bi_views` schema
6. Load data and build dashboards

---

## 🔄 Ongoing Operations

### Daily Maintenance
**Automated:**
- ✅ Firebase changes sync automatically
- ✅ Failed syncs retry every 15 minutes
- ✅ Health monitoring available

**Manual (Optional):**
```bash
# Refresh materialized views (weekly)
psql -h ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech \
     -U neondb_owner -d neondb \
     -c "SELECT bi_views.refresh_all_materialized_views();"
```

### Monitoring Commands
```bash
# Check sync health
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/syncHealthCheck

# View recent sync activity
psql -c "SELECT * FROM sync_statistics;"

# Check for failures
psql -c "SELECT * FROM sync_failures WHERE created_at > NOW() - INTERVAL '24 hours';"
```

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. Functions Deploy Fails
**Error**: `Missing pg dependency`
**Fix**: 
```bash
cd functions && npm install pg @types/pg
firebase deploy --only functions
```

#### 2. Neon Connection Fails
**Error**: `Connection timeout`
**Fix**: Use pooler endpoint:
```
Host: ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech (not direct host)
Port: 5432
```

#### 3. SSL Certificate Issues
**Error**: `SSL validation failed`
**Fix**: Add to connection string:
```
SSL Mode=Require;Trust Server Certificate=true
```

#### 4. No Data Syncing
**Checks**:
```bash
# 1. Check if functions are deployed
firebase functions:list

# 2. Check function logs
firebase functions:log --only syncToNeon

# 3. Check sync health
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/syncHealthCheck
```

#### 5. PowerBI Connection Issues
**Solutions**:
- Use Import mode, not DirectQuery
- Connect to `bi_views` schema only
- Verify credentials with test script
- Check firewall rules

---

## 📈 Performance Optimization

### For Large Datasets

1. **Add Indexes** (if needed):
```sql
CREATE INDEX idx_property_status_date ON firebase_events(sync_timestamp) 
WHERE collection = 'status_changes';
```

2. **Partition Tables** (for > 1M records):
```sql
-- Partition by month if needed
CREATE TABLE firebase_events_y2025m01 PARTITION OF firebase_events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

3. **Refresh Materialized Views**:
```sql
-- Set up weekly refresh
SELECT cron.schedule('refresh-views', '0 6 * * 1', 
  'SELECT bi_views.refresh_all_materialized_views();');
```

---

## 🔒 Security Notes

### Access Control
- **powerbi_reader**: Read-only access to `bi_views` schema only
- **No write permissions**: Cannot modify any data
- **Limited scope**: Cannot access raw Firebase events or sensitive data

### Data Privacy
- Views only expose business-relevant fields
- Personal information filtered out
- Sensitive fields excluded from BI views

### Monitoring
```sql
-- Track PowerBI usage
SELECT schemaname, tablename, seq_scan, seq_tup_read 
FROM pg_stat_user_tables 
WHERE schemaname = 'bi_views';
```

---

## 📝 Schema Evolution

### Adding New Fields
When you add fields to Firebase collections:

1. **Views automatically include new fields** (JSON flexibility)
2. **PowerBI sees new columns** on next refresh
3. **No manual mapping required**

### Example: Adding "team_lead" field
```sql
-- Update view to include new field
CREATE OR REPLACE VIEW bi_views.property_status AS
SELECT 
  -- existing fields...
  (data->>'team_lead')::VARCHAR AS "Team Lead",  -- New field
  -- rest of view...
FROM firebase_current_state;
```

### Breaking Changes
For major schema changes:
1. Create `bi_views_v2` schema
2. Keep `bi_views` for old dashboards
3. Migrate gradually

---

## ✅ Success Verification

### Final Checklist
- [ ] Firebase functions deployed successfully
- [ ] Database schema created
- [ ] Views accessible from PowerBI
- [ ] Test data flows through system
- [ ] PowerBI can connect and load data
- [ ] Health check returns green status
- [ ] Documentation shared with Lew

### Expected Results
- **Data Latency**: < 5 minutes from Firebase to PowerBI
- **PowerBI Connection**: Never breaks on schema changes
- **Query Performance**: < 2 seconds for common reports
- **Reliability**: 99.9% sync success rate

---

## 📞 Support

### Logs and Monitoring
```bash
# Function logs
firebase functions:log --only syncToNeon

# Database logs
SELECT * FROM sync_failures ORDER BY created_at DESC LIMIT 10;

# Health dashboard
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/syncHealthCheck
```

### Emergency Contacts
- **Database Issues**: Check Neon console
- **Function Issues**: Check Firebase console
- **PowerBI Issues**: Check connection guide

The integration is now complete and resilient to changes!