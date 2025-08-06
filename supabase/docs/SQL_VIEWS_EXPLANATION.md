# SQL Views Explanation - OneMap to Dashboard Transformation

## Overview
These SQL views transform your raw OneMap Excel data (159 columns) into the exact format shown in your VF_Project_Tracker_Lawley.xlsx Progress Summary dashboard.

## Data Flow
```
OneMap Excel (1754473447790_Lawley_01082025.xlsx)
    ↓ Import to Supabase
status_changes table (normalized structure)
    ↓ SQL Views transform
Dashboard Views (matching Excel layout)
    ↓ Angular displays
Progress Summary Web Page
```

## View-by-View Breakdown

### 1. Build Milestones Summary (`build_milestones_summary`)
**Purpose**: Creates the top section of your Excel dashboard showing overall project progress

**How it works**:
- Counts distinct pole numbers for each milestone type
- Calculates percentages automatically
- Tracks duration in days and months
- Uses status text patterns to identify completed items

**Example mapping**:
```
Excel: "Permissions: 3,732 of 3,732 (100%)"
SQL: WHERE status LIKE '%Permission%Approved%'
Result: {name: "Permissions", scope: 3732, completed: 3732, percentage: 100}
```

### 2. Zone Progress Detail (`zone_progress_detail`)
**Purpose**: Replicates the zone-by-zone breakdown table (Zones 1-20)

**Key transformations**:
- Groups all data by zone number
- Counts homes, poles, and various completion stages
- Calculates all percentages server-side
- Handles null zones gracefully

**Matches Excel columns exactly**:
- Home Count, Permission Scope, Pole Scope, Stringing Scope
- All completed counts and percentages

### 3. Daily Progress 7 Days (`daily_progress_7days`)
**Purpose**: Shows last 7 days of activity (like Excel's daily tracking)

**Features**:
- Automatically filters to last 7 days
- Groups by date with day names
- Counts different activity types per day
- Distinguishes between Stringing D and F types

### 4. Key Milestones (`key_milestones`)
**Purpose**: Project timeline tracking

**Dynamic calculations**:
- Automatically detects when 50% permissions reached
- Tracks actual vs estimated dates
- Updates status based on current data

### 5. Prerequisites (`prerequisites`)
**Purpose**: Static project dependencies list

## Column Mappings from OneMap Excel

Your OneMap Excel has 159 columns. Here's how key columns map to the dashboard:

### Essential Columns Used:
1. **Property ID** → Unique identifier for each property
2. **Address** → Physical location (stored but not displayed)
3. **Zone** → Groups data into zones 1-20
4. **Pole Number** → Tracks pole installations (e.g., LAW.P.B167)
5. **Status** → Current workflow status
6. **Date Stamp** → When status changed
7. **Agent Name** → Who performed the work

### Status Pattern Matching:
The views use SQL LIKE patterns to identify status types:
- `'%Permission%Approved%'` → Permission granted
- `'%Pole%Planted%'` → Pole installed
- `'%Stringing%Complete%'` → Cable strung
- `'%Sign%Up%'` → Customer signed up
- `'%Drop%Complete%'` → Fiber drop completed
- `'%Connected%'` → Home connected

### Date Tracking:
The system tracks separate dates for each milestone:
- `permission_date` → When permission was approved
- `pole_planted_date` → When pole was installed
- `stringing_date` → When stringing completed
- `signup_date` → When customer signed up
- `drop_date` → When drop completed
- `connected_date` → When home connected

## Performance Optimizations

### Indexes Created:
```sql
CREATE INDEX idx_status_changes_project ON status_changes(project_name);
CREATE INDEX idx_status_changes_zone ON status_changes(zone);
CREATE INDEX idx_status_changes_pole ON status_changes(pole_number);
CREATE INDEX idx_status_changes_dates ON status_changes(date_stamp);
```

These ensure fast queries even with 100,000+ records.

## The Master Function
The `get_project_progress_summary()` function returns all dashboard data in one efficient call:

```sql
SELECT * FROM get_project_progress_summary('Lawley');
```

Returns JSON with all 5 views' data, ready for Angular to display.

## Data Import Process

### From OneMap Excel to Supabase:
1. **Upload Excel to Firebase Storage**
2. **Download to local for processing**
3. **Transform to match status_changes schema**
4. **Import to Supabase using CSV or API**

### Required transformations:
- Parse dates to PostgreSQL format
- Extract zone numbers
- Normalize status text
- Handle null/empty values

## Example Data Flow

**OneMap Excel Row**:
```
Property ID: 12345
Address: 74 Market Street
Zone: 5
Pole Number: LAW.P.B167
Status: "Pole Permission: Approved"
Date: 2025-05-22
```

**Transforms to status_changes**:
```sql
INSERT INTO status_changes VALUES (
  DEFAULT,           -- id (auto)
  '12345',          -- property_id
  '74 Market Street', -- address
  'Lawley',         -- project_name
  5,                -- zone
  'John Agent',     -- agent_name
  'LAW.P.B167',     -- pole_number
  NULL,             -- drop_number
  'Pole Permission: Approved', -- status
  '2025-05-22',     -- date_stamp
  'Survey→Permission', -- flow_name_groups
  '2025-05-22',     -- permission_date
  NULL,             -- pole_planted_date (not yet)
  ...
);
```

**Appears in Views as**:
- Build Milestones: +1 to permissions completed
- Zone Progress: Zone 5 gets +1 permission
- Daily Progress: May 22 shows +1 permission

## Testing the Views

Once created in Supabase, test with:

```sql
-- Check build milestones
SELECT * FROM build_milestones_summary;

-- Check specific zone
SELECT * FROM zone_progress_detail WHERE zone = 5;

-- Check today's progress
SELECT * FROM daily_progress_7days LIMIT 1;

-- Get everything at once
SELECT * FROM get_project_progress_summary('Lawley');
```

## Next Steps

1. **Create these views in Supabase SQL Editor**
2. **Import your OneMap data to status_changes table**
3. **Test the views return expected data**
4. **The Angular component will display it automatically**

The beauty of this approach is that all complex calculations happen in the database, making the web page fast and responsive!