# Airtable to Azure SQL Sync Setup

## Prerequisites
- ✅ Azure SQL Database created
- ✅ Node.js installed
- ✅ `mssql` package installed

## Configuration
Update `.env.local` with your Azure SQL password:
```
AZURE_SQL_PASSWORD=YOUR_PASSWORD_HERE
```

## Running the Sync

### Manual Sync
```bash
node airtable-to-sql-sync.js
```

### Scheduled Sync (Cron)
Add to crontab for hourly sync:
```bash
0 * * * * cd /home/ldp/VF/Apps/FibreFlow && node airtable-to-sql-sync.js >> sync.log 2>&1
```

### As a Service (PM2)
```bash
pm2 start airtable-to-sql-sync.js --name "airtable-sync" --cron "0 * * * *"
pm2 save
```

## What Gets Synced

### Projects Table
- Project Name → project_name
- Status → status
- Customer → customer_id
- Region → region
- Start Date → start_date
- Total Homes → total_homes
- Homes Connected → homes_connected
- Poles Planted → poles_planted
- Progress % → progress_percentage

### Customers Table
- Client Name → client_name
- Client Type → client_type
- Total Projects → total_projects
- Active Projects → active_projects

### Staff Table
- Name → name
- Role → role
- Department → department
- Email → email
- Phone → phone

## Power BI Connection
1. Open Power BI Desktop
2. Get Data → Azure → Azure SQL Database
3. Server: `fibreflow.database.windows.net`
4. Database: `fibreflow`
5. Authentication: Database (SQL) or Microsoft Account (Entra)

## Monitoring
Check sync status in SQL:
```sql
SELECT * FROM sync_log ORDER BY sync_timestamp DESC;
```

## Troubleshooting
- Check `.env.local` has correct password
- Verify firewall rules allow your IP
- Check Airtable API key is valid
- Review sync_log table for errors