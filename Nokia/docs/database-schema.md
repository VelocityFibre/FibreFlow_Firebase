# Nokia Database Schema Documentation

## Table: `nokia_data`

### Purpose
Stores Nokia ONT (Optical Network Terminal) performance monitoring data including signal measurements, equipment status, and location tracking.

### Key Features
- **High-precision signal measurements** using DECIMAL(8,3) for dBm values
- **GPS coordinates** with DECIMAL(10,7) precision for accurate location tracking
- **Project linking** via foreign key to existing projects table
- **Import batch tracking** for data lineage
- **Unique constraints** to prevent duplicate measurements

### Column Definitions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | SERIAL | Primary key | 1 |
| `project_id` | TEXT | Link to projects table | "project-123" |
| `drop_number` | TEXT | Nokia drop identifier | "DR1749954" |
| `serial_number` | TEXT | Equipment serial number | "ALCLB465A671" |
| `olt_address` | TEXT | OLT network address | "law.olt.01:1-1-8-10" |
| `ont_rx_signal_dbm` | DECIMAL(8,3) | ONT receive signal strength | -18.962 |
| `link_budget_ont_olt_db` | DECIMAL(8,3) | Link budget ONT to OLT | -22.71 |
| `olt_rx_signal_dbm` | DECIMAL(8,3) | OLT receive signal strength | -21.4 |
| `link_budget_olt_ont_db` | DECIMAL(8,3) | Link budget OLT to ONT | -26.21 |
| `current_ont_rx` | DECIMAL(8,3) | Current ONT RX power | -19.065783 |
| `status` | TEXT | Equipment status | "Active" |
| `team` | TEXT | Responsible team | "law1" |
| `latitude` | DECIMAL(10,7) | GPS latitude | -26.3820293 |
| `longitude` | DECIMAL(10,7) | GPS longitude | 27.8155606 |
| `measurement_timestamp` | DECIMAL(12,8) | Original Excel timestamp | 45886.54446759259 |
| `measurement_date` | DATE | Measurement date | 2025-08-17 |
| `import_batch_id` | TEXT | Import batch identifier | "batch-20250130-001" |
| `imported_at` | TIMESTAMP | Import timestamp | 2025-01-30 10:30:00 |
| `updated_at` | TIMESTAMP | Last update timestamp | 2025-01-30 10:30:00 |

### Indexes
- **Primary**: `id` (SERIAL)
- **Foreign Key**: `project_id` → `projects(id)`
- **Performance**: `drop_number`, `serial_number`, `status`, `team`, `measurement_date`
- **Spatial**: `(latitude, longitude)`
- **Import Tracking**: `import_batch_id`

### Unique Constraints
- `(drop_number, serial_number, measurement_date)` - Prevents duplicate measurements

### Views
- **`nokia_data_summary`**: Aggregated statistics by project, status, team, and date

### Signal Quality Thresholds
Based on telecom industry standards:
- **Excellent**: > -15 dBm
- **Good**: -15 to -20 dBm
- **Fair**: -20 to -25 dBm
- **Poor**: < -25 dBm

### Data Relationships
- **Projects**: Links via `project_id` to existing project management
- **SOW Data**: Potential correlation with pole/drop installations
- **Pole Tracker**: GPS coordinates may match pole locations
- **Teams**: Correlates with contractor assignments

### Usage Examples
```sql
-- Get all active equipment with good signal quality
SELECT * FROM nokia_data 
WHERE status = 'Active' AND ont_rx_signal_dbm > -20;

-- Team performance summary
SELECT team, AVG(ont_rx_signal_dbm) as avg_signal, COUNT(*) as equipment_count
FROM nokia_data 
GROUP BY team ORDER BY avg_signal DESC;

-- Project equipment summary
SELECT p.name, COUNT(n.id) as nokia_equipment_count
FROM projects p
LEFT JOIN nokia_data n ON p.id = n.project_id
GROUP BY p.name;
```