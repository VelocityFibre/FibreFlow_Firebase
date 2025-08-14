# PowerBI Connection Guide for FibreFlow

## Quick Connection Details

### Primary Connection (Recommended)
```
Host: ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech
Port: 5432
Database: neondb
Username: powerbi_reader
Password: [To be set by admin]
SSL Mode: Require
```

### Connection String
```
Host=ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech;Port=5432;Database=neondb;Username=powerbi_reader;Password=yourpassword;SSL Mode=Require;Trust Server Certificate=true
```

## Step-by-Step PowerBI Desktop Connection

### 1. Open PowerBI Desktop

### 2. Get Data
- Click **"Get Data"** → **"More..."**
- Search for **"PostgreSQL"**
- Select **"PostgreSQL database"** and click **"Connect"**

### 3. Server Connection
- **Server**: `ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech`
- **Database**: `neondb`
- **Data Connectivity mode**: Select **"Import"** (recommended)
- Click **"OK"**

### 4. Authentication
- **Username**: `powerbi_reader`
- **Password**: [Contact admin for password]
- Click **"Connect"**

### 5. Navigator - Select Tables/Views
Navigate to: **bi_views** schema

Select the views you need:
- ✅ **property_status** - Main operational data
- ✅ **project_summary** - Project overview
- ✅ **agent_performance** - Agent metrics
- ✅ **daily_kpis** - Daily performance indicators
- ✅ **meetings_action_items** - Meeting action items
- ✅ **daily_summary** - Pre-aggregated daily stats

Click **"Load"** or **"Transform Data"** if you need to modify

## Available Views Documentation

### property_status
Main operational view with all property, pole, and drop information
- **Property ID**: Unique property identifier
- **Pole Number**: Associated pole (if assigned)
- **Drop Number**: Associated drop (if assigned)
- **Current Status**: Latest status
- **Status Category**: Grouped status (Approved, In Progress, etc.)
- **Agent Name**: Assigned agent/contractor
- **Address, Zone, Distribution**: Location details
- **Permission Date, Signup Date, Installation Date**: Key dates
- **Has Pole, Has Drop**: Binary indicators for filtering

### project_summary
Overview of all projects
- **Project ID & Name**: Project identifiers
- **Client Name**: Associated client
- **Project Type**: FTTH, FTTB, etc.
- **Status & Priority**: Current state
- **Start & End Date**: Project timeline
- **Progress Percentage**: Completion status

### agent_performance
Pre-calculated agent metrics
- **Agent Name**: Agent/contractor name
- **Total Properties**: Number assigned
- **Approvals, Completions, Declines**: Status counts
- **Completion Rate %**: Success metric
- **Approval Rate %**: Approval metric
- **Last Activity**: Most recent update

### daily_kpis
Daily operational metrics
- **Date**: Activity date
- **New Poles Planned**: Daily new poles
- **Poles Installed**: Daily installations
- **Drops Connected**: Daily connections
- **Daily Cost**: Financial metrics
- **Quality Score**: Quality metrics
- **Progress %**: Overall progress

### meetings_action_items
Meeting records with action items
- **Meeting Title & Date**: Meeting info
- **Action Item**: Specific task
- **Assignee**: Responsible person
- **Priority**: High/Medium/Low
- **Completed**: Status
- **Due Date**: Deadline

### daily_summary (Materialized View)
Pre-aggregated for performance
- **Date, Zone, Agent**: Grouping dimensions
- **Total Activities**: Count of all activities
- **Approvals, Declines, Installations**: Status breakdowns

## PowerBI Best Practices

### 1. Import vs DirectQuery
**Use Import Mode** (Recommended)
- Better performance
- All PowerBI features available
- Scheduled refresh keeps data current
- No live connection issues

### 2. Scheduled Refresh
Set up automatic refresh:
1. Publish report to PowerBI Service
2. Go to dataset settings
3. Configure scheduled refresh
4. Recommended: Every 4-6 hours

### 3. Relationships
PowerBI will auto-detect some relationships, but verify:
- property_status → project_summary (via Project ID)
- property_status → agent_performance (via Agent Name)
- daily_kpis → project_summary (via Project ID)

### 4. Date Tables
Create a date table for time intelligence:
```DAX
DateTable = 
CALENDAR(
    MIN('property_status'[Permission Date]),
    MAX('property_status'[Permission Date])
)
```

### 5. Common Measures
```DAX
// Total Properties
Total Properties = COUNTROWS('property_status')

// Completion Rate
Completion Rate = 
DIVIDE(
    CALCULATE(COUNTROWS('property_status'), 'property_status'[Status Category] = "Completed"),
    COUNTROWS('property_status'),
    0
)

// Active Properties
Active Properties = 
CALCULATE(
    COUNTROWS('property_status'),
    'property_status'[Status Category] IN {"Approved", "In Progress", "Scheduled"}
)

// YTD Installations
YTD Installations = 
CALCULATE(
    COUNTROWS('property_status'),
    'property_status'[Status Category] = "Completed",
    DATESYTD('DateTable'[Date])
)
```

## Troubleshooting

### SSL Certificate Error
If you get SSL certificate validation errors:
1. In connection dialog, expand "Advanced options"
2. Add: `TrustServerCertificate=true`
3. Or use connection via port 6543 (pooler)

### Connection Timeout
- Ensure you're using the pooler endpoint (not direct)
- Check firewall rules
- Verify credentials

### Missing Data
- Check view definitions in database
- Verify Firebase sync is running
- Check sync_statistics view for last sync time

### Performance Issues
- Use Import mode, not DirectQuery
- Limit date ranges in queries
- Use pre-aggregated views (daily_summary)
- Add filters before loading

## Security Notes

1. **powerbi_reader** user has read-only access
2. Limited to bi_views schema only
3. Cannot modify any data
4. IP whitelisting available if needed

## Support Contacts

- **Database Admin**: [Your contact]
- **PowerBI Support**: [Your contact]
- **Password Reset**: [Admin contact]

## Monitoring Data Freshness

Check when data was last synced:
```sql
SELECT * FROM sync_statistics;
```

Or in PowerBI, create a card visual showing:
```DAX
Last Refresh = MAX('property_status'[Last Updated])
```

---

Remember: The views abstract the underlying complexity. You're connecting to simple, business-friendly tables that won't break when the application evolves!