# VERIFIED OneMap to Neon Field Mapping

**Verified Date**: August 20, 2025  
**Verified Method**: Direct database query to Neon PostgreSQL

## 🗄️ Primary Table: `status_changes`

This is the main table that stores all OneMap data with the following actual columns:

### 📊 Complete Field Mapping (Excel → Neon Database)

| Excel Column Name | Neon Column Name | Data Type | Example Value |
|-------------------|------------------|-----------|---------------|
| Property ID | `property_id` | text | "249111" |
| Pole Number | `pole_number` | text | "LAW.P.B167" |
| Drop Number | `drop_number` | text | null |
| Status | `status` | text | "Pole Permission: Approved" |
| Agent Name | `agent_name` | text | null |
| Location Address | `address` | text | "1 KWENA STREET LAWLEY..." |
| Zone | `zone` | text | null |
| PON/PONs | `pon` | text | null |
| Project Name | `project_name` | text | "Lawley" |
| Permission Date | `permission_date` | timestamp | "2025-07-30T14:34:54.962Z" |
| Signup Date | `signup_date` | timestamp | null |
| Date | `date_stamp` | timestamp | "2025-07-30T14:34:54.962Z" |

### 🔍 Additional Database Columns (Not from Excel)

These columns exist in the database but are system-generated:

- `id` - Auto-increment primary key (bigint)
- `created_at` - When record was imported (timestamp)
- `import_batch_id` - Links to import batch (text)
- `location_lat` - GPS latitude (text)
- `location_lng` - GPS longitude (text)
- `feeder` - Feeder information (text)
- `distribution` - Distribution info (text)
- `contractor` - Contractor assigned (text)
- `pole_planted_date` - When pole was planted (timestamp)
- `stringing_date` - Cable stringing date (timestamp)
- `drop_date` - Drop installation date (timestamp)
- `connected_date` - Connection date (timestamp)
- `flow_name_groups` - Workflow groups (text)
- `source_row` - Original row data (text)
- `raw_data` - Raw import data (text)
- `agent` - Agent info (text) - different from agent_name
- `project` - Project info (text) - different from project_name
- `status_date` - Status change date (timestamp)

## 📋 For PowerBI Users (Essential Fields)

### Main Fields to Use:

```sql
SELECT 
  property_id,      -- Unique property identifier
  pole_number,      -- Pole reference (e.g., "LAW.P.B167")
  drop_number,      -- Drop reference
  status,           -- Current status
  address,          -- Street address
  agent_name,       -- Sales agent
  project_name,     -- Project (usually "Lawley")
  permission_date,  -- When permission granted
  signup_date,      -- When signed up
  created_at        -- When imported to database
FROM status_changes
```

### Status Values in Database:
- "Pole Permission: Approved"
- "Pole Permission: Applied"
- "Pole Permission: Declined"
- "Home Sign Ups: Approved & Installation Scheduled"
- "Home Sign Ups: Declined"
- "Home Installation: In Progress"
- "Home Installation: Installed"
- "Home Installation: To Invoice"

## 🎯 PowerBI Connection Details

### Connection String Components:
- **Server**: ep-long-breeze-a9w7xool.gwc.azure.neon.tech
- **Database**: neondb
- **Port**: 5432
- **SSL Mode**: Require

### PowerBI Setup:
1. Get Data → More → PostgreSQL database
2. Server: `ep-long-breeze-a9w7xool.gwc.azure.neon.tech`
3. Database: `neondb`
4. Data Connectivity mode: Import (recommended)

## ⚠️ Important Notes

1. **Text Fields**: All IDs and numbers are stored as TEXT, not numeric
2. **Null Values**: Many fields can be NULL (empty)
3. **Timestamps**: All dates/times are in UTC
4. **Primary Key**: Use `property_id` as the unique identifier
5. **GPS Coordinates**: Stored as text in `location_lat` and `location_lng`

## 📊 Related Tables

### `status_history`
Tracks all status changes over time:
- `property_id` - Links to status_changes
- `old_status` - Previous status
- `new_status` - New status
- `changed_at` - When change occurred

### `import_batches`
Tracks each Excel import:
- `id` - Batch ID
- `filename` - Excel filename
- `import_date` - When imported
- `total_rows` - Rows in Excel
- `new_records` - New properties added
- `updated_records` - Status updates

---

**This mapping is verified against the actual Neon database as of August 20, 2025**