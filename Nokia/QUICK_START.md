# Nokia Data Import System - Quick Start Guide

## Overview
The Nokia Data Import System allows you to import Nokia Export.xlsx files into the Neon PostgreSQL database and view the data through an interactive AG Grid interface.

## 📊 **Current Setup**
- **Excel File**: 5,347 Nokia equipment records with 14 columns
- **Database**: `nokia_data` table in Neon PostgreSQL 
- **UI**: AG Grid display at `/nokia-data` with filtering and export
- **Import**: Command-line script with batch processing

## 🚀 **Quick Start Steps**

### 1. Import Nokia Data
```bash
# Navigate to Nokia directory
cd Nokia/

# Run import script (requires NEON_CONNECTION_STRING env var)
node scripts/import-nokia-excel.js "/path/to/Nokia Export.xlsx"

# Or use default path
node scripts/import-nokia-excel.js
```

### 2. View Data in UI
1. Open FibreFlow: https://fibreflow-73daf.web.app
2. Navigate: **Project Management** → **Nokia Equipment Data**
3. View 5,347+ Nokia equipment records with signal measurements
4. Filter by project, status, team, or signal quality
5. Export filtered data to CSV

## 🗄️ **Database Schema**

### Key Features
- **High-precision signal measurements** (DECIMAL for dBm values)
- **GPS coordinates** with 7-decimal precision
- **Project linking** via project_id foreign key
- **Import batch tracking** for data lineage
- **Duplicate prevention** with unique constraints

### Sample Data Structure
```sql
-- Equipment details
drop_number: 'DR1749954'
serial_number: 'ALCLB465A671'
olt_address: 'law.olt.01:1-1-8-10'

-- Signal measurements (high precision)
ont_rx_signal_dbm: -18.962
current_ont_rx: -19.065783
link_budget_ont_olt_db: -22.71

-- Location and metadata
latitude: -26.3820293
longitude: 27.8155606
status: 'Active'
team: 'law1'
measurement_date: '2025-08-17'
```

## 📈 **Key Features**

### 1. **Signal Quality Analysis**
- **Excellent**: > -15 dBm (Green)
- **Good**: -15 to -20 dBm (Light Green) 
- **Fair**: -20 to -25 dBm (Orange)
- **Poor**: < -25 dBm (Red)

### 2. **AG Grid Interface**
- **Real-time filtering** by project, status, team, signal quality
- **Smart column rendering** with color-coded signal quality
- **GPS coordinates** with clickable Google Maps links
- **Equipment status** with active/inactive indicators
- **Team assignments** with badge display

### 3. **Summary Dashboard**
- Total equipment count
- Active vs inactive equipment
- Team distribution
- Average signal strength
- Last measurement date

## 🔗 **Integration Points**

### Current Links
- **Projects**: Filter Nokia data by existing project
- **Teams**: Team assignments match contractor data structure

### Planned Links (Future)
- **SOW Data**: Cross-reference pole installations with Nokia equipment
- **Pole Tracker**: GPS coordinate correlation with pole locations  
- **Contractors**: Team performance analytics

## 🛠️ **Import Features**

### Batch Processing
- Processes records in batches of 100 for performance
- Handles 5,000+ records efficiently
- Automatic error handling and reporting

### Data Validation
- Required field validation (Drop Number, Serial Number)
- Signal strength parsing with error handling
- Date format standardization
- Duplicate detection and conflict resolution

### Import Tracking
- Unique batch IDs for each import
- Import timestamps and metadata
- Error reporting and statistics
- Update existing records on conflict

## 📊 **Usage Examples**

### Find Equipment with Poor Signal
```sql
SELECT drop_number, serial_number, ont_rx_signal_dbm, team
FROM nokia_data 
WHERE ont_rx_signal_dbm < -25
ORDER BY ont_rx_signal_dbm ASC;
```

### Team Performance Analysis
```sql
SELECT team, 
       COUNT(*) as equipment_count,
       AVG(ont_rx_signal_dbm) as avg_signal,
       COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count
FROM nokia_data 
GROUP BY team 
ORDER BY avg_signal DESC;
```

### Project Equipment Summary
```sql
SELECT p.name as project_name,
       COUNT(n.id) as nokia_equipment_count,
       AVG(n.ont_rx_signal_dbm) as avg_signal_strength
FROM projects p
LEFT JOIN nokia_data n ON p.id = n.project_id
GROUP BY p.name;
```

## ⚠️ **Requirements**

### Environment Variables
```bash
# Required for import script
NEON_CONNECTION_STRING="postgresql://user:pass@host/db"

# Or use DATABASE_URL as fallback
DATABASE_URL="postgresql://user:pass@host/db"
```

### Dependencies
- **Node.js**: xlsx package for Excel processing
- **Neon Database**: PostgreSQL connection
- **Angular**: Frontend display system

### File Access
- Excel file path: `/home/ldp/Downloads/Nokia Export.xlsx` (default)
- Script location: `Nokia/scripts/import-nokia-excel.js`
- Route: `/nokia-data` in FibreFlow application

## 🎯 **Next Steps**

1. **Run initial import** to populate database
2. **Test UI navigation** and filtering features  
3. **Set up project linking** to existing projects
4. **Plan automated imports** for regular updates
5. **Integrate with SOW/Pole Tracker** data for comprehensive view

## 📞 **Support**

- **UI Issues**: Check browser console, refresh cache
- **Import Errors**: Verify NEON_CONNECTION_STRING environment variable
- **Data Questions**: Check Nokia/docs/database-schema.md
- **Performance**: Large datasets may take 30-60 seconds to import