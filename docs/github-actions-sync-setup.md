# GitHub Actions Sync Setup

## 1. Add Secrets to GitHub

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value |
|------------|--------|
| AIRTABLE_PAT | patEKhZokLJqTadpy.bb45706b4ccc11a26c18a6d3c4510d5e4092db2f38303388d04856916d820b67 |
| AZURE_SQL_SERVER | fibreflow.database.windows.net |
| AZURE_SQL_DATABASE | fibreflow |
| AZURE_SQL_USER | fibreflowadmin |
| AZURE_SQL_PASSWORD | Xoouphae2415! |

## 2. Enable GitHub Actions IPs in Azure

In Azure SQL firewall, enable:
- ✅ "Allow Azure services and resources to access this server"

This allows GitHub Actions (runs on Azure) to connect.

## 3. Test the Workflow

1. Go to Actions tab in your repo
2. Find "Sync Airtable to Azure SQL"
3. Click "Run workflow" → "Run workflow"
4. Watch the logs

## 4. Schedule

Currently runs hourly. To change:
- Edit `.github/workflows/airtable-sql-sync.yml`
- Update cron schedule:
  - `0 * * * *` = Every hour
  - `0 */6 * * *` = Every 6 hours
  - `0 0 * * *` = Daily at midnight
  - `*/30 * * * *` = Every 30 minutes

## 5. Monitor

Check sync status:
- GitHub Actions tab shows run history
- SQL query: `SELECT * FROM sync_log ORDER BY sync_timestamp DESC`