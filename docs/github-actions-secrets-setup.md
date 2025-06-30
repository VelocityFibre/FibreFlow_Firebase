# GitHub Actions Secrets Setup

**Last Updated**: June 30, 2025

## Overview

This guide explains how to configure GitHub Secrets for the automated Airtable to Azure SQL sync workflow. The workflow uses these secrets to authenticate with both Airtable and Azure SQL Database.

## Required Secrets

The following secrets must be configured in your GitHub repository for the sync workflow to function:

### 1. Navigate to GitHub Secrets
1. Go to your repository: https://github.com/VelocityFibre/FibreFlow_Firebase
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret** for each secret below

### 2. Add These Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `AIRTABLE_PAT` | Your Airtable Personal Access Token | `patiXXXXXXXXXXXXXX.XXXXXX...` (82-83 characters) |
| `AZURE_SQL_SERVER` | Azure SQL Server hostname | `fibreflow.database.windows.net` |
| `AZURE_SQL_DATABASE` | Database name | `fibreflow` |
| `AZURE_SQL_USER` | SQL admin username | `fibreflowadmin` |
| `AZURE_SQL_PASSWORD` | SQL admin password | `<your-secure-password>` |

### 3. Getting the Values

#### Airtable PAT:

**Important**: You need the FULL token, not just the token ID!

1. Log into Airtable
2. Go to https://airtable.com/create/tokens
3. Create a new personal access token with:
   - **Name**: `FibreFlow Sync`
   - **Scope**: `data.records:read` 
   - **Access**: Select the FibreFlow base (`appkYMgaK0cHVu4Zg`)
4. Click "Create token"
5. **Copy the ENTIRE token** (should be 82-83 characters)
6. The token format is: `patiXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Common Mistake**: People often copy only the first part (token ID) instead of the full token!

#### Azure SQL Details:

**From Azure Portal**:
1. Log into Azure Portal
2. Navigate to your SQL Database
3. Find connection strings section for server details
4. Use the admin credentials you set up

**Connection Details**:
- **Server**: `fibreflow.database.windows.net`
- **Database**: `fibreflow`
- **Username**: `fibreflowadmin`
- **Password**: [Your admin password]

### 4. Update Secrets

For each secret:
1. Click **New repository secret** (or pencil icon to edit)
2. Enter the **Name** exactly as shown in the table
3. Paste the **Value** 
4. **Important**: No extra spaces before or after values!
5. Click **Add secret** or **Update secret**

### 5. Verify Configuration

After adding all secrets:
1. Go to **Actions** tab in your repository
2. Find "Sync Airtable to Azure SQL (curl method)"
3. Click **Run workflow** > **Run workflow**
4. Monitor the run for success

## Security Best Practices

### Do's ✅
- **Rotate tokens** periodically (every 90 days)
- **Use least privilege** - only grant necessary permissions
- **Monitor access** - check sync_log table for unusual activity
- **Keep secrets secret** - never commit them to code

### Don'ts ❌
- **Never** commit credentials to your repository
- **Never** share secrets in issues or pull requests
- **Never** log secret values in workflows
- **Avoid** using personal accounts for production

## Troubleshooting

### Secret Not Found
```
Error: Input required and not supplied: AIRTABLE_PAT
```
**Solution**: Ensure secret name matches exactly (case-sensitive)

### Invalid Token Format
```
"type": "AUTHENTICATION_REQUIRED"
```
**Solution**: 
- Verify you copied the FULL Airtable token (82-83 chars)
- Check token starts with `pat`
- Ensure no extra spaces

### SQL Connection Failed
```
ConnectionError: Failed to connect to fibreflow.database.windows.net:1433
```
**Solution**:
- Verify server name includes `.database.windows.net`
- Check username/password are correct
- Ensure Azure firewall allows GitHub Actions IPs

### Debugging Token Issues

Run this in the workflow to debug (temporarily):
```yaml
- name: Debug Token
  env:
    AIRTABLE_PAT: ${{ secrets.AIRTABLE_PAT }}
  run: |
    echo "Token length: ${#AIRTABLE_PAT}"
    echo "Token prefix: ${AIRTABLE_PAT:0:10}..."
```

## Workflow File Reference

The workflow using these secrets is located at:
`.github/workflows/airtable-sql-sync-curl.yml`

## Additional Resources

- [Airtable PAT Documentation](https://airtable.com/developers/web/guides/personal-access-tokens)
- [Azure SQL Connection Strings](https://docs.microsoft.com/azure/azure-sql/database/connect-query-content-reference-guide)
- [GitHub Encrypted Secrets](https://docs.github.com/actions/security-guides/encrypted-secrets)

---

*For issues, check the [Airtable Sync Workflow](./airtable-sync-workflow.md) documentation.*