# OneMap Excel to Neon Database Field Mapping Guide

*Last Updated: 2025-01-30*

## Overview
This document provides a comprehensive mapping between OneMap Excel export columns and the Neon PostgreSQL database tables for PowerBI users and data analysts.

## Primary Tables in Neon

### 1. `status_changes` Table
The main table storing current status of all properties/poles from OneMap imports.

| Excel Column Name | Neon Column Name | Data Type | Description | Notes |
|------------------|------------------|-----------|-------------|-------|
| Property ID | `property_id` | VARCHAR | Unique property identifier | Primary Key |
| Pole Number | `pole_number` | VARCHAR | Pole identifier (e.g., LAW.P.B167) | Nullable |
| Drop Number | `drop_number` | VARCHAR | Drop/fiber connection ID | Nullable |
| Status | `status` | VARCHAR | Current installation status | Required |
| Location Address | `address` | VARCHAR | Property physical address | Nullable |
| Zone | `zone` | VARCHAR | Installation zone/area | Nullable |
| PON/PONs | `pon` | VARCHAR | Passive Optical Network ID | Nullable |
| Agent Name | `agent_name` | VARCHAR | Field agent/contractor name | Nullable |
| Permission Date | `permission_date` | DATE | Date permission granted | Nullable |
| Signup Date | `signup_date` | DATE | Customer signup date | Nullable |
| Project Name | `project_name` | VARCHAR | Project identifier | Defaults to 'Lawley' |
| (Auto-generated) | `import_batch_id` | VARCHAR | Import batch tracking ID | System field |
| (Auto-generated) | `created_at` | TIMESTAMP | Record creation timestamp | System field |
| (Auto-generated) | `updated_at` | TIMESTAMP | Last update timestamp | System field |

### 2. `status_history` Table
Tracks all status changes over time for audit and analytics.

| Neon Column Name | Data Type | Description |
|------------------|-----------|-------------|
| `id` | SERIAL | Auto-increment primary key |
| `property_id` | VARCHAR | Property that changed |
| `pole_number` | VARCHAR | Associated pole (if any) |
| `old_status` | VARCHAR | Previous status (NULL for new) |
| `new_status` | VARCHAR | New status value |
| `changed_at` | TIMESTAMP | When change occurred |
| `import_batch_id` | VARCHAR | Which import caused change |

### 3. `import_batches` Table
Metadata about each Excel file import.

| Neon Column Name | Data Type | Description |
|------------------|-----------|-------------|
| `id` | VARCHAR | Unique batch identifier |
| `filename` | VARCHAR | Original Excel filename |
| `import_date` | TIMESTAMP | When import occurred |
| `total_rows` | INTEGER | Total rows in Excel |
| `processed_rows` | INTEGER | Successfully processed |
| `error_rows` | INTEGER | Failed rows count |
| `status` | VARCHAR | 'completed', 'failed', 'in_progress' |

### 4. `onemap_import_batches` Table (Alternative Import Tracking)
Used by the Angular/TypeScript import service.

| Neon Column Name | Data Type | Description |
|------------------|-----------|-------------|
| `id` | UUID | Auto-generated unique ID |
| `file_name` | VARCHAR | Excel filename |
| `import_date` | TIMESTAMP | Import timestamp |
| `record_count` | INTEGER | Records imported |
| `status` | VARCHAR | Import status |
| `created_by` | VARCHAR | User who imported |

### 5. `onemap_status_changes` Table (Alternative Status Storage)
Alternative status tracking used by some services.

| Excel Column | Neon Column | Notes |
|--------------|-------------|-------|
| Property ID | `property_id` | |
| Pole Number | `pole_number` | |
| Drop Number | `drop_number` | |
| Status | `status` | |
| Date | `status_date` | |
| Zone | `zone` | |
| Feeder | `feeder` | Additional field |
| Distribution | `distribution` | Additional field |
| Contractor/Agent | `contractor` | |
| (All columns) | `raw_data` | JSONB - stores entire Excel row |

## Status Values
Common status values found in the Excel files:

1. **Pole Permission: Approved** - Permission granted to install pole
2. **Pole Permission: Declined** - Permission denied
3. **Home Sign Ups: Approved & Installation Scheduled** - Customer signed up
4. **Home Sign Ups: Declined** - Customer declined service
5. **Home Installation: In Progress** - Installation underway
6. **Home Installation: Installed** - Completed installation
7. **Home Sign Ups: Approved & Installation Re-scheduled** - Rescheduled
8. **Home Sign Ups: Declined Changed to Approved** - Status change

## PowerBI Connection Details

### Connection String
```
Host: ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech
Database: neondb
Port: 5432
SSL Mode: Require
User: neondb_owner
Password: npg_AlX83ojfZpBk
```

### PowerBI SQL Queries

#### Get Current Status for All Properties
```sql
SELECT 
    property_id,
    pole_number,
    drop_number,
    status,
    address,
    zone,
    agent_name,
    permission_date,
    signup_date,
    updated_at
FROM status_changes
ORDER BY updated_at DESC;
```

#### Get Status Change History
```sql
SELECT 
    sh.property_id,
    sh.pole_number,
    sh.old_status,
    sh.new_status,
    sh.changed_at,
    sh.import_batch_id,
    ib.filename as source_file
FROM status_history sh
LEFT JOIN import_batches ib ON sh.import_batch_id = ib.id
ORDER BY sh.changed_at DESC;
```

#### Status Summary by Zone
```sql
SELECT 
    zone,
    status,
    COUNT(*) as count,
    MAX(updated_at) as last_update
FROM status_changes
GROUP BY zone, status
ORDER BY zone, count DESC;
```

#### Agent Performance Metrics
```sql
SELECT 
    agent_name,
    COUNT(DISTINCT property_id) as total_properties,
    COUNT(DISTINCT CASE WHEN status LIKE '%Installed%' THEN property_id END) as completed,
    COUNT(DISTINCT CASE WHEN status LIKE '%In Progress%' THEN property_id END) as in_progress,
    COUNT(DISTINCT CASE WHEN status LIKE '%Declined%' THEN property_id END) as declined
FROM status_changes
WHERE agent_name IS NOT NULL
GROUP BY agent_name
ORDER BY total_properties DESC;
```

## Data Import Process

1. **Excel File Upload** → Via FibreFlow web interface or scripts
2. **Validation** → Property ID required, status validation
3. **Duplicate Check** → Based on property_id uniqueness
4. **Status Comparison** → Only updates if status changed
5. **History Recording** → All changes logged to status_history
6. **Batch Tracking** → Import metadata stored

## Important Notes for PowerBI Users

1. **Primary Key**: `property_id` is unique in `status_changes`
2. **Latest Data**: `status_changes` always has current status
3. **History**: Use `status_history` for time-series analysis
4. **Batch Info**: Join with `import_batches` to trace data source
5. **Timezone**: All timestamps are in UTC
6. **NULL Handling**: Many fields are nullable - handle in PowerBI
7. **Case Sensitivity**: PostgreSQL is case-sensitive for string comparisons

## Common PowerBI Transformations

### Convert UTC to Local Time
```powerquery
= Table.AddColumn(Source, "LocalTime", each DateTimeZone.From([updated_at], "UTC"))
```

### Clean Pole Numbers
```powerquery
= Table.TransformColumns(Source, {{"pole_number", each Text.Trim(_), type text}})
```

### Extract Zone from Pole Number
```powerquery
= Table.AddColumn(Source, "ExtractedZone", each Text.BeforeDelimiter([pole_number], "."))
```

## Support Contacts
For database access issues or additional fields needed, contact the FibreFlow technical team.