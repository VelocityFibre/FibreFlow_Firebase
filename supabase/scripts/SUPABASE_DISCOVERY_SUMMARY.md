# Supabase Database Discovery Summary

## Date: 2025-08-11
## Database: vkmpbprvooxgrkwrkbcf.supabase.co

## Key Findings

### 1. Active Tables
Only one table contains data:
- **`status_changes`** - 15,651 records
  - Contains OneMap import data
  - Tracks pole permissions, home installations, etc.
  - Has multiple date fields but most are null
  - Main status values:
    - "Pole Permission: Approved" (most common)
    - "Home Installation: In Progress" 
    - "Home Installation: Declined"
    - Empty status (698 records)

### 2. Empty Tables
These tables exist but have no data:
- `status_change` (singular version)
- `onemap_status_changes`
- `pole_status_changes`
- `drop_status_changes`
- `poles`
- `drops`
- `properties`
- `addresses`
- `agents`
- `users`
- `profiles`

### 3. Views
The following views were detected but couldn't be queried:
- `status_summary`
- `pole_summary`
- `agent_performance`
- `daily_stats`
- `weekly_stats`
- `project_summary`

### 4. RPC Functions
No RPC functions were found. Common function names tested but not found:
- `get_status_changes`
- `get_status_change_counts`
- `get_unique_values`
- `get_agent_stats`
- `get_pole_stats`

### 5. Access Limitations
- Cannot access `information_schema` tables
- Cannot list functions/procedures
- Views exist but return schema cache errors

## Status Changes Table Structure

```json
{
  "id": "integer (primary key)",
  "property_id": "text",
  "pole_number": "text (e.g., LAW.P.D410)",
  "drop_number": "text (e.g., DR1752822)",
  "status": "text",
  "status_date": "timestamp (mostly null)",
  "agent": "text (mostly null)",
  "address": "text",
  "location_lat": "numeric (null)",
  "location_lng": "numeric (null)",
  "zone": "text (null)",
  "feeder": "text (null)",
  "distribution": "text (null)",
  "pon": "text (null)",
  "project": "text (null)",
  "contractor": "text (null)",
  "created_at": "timestamp (always populated)",
  "import_batch_id": "text (null)",
  "source_row": "integer (null)",
  "raw_data": "jsonb (null)",
  "agent_name": "text (some values like 'fibertime')",
  "connected_date": "timestamp (null)",
  "permission_date": "timestamp (5,289 non-null)",
  "pole_planted_date": "timestamp (null)",
  "stringing_date": "timestamp (null)",
  "signup_date": "timestamp (7,674 non-null)",
  "drop_date": "timestamp (null)",
  "date_stamp": "timestamp (always populated)",
  "flow_name_groups": "text (null)",
  "project_name": "text (only 'Lawley' found)"
}
```

## Key Observations

1. **Single Project**: All data is for "Lawley" project
2. **Multiple Status Changes**: Some poles have up to 350 status changes
3. **Date Fields**: Most specific date fields are empty except:
   - `permission_date` (5,289 records)
   - `signup_date` (7,674 records)
   - `date_stamp` and `created_at` (all records)
4. **Missing Data**: No lat/lng coordinates, zones, feeders, or distribution data
5. **Agent Names**: Some records have agent names like "fibertime", "Tamuka(fibertime)"

## Recommendations

1. **Create Missing Functions**: Need to create RPC functions for:
   - Getting unique values
   - Counting by status
   - Date range queries
   - Agent statistics

2. **Fix Views**: The views exist but have schema issues. Need to:
   - Check view definitions
   - Ensure proper permissions
   - Fix schema cache issues

3. **Data Quality**: Many fields are null that should probably have data:
   - GPS coordinates
   - Zone/Feeder/Distribution
   - Most date fields

4. **Normalization**: Consider populating the empty tables:
   - `poles` - Unique pole records
   - `drops` - Unique drop records
   - `agents` - Agent master data
   - `properties` - Property master data