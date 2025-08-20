# OneMap to Neon to PowerBI - Data Flow Diagram

## 📊 Visual Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OneMap Excel Export                            │
│  (Daily export from 1Map system - 17 columns, ~15K rows)               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Import Script Processing                             │
│           (import-onemap-to-neon.js - runs daily)                       │
│                                                                         │
│  • Validates Excel structure                                            │
│  • Maps columns to database fields                                      │
│  • Detects duplicates & changes                                         │
│  • Creates audit trail                                                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Neon PostgreSQL Database                          │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐│
│  │  status_changes     │  │  status_history     │  │ import_batches  ││
│  │  (Current Status)   │  │  (Change Audit)     │  │ (Import Meta)   ││
│  │                     │  │                     │  │                 ││
│  │ • property_id (PK)  │  │ • id (PK)          │  │ • id (PK)       ││
│  │ • pole_number       │  │ • property_id      │  │ • filename      ││
│  │ • drop_number       │  │ • old_status       │  │ • import_date   ││
│  │ • status            │  │ • new_status       │  │ • total_records ││
│  │ • address           │  │ • changed_at       │  │ • new_records   ││
│  │ • zone              │  │ • changed_by       │  │ • updated       ││
│  │ • pon               │  │                     │  │                 ││
│  │ • agent_name        │  │                     │  │                 ││
│  │ • latitude          │  │                     │  │                 ││
│  │ • longitude         │  │                     │  │                 ││
│  │ • created_at        │  │                     │  │                 ││
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘│
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            PowerBI                                       │
│                                                                         │
│  • Connect via PostgreSQL connector                                     │
│  • Import mode for performance                                          │
│  • Join tables on property_id                                          │
│  • Create measures and visualizations                                   │
│                                                                         │
│  Common Reports:                                                        │
│  - Status Dashboard                                                     │
│  - Installation Progress                                                │
│  - Agent Performance                                                    │
│  - Geographic Analysis (GPS data)                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Key Transformations

### Excel → Database Mapping
```
Excel Column                →  Database Column
─────────────────────────────────────────────
Property ID                 →  property_id (TEXT, Primary Key)
Pole Number                 →  pole_number (TEXT)
Drop Number                 →  drop_number (TEXT)
Status                      →  status (TEXT)
Location Address/Address    →  address (TEXT)
Zone                        →  zone (TEXT)
PON/PONs                    →  pon (TEXT)
Agent Name                  →  agent_name (TEXT)
Latitude                    →  latitude (NUMERIC)
Longitude                   →  longitude (NUMERIC)
Date                        →  date (DATE)
Permission Date             →  permission_date (DATE)
Signup Date                 →  signup_date (DATE)
Project Name                →  project_name (defaults to 'Lawley')
```

## 📝 Data Types & Constraints

| Column | Data Type | Nullable | Notes |
|--------|-----------|----------|--------|
| property_id | TEXT | NO | Primary key, unique |
| pole_number | TEXT | YES | May be empty for new properties |
| drop_number | TEXT | YES | Assigned during installation |
| status | TEXT | NO | Current workflow status |
| address | TEXT | YES | Street address |
| zone | TEXT | YES | Geographic zone |
| pon | TEXT | YES | Passive Optical Network ID |
| agent_name | TEXT | YES | Sales agent |
| latitude | NUMERIC | YES | GPS coordinate |
| longitude | NUMERIC | YES | GPS coordinate |
| created_at | TIMESTAMP | NO | Import timestamp |
| updated_at | TIMESTAMP | NO | Last update time |

## 🎯 PowerBI Connection Steps

1. **Get Data** → More → Database → PostgreSQL
2. **Server**: [Neon server URL]
3. **Database**: [Database name]
4. **Data Connectivity**: Import
5. **Navigator**: Select tables:
   - `status_changes` (main data)
   - `status_history` (for trending)
   - `import_batches` (for metadata)

## 💡 PowerBI Optimization Tips

1. **Create Relationships**:
   ```
   status_changes.property_id ←→ status_history.property_id (1:Many)
   ```

2. **Add Calculated Columns**:
   ```DAX
   Status Category = 
   SWITCH(TRUE(),
       CONTAINSSTRING([status], "Home Sign Ups"), "Sign Up",
       CONTAINSSTRING([status], "Pole Permission"), "Permission",
       CONTAINSSTRING([status], "Installation"), "Installation",
       "Other"
   )
   ```

3. **Common Measures**:
   ```DAX
   Total Properties = DISTINCTCOUNT(status_changes[property_id])
   
   Approval Rate = 
   DIVIDE(
       CALCULATE(COUNT(status_changes[property_id]), 
                 status_changes[status] = "Pole Permission: Approved"),
       [Total Properties]
   )
   ```

---

*This diagram shows the complete data flow from OneMap Excel exports through Neon database to PowerBI reporting*