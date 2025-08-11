# Standard Operating Procedure: SQLite to Supabase Sync

*Last Updated: 2025-01-30*  
*Purpose: Sync OneMap SQLite data to Supabase for web access*

## Prerequisites
- Access to Supabase project dashboard
- SQLite database at `/home/ldp/VF/Apps/FibreFlow/OneMap/SQL/onemap.db`
- Node.js environment with required dependencies

## Step-by-Step Process

### Step 1: Verify Source Database
```bash
# Check record count in SQLite
cd /home/ldp/VF/Apps/FibreFlow/OneMap/SQL
sqlite3 onemap.db "SELECT COUNT(DISTINCT property_id) FROM status_changes;"
```
Record this number for validation later.

### Step 2: Prepare Supabase Schema
Before running the sync, ensure Supabase has all required columns.

#### 2.1 Check Existing Schema
In Supabase SQL Editor, run:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'status_changes'
ORDER BY column_name;
```

#### 2.2 Add Missing Columns (if needed)
If any columns are missing, run this SQL in Supabase:
```sql
-- Add all required columns
ALTER TABLE status_changes 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS date_stamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flow_name_groups TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS zone INTEGER,
ADD COLUMN IF NOT EXISTS connected_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS permission_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pole_planted_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stringing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS drop_date TIMESTAMP WITH TIME ZONE;
```

#### 2.3 Set Up Auto-Increment ID
If the ID column doesn't auto-generate:
```sql
-- Create sequence for auto-increment
CREATE SEQUENCE IF NOT EXISTS status_changes_id_seq;

-- Set ID to use sequence
ALTER TABLE status_changes 
ALTER COLUMN id SET DEFAULT nextval('status_changes_id_seq');

-- Link sequence to column
ALTER SEQUENCE status_changes_id_seq OWNED BY status_changes.id;

-- Start sequence at appropriate value
SELECT setval('status_changes_id_seq', COALESCE((SELECT MAX(id) FROM status_changes), 1));
```

### Step 3: Update Sync Script Path (if needed)
Check that the sync script points to the correct database:
```bash
cd /home/ldp/VF/Apps/FibreFlow/supabase/scripts
grep "SQLITE_DB_PATH" sync-from-onemap-sqlite.js
```

Should show:
```javascript
const SQLITE_DB_PATH = path.join(__dirname, '../../OneMap/SQL/onemap.db');
```

If it shows `scripts/onemap.db`, update it to remove `scripts/`.

### Step 4: Run the Sync
```bash
cd /home/ldp/VF/Apps/FibreFlow/supabase/scripts
node sync-from-onemap-sqlite.js
```

Expected output:
```
🚀 Starting OneMap SQLite → Supabase sync...
📊 Analyzing SQLite database...
📈 Database Statistics:
   Total Records: [number]
   ...
📤 Importing to Supabase...
   Batch 1/X (1000 records)...
   ...
✅ Successfully synced: [number] records
```

### Step 5: Validate Results
After sync completes, verify in Supabase SQL Editor:
```sql
-- Check total count
SELECT COUNT(*) FROM status_changes;

-- Check sample data
SELECT * FROM status_changes LIMIT 5;

-- Verify unique properties
SELECT COUNT(DISTINCT property_id) FROM status_changes;
```

The counts should match your SQLite source exactly.

## Troubleshooting

### Common Issues and Solutions

1. **"Column not found" errors**
   - Solution: Run Step 2.2 to add missing columns

2. **"null value in column id" errors**
   - Solution: Run Step 2.3 to set up auto-increment

3. **Wrong record count**
   - Check database path in sync script
   - Verify you're using main database, not scripts folder

4. **Sync timeout**
   - Normal for large datasets
   - Check Supabase dashboard for partial data
   - Re-run sync (it clears old data first)

## Important Notes

1. **Data Clearing**: The sync script clears ALL existing data in Supabase before importing
2. **No Incremental Sync**: This is a full replacement sync, not incremental
3. **Database Location**: Always use `/OneMap/SQL/onemap.db`, NOT `/OneMap/SQL/scripts/onemap.db`
4. **Schema Must Match**: Supabase schema must have all columns that SQLite is sending

## Post-Sync Checklist
- [ ] Record count matches source
- [ ] Sample data looks correct
- [ ] No error messages in sync output
- [ ] Update sync report in `/sync/reports/`
- [ ] Note sync date and record count

## Quick Reference Commands
```bash
# Check SQLite count
sqlite3 /home/ldp/VF/Apps/FibreFlow/OneMap/SQL/onemap.db "SELECT COUNT(*) FROM status_changes;"

# Run sync
cd /home/ldp/VF/Apps/FibreFlow/supabase/scripts && node sync-from-onemap-sqlite.js

# Check Supabase count (in SQL Editor)
SELECT COUNT(*) FROM status_changes;
```

---
*This SOP ensures consistent, reliable syncing of SQLite data to Supabase*