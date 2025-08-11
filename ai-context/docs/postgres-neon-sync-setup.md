# PostgreSQL to Neon Sync Setup Documentation

**Date**: January 30, 2025  
**Purpose**: Guide for syncing data from local PostgreSQL to Neon cloud database

## 📋 Sync Options Prepared

### 1. Shell Script (`sync-local-postgres-to-neon.sh`)

- Uses `pg_dump` and `psql` commands
- Most reliable method
- Options to sync entire database or specific tables
- Shows table sizes and row counts

### 2. Node.js Script (`sync-postgres-to-neon.js`)

- Uses the `pg` package
- Syncs table by table with progress indicators
- Handles data in batches for large tables

## 🔧 Configuration

Both scripts are configured to look for:
- **Database name**: `onemap`
- **User**: `postgres`
- **Host**: `localhost`
- **Port**: `5432`

You can edit these values in the scripts if your setup is different.

## 📝 When You're Ready

Once you have your local PostgreSQL set up with the OneMap data, you can run either:

### Option 1: Shell script (recommended)
```bash
./Neon/scripts/sync-local-postgres-to-neon.sh
```

### Option 2: Node.js script
```bash
node Neon/scripts/sync-postgres-to-neon.js
```

Both will sync your data from local PostgreSQL to Neon, and then you can run the performance comparison with Supabase!

## 🚀 Next Steps

After syncing is complete, you can:
1. Verify data integrity in Neon dashboard
2. Run performance comparison tests
3. Compare query execution times between Supabase and Neon
4. Analyze the results for your specific use case

## 📊 Expected Outcomes

- Full data migration from local PostgreSQL to Neon
- Ability to compare performance metrics
- Insights into which platform better suits your needs

---

*Note: Ensure your local PostgreSQL server is running and accessible before starting the sync process.*