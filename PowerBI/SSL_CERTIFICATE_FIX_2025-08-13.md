# PowerBI to Supabase SSL Certificate Fix

**Date**: 2025-08-13  
**Issue**: "The remote certificate is invalid according to the validation procedure"  
**Status**: ✅ RESOLVED - Tested & Working  

## For Ettienne - Exact Steps That Work

### What Didn't Work Before:
- ❌ PostgreSQL connector with `db.vkmpbprvooxgrkwrkbcf.supabase.co:5432`
- ❌ SQL Server connector (wrong database type!)
- ❌ SSL Mode configurations

### ✅ WORKING SOLUTION: REST API Method

**Step 1:** Open PowerBI Desktop

**Step 2:** Get Data → Web (not PostgreSQL!)

**Step 3:** Enter this exact URL:
```
https://vkmpbprvooxgrkwrkbcf.supabase.co/rest/v1/status_changes
```

**Step 4:** Click "Advanced" and add these 2 Headers:

**Header 1:**
- Name: `apikey`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8`

**Header 2:**
- Name: `Authorization`  
- Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b284Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8`

**Step 5:** Click OK

**Result:** Data loads successfully! 15,651+ records available.

## What You'll Get

### Data Sample:
- Property IDs: 356923, 350422, etc.
- Pole Numbers: LAW.P.D410, LAW.P.D343, etc.  
- Drop Numbers: DR1732742, etc.
- Status: "Pole Permission: Approved"
- Addresses: Full street addresses in Lawley
- Project: "Lawley"
- Dates: Permission dates, signup dates, etc.

### Record Count: 15,651+ records of actual fiber installation data

## Backup Method (If REST API Doesn't Work)

**Use Connection Pooler instead:**
- Get Data → PostgreSQL database
- Server: `db.vkmpbprvooxgrkwrkbcf.supabase.co`
- Database: `postgres`
- **Port: `6543`** (not 5432!)
- Username: `postgres` 
- Password: `1ldaAvPgdc7nOfts`

## Why This Works

The REST API method completely bypasses SSL certificate validation issues by using HTTP API calls instead of direct database connections.

## Next Steps After Connection

1. Transform data in Power Query Editor if needed
2. Create visualizations (charts, tables, maps)
3. Build dashboard
4. Set up refresh schedule

## Need Help?

If you get any errors, copy the exact error message and let us know. The REST API method has been tested and confirmed working as of 2025-08-13.