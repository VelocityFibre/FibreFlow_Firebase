# Testing Sync Workflows - Complete Guide

This guide shows you how to test both the Airtable and Firebase sync workflows, including manual triggers, local testing, verification, and troubleshooting.

## Overview

We have two sync workflows:
1. **Airtable to SQL** - Syncs daily operations data from Airtable
2. **Firebase to SQL** - Syncs project management data from Firestore

Both run automatically at 6am weekdays, but can be manually triggered and tested locally.

## 1. Airtable to SQL Sync

### Manual Trigger from GitHub Actions

1. Go to: https://github.com/[your-repo]/actions/workflows/airtable-sql-sync-curl.yml
2. Click "Run workflow" button on the right
3. Select branch (usually `master`)
4. Click green "Run workflow" button
5. Monitor progress in the workflow run

### Test Locally

```bash
# Navigate to project root
cd /home/ldp/VF/Apps/FibreFlow

# Install dependencies
npm install mssql dotenv

# Create a test environment file
cat > .env.test << 'EOF'
AZURE_SQL_SERVER=fibreflow.database.windows.net
AZURE_SQL_DATABASE=fibreflow
AZURE_SQL_USER=fibreflowadmin
AZURE_SQL_PASSWORD=Xoouphae2415!
AIRTABLE_PAT=your_airtable_pat_here
EOF

# Fetch Airtable data manually
export AIRTABLE_PAT="your_airtable_pat_here"
curl -s "https://api.airtable.com/v0/appkYMgaK0cHVu4Zg/Projects?pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  > airtable-projects-full.json

curl -s "https://api.airtable.com/v0/appkYMgaK0cHVu4Zg/Daily%20Tracker?pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  > airtable-daily-tracker.json

# Test the sync scripts
node sync-all-project-fields-v3.js
node sync-daily-tracker-complete.js
```

### Verify the Sync Worked

```bash
# Create verification script
cat > verify-airtable-sync.js << 'EOF'
const sql = require('mssql');

const sqlConfig = {
  server: 'fibreflow.database.windows.net',
  database: 'fibreflow',
  user: 'fibreflowadmin',
  password: 'Xoouphae2415!',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function verify() {
  try {
    const pool = await sql.connect(sqlConfig);
    
    // Check Projects
    const projectsResult = await pool.request().query('SELECT COUNT(*) as count FROM projects');
    console.log(`✅ Projects: ${projectsResult.recordset[0].count} records`);
    
    // Check Daily Tracker
    const trackerResult = await pool.request().query('SELECT COUNT(*) as count FROM daily_tracker');
    console.log(`✅ Daily Tracker: ${trackerResult.recordset[0].count} records`);
    
    // Check specific example
    const exampleResult = await pool.request().query(`
      SELECT TOP 5 date, project_name, missing_status, declines
      FROM daily_tracker 
      WHERE missing_status > 0
      ORDER BY date DESC
    `);
    
    console.log('\n📊 Recent Missing Status Examples:');
    exampleResult.recordset.forEach(row => {
      console.log(`  ${new Date(row.date).toLocaleDateString()} - ${row.project_name}: ${row.missing_status} missing, ${row.declines || 0} declines`);
    });
    
    await pool.close();
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
  }
}

verify();
EOF

# Run verification
node verify-airtable-sync.js
```

### What to Check if It Fails

1. **Authentication Error**
   - Check `AIRTABLE_PAT` in GitHub Secrets
   - Verify PAT has correct permissions
   - Token format: `pat...` (not `key...`)

2. **Connection Error**
   - Check Azure SQL firewall rules
   - Verify credentials in GitHub Secrets
   - Test connection: `telnet fibreflow.database.windows.net 1433`

3. **Data Format Error**
   - Check JSON files are valid: `jq . airtable-projects-full.json`
   - Look for missing required fields
   - Check date format issues

## 2. Firebase to SQL Sync

### Manual Trigger from GitHub Actions

1. Go to: https://github.com/[your-repo]/actions/workflows/firebase-sql-sync.yml
2. Click "Run workflow" button
3. Select branch and click green "Run workflow"
4. Monitor the run for any errors

### Test Locally

```bash
# Navigate to functions directory
cd /home/ldp/VF/Apps/FibreFlow/functions

# Install dependencies
npm install firebase-admin mssql dotenv

# Run the sync (uses default Firebase credentials)
node sync-firebase-to-sql-safe.js
```

### Verify the Sync Worked

