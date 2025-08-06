# Next Steps - Supabase Integration

✅ **Completed**:
1. Created Supabase project "1Map Data"
2. Saved credentials in documentation
3. Updated environment files with Supabase URL and API key
4. Updated Environment type to include Supabase properties

## 🚀 Immediate Next Steps

### 1. Install Supabase Client Library
```bash
npm install @supabase/supabase-js
```

### 2. Create Database Schema in Supabase

The SQL views in `/supabase/sql/create_progress_views.sql` will transform your OneMap Excel data (with 159 columns) into the exact format shown in your VF_Project_Tracker_Lawley.xlsx dashboard.

**What the SQL does:**
1. Creates a `status_changes` table to hold OneMap data
2. Creates 5 views that match your Excel dashboard sections:
   - **Build Milestones Summary** - Overall project progress (Permissions, Poles, Stringing, etc.)
   - **Zone Progress Detail** - Zone-by-zone breakdown (Zones 1-20)
   - **Daily Progress 7 Days** - Last week's daily activity
   - **Key Milestones** - Project timeline tracking
   - **Prerequisites** - Project dependencies

**To run the SQL:**
1. Go to: https://supabase.com/dashboard/project/vkmpbprvooxgrkwrkbcf/sql
2. Copy the SQL from `/supabase/sql/create_progress_views.sql`
3. Paste and run in SQL Editor
4. You should see "Success" messages for each CREATE statement

**How it maps your OneMap data:**
- Uses status text patterns (e.g., "Permission: Approved" → counts as permission)
- Groups by zone numbers for zone progress
- Calculates all percentages server-side
- Tracks separate dates for each milestone type

See `/supabase/docs/SQL_VIEWS_EXPLANATION.md` for detailed column mappings.

### 3. Import OneMap Data

#### Option A: Quick Manual Import (For Testing)
1. Export sample data from OneMap SQL:
```bash
cd OneMap/SQL/scripts
sqlite3 ../database/onemap.db
.headers on
.mode csv
.output sample_data.csv
SELECT * FROM status_changes LIMIT 1000;
.quit
```

2. Use Supabase Table Editor to import CSV

#### Option B: Full Migration Script
Create `/supabase/scripts/migrate-onemap-data.js`:
```javascript
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vkmpbprvooxgrkwrkbcf.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // Get from dashboard
);

const db = new Database('OneMap/SQL/database/onemap.db');

async function migrate() {
  // Get data from SQLite
  const rows = db.prepare('SELECT * FROM status_changes').all();
  
  // Insert to Supabase in batches
  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('status_changes')
      .insert(batch);
    
    if (error) console.error('Batch error:', error);
    else console.log(`Migrated ${i + batch.length} records`);
  }
}

migrate();
```

### 4. Test the Progress Summary Page

1. Make sure the app builds:
```bash
npm run build
```

2. Run locally:
```bash
ng serve
```

3. Navigate to: http://localhost:4200/analytics/project-progress

### 5. Enable Row Level Security (Important!)

Run this SQL in Supabase:
```sql
-- Enable RLS on status_changes table
ALTER TABLE status_changes ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for authenticated users
CREATE POLICY "Allow read access for all users" ON status_changes
  FOR SELECT USING (true);
```

## 📊 Quick Data Check

Run this in Supabase SQL Editor to verify data:
```sql
-- Check if data imported
SELECT COUNT(*) FROM status_changes;

-- Test a view
SELECT * FROM build_milestones_summary LIMIT 10;

-- Check zone progress
SELECT * FROM zone_progress_detail WHERE zone <= 5;
```

## 🐛 Troubleshooting

### If page shows "No data":
1. Check browser console for errors
2. Verify Supabase credentials in environment files
3. Check if data exists in Supabase tables
4. Ensure SQL views were created successfully

### If you get CORS errors:
1. Check Supabase dashboard > Settings > API
2. Verify your domain is allowed
3. For local dev, http://localhost:4200 should work by default

### If queries are slow:
1. Add indexes to frequently queried columns
2. Consider materialized views for complex calculations
3. Use pagination for large datasets

## 📱 Deploy to Firebase

Once everything works locally:
```bash
deploy "Added Supabase analytics integration"
```

Then access at: https://fibreflow-73daf.web.app/analytics/project-progress

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Page loads without errors
2. ✅ Build milestones show percentages
3. ✅ Zone progress table displays all 20 zones
4. ✅ Daily progress shows last 7 days
5. ✅ Key milestones and prerequisites tabs work

## 📞 Need Help?

- Supabase Discord: https://discord.supabase.com
- Supabase Docs: https://supabase.com/docs
- Check `/supabase/docs/` for project-specific documentation