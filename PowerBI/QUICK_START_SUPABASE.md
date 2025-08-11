# Power BI + Supabase Quick Start Guide

*Get connected in 5 minutes*

## 🚨 UPDATED: SSL Certificate Error Fix (2025-08-13)

**PROBLEM**: "The remote certificate is invalid according to the validation procedure"
**SOLUTION**: Use REST API connection (see Step 2 below) ✅ TESTED & WORKING

## Step 1: Get Your Connection Details

Check your FibreFlow environment file:
```bash
cat src/environments/environment.ts | grep supabase
```

You need:
- **URL**: `your-project.supabase.co`
- **Anon Key**: Used as the password

## Step 2: Connect in Power BI Desktop

### ✅ OPTION A: REST API Connection (RECOMMENDED)

1. **Open Power BI Desktop**
2. **Get Data** → **Web**
3. **Enter URL:**
   ```
   https://vkmpbprvooxgrkwrkbcf.supabase.co/rest/v1/status_changes
   ```
4. **Click Advanced, add these Headers:**
   - **Header 1**: `apikey` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8`
   - **Header 2**: `Authorization` = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b284Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8`
5. **Click OK** - Data loads successfully! ✅

### OPTION B: Connection Pooler (Backup Method)

1. **Open Power BI Desktop**
2. **Get Data** → **PostgreSQL database**
3. Enter:
   - **Server**: `db.vkmpbprvooxgrkwrkbcf.supabase.co`
   - **Database**: `postgres`
   - **Port**: `6543` (Connection Pooler)
4. For authentication:
   - **Username**: `postgres`
   - **Password**: `1ldaAvPgdc7nOfts`

## Step 3: Select Your Data

### ✅ CONFIRMED Available Data (2025-08-13):
- [x] `status_changes` - **15,651+ records** ✅ WORKING
  - Property IDs, Pole Numbers (LAW.P.D410)
  - Status: "Pole Permission: Approved", etc.
  - Addresses, Dates, Project data (Lawley project)

### Other Tables (setup required):
- [ ] `zone_progress_view` - Zone analytics (needs view creation)
- [ ] `daily_progress` - Daily metrics (needs view creation)  
- [ ] `key_milestones` - Project milestones (needs view creation)

### Data Sample You'll Get:
```json
{
  "property_id": "356923",
  "pole_number": "LAW.P.D410", 
  "address": "52 WHALE PLACE LAWLEY",
  "status": "Pole Permission: Approved",
  "project_name": "Lawley"
}
```

## Step 4: Build Your First Visual

1. Drag `status_changes` data to report canvas
2. Power BI auto-creates a table
3. Convert to:
   - **Clustered bar chart** for status comparison
   - **KPI cards** for totals  
   - **Map visual** using addresses
   - **Pie chart** for project breakdown

## Connection String Reference

```
Host: your-project.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: [supabase anon key]
SSL Mode: Require
```

## Common Issues & Solutions

**❌ SSL Certificate Error?**
- **Solution**: Use REST API connection (Option A above) ✅ BYPASSES SSL ISSUES

**❌ Still can't connect?**
- Check if your IP is whitelisted in Supabase dashboard
- Try connection pooler (port 6543) instead of 5432
- Verify API keys are correct

**❌ Data not updating?**
- Set up scheduled refresh in Power BI Service  
- Check if sync scripts are running: `node supabase/scripts/sync-from-onemap-sqlite.js`

**❌ Performance slow?**
- Use Import mode instead of DirectQuery
- Filter data with URL parameters: `?limit=1000`

## Next Steps

1. ✅ Connected to Supabase
2. → Build dashboards
3. → Schedule refresh
4. → Share with team

See `DATABASE_CONNECTION_GUIDE.md` for advanced options.