```bash
# Create Firebase sync verification
cat > verify-firebase-sync.js << 'EOF'
const sql = require('mssql');

const sqlConfig = {
  server: 'fibreflow.database.windows.net',
  database: 'fromfirebase',  // Note: different database!
  user: 'fibreflowadmin',
  password: 'Xoouphae2415!',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function verify() {
  try {
    const pool = await sql.connect(sqlConfig);
    
    // Check all tables
    const tables = ['Projects', 'Staff', 'Tasks'];
    
    for (const table of tables) {
      const result = await pool.request().query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✅ ${table}: ${result.recordset[0].count} records`);
    }
    
    // Check for orphaned tasks
    const orphanedResult = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM Tasks 
      WHERE project_id = 'UNASSIGNED'
    `);
    console.log(`\n📦 Orphaned tasks: ${orphanedResult.recordset[0].count}`);
    
    // Recent task activity
    const recentTasks = await pool.request().query(`
      SELECT TOP 5 name, status, updated_at, project_id
      FROM Tasks
      ORDER BY updated_at DESC
    `);
    
    console.log('\n📋 Recent Task Updates:');
    recentTasks.recordset.forEach(task => {
      console.log(`  ${task.name} (${task.status}) - Project: ${task.project_id}`);
    });
    
    await pool.close();
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
  }
}

verify();
EOF

# Run verification
node verify-firebase-sync.js
```

### What to Check if It Fails

1. **Firebase Authentication**
   - Check `FIREBASE_SERVICE_ACCOUNT` in GitHub Secrets
   - For local: ensure Firebase CLI is authenticated
   - Run: `firebase projects:list` to verify

2. **SQL Connection Issues**
   - Different database: `fromfirebase` not `fibreflow`
   - Check firewall allows GitHub Actions IPs
   - Verify SQL credentials

3. **Data Integrity Issues**
   - Check for circular references
   - Verify all project IDs exist
   - Look for timestamp conversion errors

## 3. Quick SQL Queries for Verification

```sql
-- Connect to Azure SQL using any SQL client
-- Server: fibreflow.database.windows.net
-- Username: fibreflowadmin
-- Password: Xoouphae2415!

-- For Airtable sync (database: fibreflow)
USE fibreflow;

-- Check sync status
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as tracker_count FROM daily_tracker;

-- Find Mohadin's missing status on July 2
SELECT * FROM daily_tracker 
WHERE project_name LIKE '%Mohadin%' 
AND CAST(date AS DATE) = '2024-07-02';

-- Daily summary
SELECT 
  CAST(date AS DATE) as sync_date,
  COUNT(*) as records,
  SUM(missing_status) as total_missing,
  SUM(declines) as total_declines
FROM daily_tracker
GROUP BY CAST(date AS DATE)
ORDER BY sync_date DESC;

-- For Firebase sync (database: fromfirebase)
USE fromfirebase;

-- Check sync completeness
SELECT 
  'Projects' as table_name, COUNT(*) as count FROM Projects
UNION ALL SELECT 
  'Staff', COUNT(*) FROM Staff
UNION ALL SELECT 
  'Tasks', COUNT(*) FROM Tasks;

-- Find orphaned tasks
SELECT COUNT(*) as orphaned_count 
FROM Tasks 
WHERE project_id = 'UNASSIGNED';

-- Active projects with task counts
SELECT 
  p.name as project_name,
  p.status,
  COUNT(t.id) as task_count
FROM Projects p
LEFT JOIN Tasks t ON p.id = t.project_id
WHERE p.id != 'UNASSIGNED'
GROUP BY p.name, p.status
ORDER BY task_count DESC;
```

## 4. Monitoring & Alerts

### Check GitHub Actions Status
- Airtable Sync: https://github.com/[your-repo]/actions/workflows/airtable-sql-sync-curl.yml
- Firebase Sync: https://github.com/[your-repo]/actions/workflows/firebase-sql-sync.yml

### Set Up Email Notifications
1. Go to your GitHub profile settings
2. Navigate to Notifications
3. Enable email for "Actions"
4. You'll get emails on workflow failures

### Power BI Monitoring
Create a simple Power BI dashboard that shows:
- Last sync timestamp
- Record counts by table
- Data freshness indicators
- Missing data alerts

## 5. Common Issues & Solutions

### Issue: Workflow runs but no data synced
**Solution**: Check the workflow logs for specific errors. Often it's authentication.

### Issue: Partial data sync
**Solution**: Check for API rate limits or pagination issues. Both APIs paginate results.

### Issue: Old data in Power BI
**Solution**: 
1. Check sync workflows ran successfully
2. Refresh Power BI dataset
3. Clear Power BI cache if needed

### Issue: Duplicate data
**Solution**: Both sync scripts clear tables before inserting. If duplicates appear, check if multiple workflows are running simultaneously.

## 6. Emergency Recovery

If syncs are failing and you need data immediately:

```bash
# Quick manual Airtable export
curl -s "https://api.airtable.com/v0/appkYMgaK0cHVu4Zg/Daily%20Tracker" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  | jq '.records[] | {date: .fields.Date, project: .fields."Project Name", missing: .fields."Missing Status"}' \
  > emergency-export.json

# Quick Firebase export
firebase firestore:export gs://your-backup-bucket/emergency-export

# Direct SQL insert (emergency only)
# Use SQL Server Management Studio or Azure Data Studio
# Manually insert critical records
```

## Need Help?

1. Check workflow logs first - they're very detailed
2. Verify all credentials are correct
3. Test each component separately
4. Contact the team with specific error messages

Remember: The syncs run automatically every weekday at 6am. Manual triggers should only be used for testing or emergency updates.