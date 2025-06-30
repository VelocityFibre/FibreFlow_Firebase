# Power BI Connection Guide

This guide explains how to connect Power BI to the Azure SQL Database containing synchronized FibreFlow project data.

## Overview

FibreFlow automatically syncs project data from Airtable to Azure SQL Database every hour using GitHub Actions. This enables real-time Power BI dashboards and reporting without impacting the production Airtable database.

## Data Sync Schedule

- **Frequency**: Every hour at :00 (e.g., 14:00, 15:00, 16:00)
- **Data Lag**: Maximum 59 minutes (average 30 minutes)
- **Sync Status**: Monitor at [GitHub Actions](https://github.com/VelocityFibre/FibreFlow_Firebase/actions)

## Available Tables

### 1. **projects** Table
Contains comprehensive project information with 30+ fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `project_name` | nvarchar(255) | Project name |
| `status` | nvarchar(100) | Project status (Not Started, In Progress, etc.) |
| `region` | nvarchar(100) | Geographic region |
| `total_homes_po` | int | Total homes per purchase order |
| `homes_connected` | int | Number of homes connected |
| `home_signups` | int | Number of home signups |
| `poles_planted` | int | Number of poles planted |
| `stringing_complete_m` | int | Meters of stringing completed |
| `permissions_percent` | float | Percentage of permissions obtained |
| `start_date` | date | Project start date |
| `end_date` | date | Project end date |
| `project_duration_months` | int | Duration in months |
| `last_synced` | datetime | Last sync timestamp |
| ... and 20+ more fields |

### 2. **customers** Table
Client information (when available in Airtable):

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | nvarchar(255) | Airtable record ID |
| `client_name` | nvarchar(255) | Client name |
| `client_type` | nvarchar(100) | Type of client |
| `total_projects` | int | Total projects count |
| `active_projects` | int | Active projects count |
| `last_synced` | datetime | Last sync timestamp |

### 3. **staff** Table
Employee records (when available in Airtable):

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | nvarchar(255) | Airtable record ID |
| `name` | nvarchar(255) | Staff member name |
| `role` | nvarchar(100) | Job role |
| `department` | nvarchar(100) | Department |
| `email` | nvarchar(255) | Email address |
| `phone` | nvarchar(50) | Phone number |
| `last_synced` | datetime | Last sync timestamp |

### 4. **sync_log** Table
Audit trail of all sync operations:

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | int | Auto-incrementing ID |
| `table_name` | nvarchar(100) | Table that was synced |
| `records_synced` | int | Number of records synced |
| `sync_status` | nvarchar(50) | Status (success/error) |
| `error_message` | nvarchar(MAX) | Error details if any |
| `sync_timestamp` | datetime | When sync occurred |

## Connection Steps

### 1. Get Connection Details

```
Server: fibreflow.database.windows.net
Database: fibreflow
Authentication: SQL Server Authentication
Username: fibreflowadmin
Password: [Contact administrator]
```

### 2. Connect from Power BI Desktop

1. Open Power BI Desktop
2. Click **Get Data** → **Azure** → **Azure SQL Database**
3. Enter connection details:
   - **Server**: `fibreflow.database.windows.net`
   - **Database**: `fibreflow`
4. Select **Database** authentication mode
5. Enter credentials:
   - **Username**: `fibreflowadmin`
   - **Password**: [Your password]
6. Click **Connect**

### 3. Select Tables

In the Navigator window:
1. Expand the database to see available tables
2. Select the tables you need:
   - ✅ `projects` (recommended - main data source)
   - ✅ `sync_log` (optional - to show data freshness)
   - ⚡ `customers` (if needed)
   - ⚡ `staff` (if needed)
3. Click **Load** or **Transform Data**

### 4. Configure Refresh

To keep your Power BI reports up-to-date:

1. **Power BI Desktop**: 
   - File → Options → Data Load → Enable background data refresh
   
2. **Power BI Service** (after publishing):
   - Go to dataset settings
   - Configure scheduled refresh (recommended: every hour)
   - Enter database credentials in gateway settings

## Sample DAX Measures

Here are useful DAX measures for your reports:

```dax
// Total Homes Across All Projects
Total Homes PO = SUM(projects[total_homes_po])

// Overall Connection Rate
Connection Rate = 
DIVIDE(
    SUM(projects[homes_connected]),
    SUM(projects[total_homes_po]),
    0
)

// Active Projects Count
Active Projects = 
COUNTROWS(
    FILTER(
        projects,
        projects[status] = "In Progress"
    )
)

// Data Freshness (hours since last sync)
Hours Since Sync = 
DATEDIFF(
    MAX(projects[last_synced]),
    NOW(),
    HOUR
)

// Project Completion Progress
Avg Completion = 
AVERAGEX(
    projects,
    DIVIDE(
        projects[homes_connected],
        projects[total_homes_po],
        0
    )
)
```

## Best Practices

1. **Data Refresh**:
   - Set Power BI refresh to match or slightly exceed the hourly sync schedule
   - Add a "Last Updated" card showing `MAX(projects[last_synced])`

2. **Performance**:
   - Create relationships between tables using the `id` fields
   - Use import mode for better performance (data updates hourly anyway)
   - Consider creating aggregated tables for large datasets

3. **Monitoring**:
   - Add a visual showing sync_log data to monitor sync health
   - Set up alerts if sync hasn't run in over 2 hours

4. **Security**:
   - Use Row-Level Security (RLS) if needed to restrict data access
   - Store credentials securely in Power BI gateway
   - Never embed credentials in reports

## Troubleshooting

### Issue: Connection Failed
- **Check**: Firewall settings - ensure your IP is whitelisted
- **Check**: Credentials are correct
- **Check**: Server name includes `.database.windows.net`

### Issue: No Data or Old Data
- **Check**: [GitHub Actions](https://github.com/VelocityFibre/FibreFlow_Firebase/actions) for sync status
- **Check**: `sync_log` table for recent successful syncs
- **Check**: Power BI refresh schedule is configured

### Issue: Performance Issues
- **Solution**: Use Import mode instead of DirectQuery
- **Solution**: Create summary tables in SQL for complex calculations
- **Solution**: Limit date ranges in queries

## Support

For issues with:
- **Database access**: Contact your database administrator
- **Sync process**: Check `.github/workflows/airtable-sql-sync-curl.yml`
- **Power BI**: Refer to [Power BI documentation](https://docs.microsoft.com/power-bi/)

---

*Last updated: June 30, 2025*