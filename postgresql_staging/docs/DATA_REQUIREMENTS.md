# OneMap Data Requirements & Schema Design

## Project Context
- **Current Project**: Lawley (first of 5+ projects)
- **Data Source**: OneMap Excel files (daily exports)
- **File Pattern**: `{timestamp}_Lawley_{DDMMYYYY}.xlsx`
- **Location**: `~/Downloads/`

## Critical Requirements

### 1. **Status History Tracking** (MANDATORY)
**Every status change must be tracked and preserved forever.**

- **Current Status**: What is the status RIGHT NOW?
- **Status History**: Complete audit trail of ALL changes
- **Change Detection**: Compare today's file vs yesterday's file
- **Source Tracking**: Which file/import caused the status change
- **Timestamp Tracking**: Exact time of each change

### 2. **Data Structure**
```
Excel File → Daily Import → Status Change Detection → History Recording
```

### 3. **Multiple Projects**
- **Lawley**: Current project (5+ more coming)
- **Schema**: Must support multiple projects
- **Isolation**: Each project's data separate but comparable
- **Scalability**: Handle 5+ projects with daily imports each

## Database Schema Design

### Table 1: `onemap_raw_imports`
**Purpose**: Store every Excel row exactly as imported
```sql
CREATE TABLE onemap_raw_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,          -- 'Lawley', 'Project2', etc.
    import_date TIMESTAMPTZ DEFAULT NOW(),
    source_file TEXT NOT NULL,           -- '1754473447790_Lawley_01082025.xlsx'
    row_number INTEGER,                   -- Original Excel row number
    raw_data JSONB NOT NULL,             -- Complete Excel row as JSON
    processed BOOLEAN DEFAULT FALSE,
    
    UNIQUE(project_name, source_file, row_number)
);
```

### Table 2: `onemap_entities`  
**Purpose**: Current state of each pole/drop/property
```sql
CREATE TABLE onemap_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,           -- 'pole', 'drop', 'property'
    entity_id TEXT NOT NULL,             -- Pole Number, Drop Number, Property ID
    
    -- Current status
    current_status TEXT,
    current_address TEXT,
    current_agent TEXT,
    current_data JSONB,                  -- All current field values
    
    -- Tracking
    first_seen_date TIMESTAMPTZ,        -- When first appeared in imports
    last_updated TIMESTAMPTZ,           -- When last modified
    last_source_file TEXT,              -- Which file caused last update
    
    UNIQUE(project_name, entity_type, entity_id)
);
```

### Table 3: `onemap_status_history` 
**Purpose**: COMPLETE audit trail of every status change
```sql
CREATE TABLE onemap_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    
    -- Change details
    field_name TEXT NOT NULL,            -- 'status', 'agent', 'address', etc.
    old_value TEXT,                      -- Previous value
    new_value TEXT,                      -- New value
    
    -- Change context
    change_date TIMESTAMPTZ DEFAULT NOW(),
    source_file TEXT NOT NULL,
    import_batch_id UUID,               -- Link to import batch
    change_type TEXT DEFAULT 'update',   -- 'create', 'update', 'delete'
    
    -- Never delete from this table!
    INDEX (project_name, entity_id, field_name, change_date)
);
```

### Table 4: `onemap_import_batches`
**Purpose**: Track each daily import process
```sql
CREATE TABLE onemap_import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    source_file TEXT NOT NULL,
    import_started TIMESTAMPTZ DEFAULT NOW(),
    import_completed TIMESTAMPTZ,
    
    -- Statistics
    total_rows INTEGER,
    processed_rows INTEGER,
    new_entities INTEGER,
    updated_entities INTEGER,
    status_changes INTEGER,
    errors INTEGER,
    
    -- Status
    status TEXT DEFAULT 'processing',    -- 'processing', 'completed', 'failed'
    error_details JSONB,
    
    UNIQUE(project_name, source_file)
);
```

## Import Process Flow

### Daily Import Process:
1. **Read Excel File** → Store in `onemap_raw_imports`
2. **Process Each Row**:
   - Extract entity (pole/drop/property)
   - Compare with current state in `onemap_entities`
   - If different → Record change in `onemap_status_history`
   - Update current state in `onemap_entities`
3. **Generate Reports** on what changed

### Status Change Detection:
```sql
-- Example: Detect status changes for a pole
WITH current_state AS (
    SELECT entity_id, current_status 
    FROM onemap_entities 
    WHERE entity_id = 'LAW.P.B167'
),
new_data AS (
    SELECT status_from_excel_import
)
-- If current_status != new_status → Record change
```

## Query Examples

### 1. **Current Status of All Poles**
```sql
SELECT entity_id, current_status, last_updated
FROM onemap_entities 
WHERE project_name = 'Lawley' AND entity_type = 'pole'
ORDER BY entity_id;
```

### 2. **Complete Status History for One Pole**
```sql
SELECT change_date, old_value, new_value, source_file
FROM onemap_status_history
WHERE project_name = 'Lawley' 
  AND entity_id = 'LAW.P.B167'
  AND field_name = 'status'
ORDER BY change_date;
```

### 3. **What Changed Yesterday?**
```sql
SELECT entity_id, field_name, old_value, new_value
FROM onemap_status_history
WHERE project_name = 'Lawley'
  AND change_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY change_date;
```

### 4. **Status Change Report (Daily)**
```sql
SELECT 
    old_value as from_status,
    new_value as to_status,
    COUNT(*) as count
FROM onemap_status_history
WHERE project_name = 'Lawley'
  AND field_name = 'status'
  AND change_date >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY old_value, new_value
ORDER BY count DESC;
```

## File Organization

```
postgresql_staging/
├── docs/
│   ├── DATA_REQUIREMENTS.md          # This file
│   ├── LAWLEY_PROJECT_NOTES.md       # Project-specific notes
│   └── IMPORT_PROCESS_GUIDE.md       # How to run daily imports
├── config/
│   ├── onemap-schema.sql             # Complete schema
│   └── lawley-project-config.json    # Project settings
├── scripts/
│   ├── create-onemap-schema.sh       # Set up tables
│   ├── import-daily-excel.js         # Main import script
│   ├── detect-status-changes.js      # Change detection logic
│   └── generate-daily-report.js      # What changed today
└── data/
    ├── lawley/                       # Lawley project data
    └── project2/                     # Future projects
```

## Critical Rules

1. **NEVER DELETE** from `onemap_status_history` table
2. **ALWAYS TRACK** every field change, not just status
3. **PRESERVE SOURCE** file information for audit trail
4. **DETECT CHANGES** by comparing import vs current state
5. **SUPPORT MULTIPLE PROJECTS** from day one

## Next Steps

1. Create the schema in PostgreSQL
2. Build import script that detects changes
3. Test with Lawley Excel files
4. Verify status history tracking works
5. Create reporting views