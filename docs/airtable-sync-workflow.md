# Airtable to Azure SQL Sync Workflow

Technical documentation for the automated Airtable to Azure SQL synchronization workflow.

## Overview

This workflow automatically syncs project data from Airtable to Azure SQL Database every hour using GitHub Actions. It uses a curl-based approach to reliably handle Airtable API authentication.

## Workflow File

**Location**: `.github/workflows/airtable-sql-sync-curl.yml`

## How It Works

### 1. Schedule Trigger
```yaml
on:
  schedule:
    - cron: '0 * * * *'  # Runs every hour at :00
  workflow_dispatch:     # Also allows manual triggering
```

### 2. Workflow Steps

#### Step 1: Environment Setup
- Runs on: `ubuntu-latest`
- Installs: Node.js 18, mssql, dotenv packages

#### Step 2: Export Airtable Data
```bash
# Uses curl with Bearer token authentication
curl "https://api.airtable.com/v0/appkYMgaK0cHVu4Zg/Projects?pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT"
```

**Key Features**:
- Handles pagination (fetches all records)
- Exports to `airtable-projects-full.json`
- Error handling for API failures

#### Step 3: Sync to Azure SQL
- Runs: `sync-all-project-fields-v2.js`
- Reads JSON file and syncs to SQL
- Updates all project fields (30+ fields)

#### Step 4: Verification
- Confirms sync success
- Logs record count

## Authentication

### Required GitHub Secrets

Configure these in Settings → Secrets → Actions:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AIRTABLE_PAT` | Airtable Personal Access Token | `patiXXXX...` (82 chars) |
| `AZURE_SQL_SERVER` | Azure SQL server hostname | `fibreflow.database.windows.net` |
| `AZURE_SQL_DATABASE` | Database name | `fibreflow` |
| `AZURE_SQL_USER` | SQL username | `fibreflowadmin` |
| `AZURE_SQL_PASSWORD` | SQL password | `[secure password]` |

### Airtable PAT Requirements
- Must be the full token (82-83 characters)
- Should start with `pat`
- Must include both parts (ID.secret)
- Needs read access to the FibreFlow base

## Sync Script Details

**File**: `sync-all-project-fields-v2.js`

### Features
- Reads from `airtable-projects-full.json`
- Maps 30+ Airtable fields to SQL columns
- Handles data type conversions
- Updates existing records (no duplicates)
- Logs sync operations to `sync_log` table

### Field Mappings (Partial List)
```javascript
const fieldMapping = {
  'Project Name': 'project_name',
  'Status': 'status',
  'Region': 'region',
  'Total Homes PO': 'total_homes_po',
  'Homes Connected': 'homes_connected',
  'Poles Planted': 'poles_planted',
  // ... 25+ more fields
}
```

## Monitoring & Debugging

### View Workflow Runs
1. Go to: https://github.com/VelocityFibre/FibreFlow_Firebase/actions
2. Click on "Sync Airtable to Azure SQL (curl method)"
3. View run history and logs

### Common Issues & Solutions

#### Authentication Failed
```
"type": "AUTHENTICATION_REQUIRED"
```
**Solution**: Update AIRTABLE_PAT secret with full 82-character token

#### Pagination Issues
```
Fetched 100 records (total: 100)
```
**Solution**: Check if offset handling is working in the curl loop

#### SQL Connection Failed
```
ConnectionError: Failed to connect
```
**Solution**: 
- Verify Azure SQL credentials
- Check firewall rules allow GitHub IPs
- Ensure SQL server is accessible

### Manual Testing

Test the workflow locally:

```bash
# 1. Export Airtable data
./quick-projects-sync.sh

# 2. Run sync script
node sync-all-project-fields-v2.js

# 3. Verify sync
node verify-sync-success.js
```

## Performance Considerations

- **Sync Duration**: Typically 30-90 seconds
- **Data Volume**: Handles 1000+ projects efficiently
- **Rate Limits**: Airtable allows 5 requests/second
- **SQL Batch Size**: Processes one record at a time (could be optimized)

## Future Improvements

1. **Batch SQL Updates**: Update multiple records in one query
2. **Incremental Sync**: Only sync changed records
3. **Additional Tables**: Sync more Airtable tables
4. **Error Recovery**: Implement retry logic for transient failures
5. **Notifications**: Send alerts on sync failures

## Security Notes

- Never commit secrets to the repository
- Rotate Airtable PAT periodically
- Use least-privilege SQL account
- Monitor `sync_log` for unauthorized access

## Related Documentation

- [GitHub Actions Secrets Setup](./github-actions-secrets-setup.md)
- [Power BI Connection Guide](./power-bi-connection-guide.md)
- [Azure SQL Firewall Setup](./azure-sql-firewall-setup.md)

---

*Last updated: June 30, 2025*