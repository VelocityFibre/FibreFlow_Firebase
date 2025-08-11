# Excel Import System with Validation & Status Tracking

## Overview

This system allows you to import new Excel files directly to Neon with:
- ✅ Complete data validation
- 🚫 Duplicate prevention
- 📊 Status change tracking
- 📋 Complete audit history
- 🔄 Safe updates without data loss

## Key Features

### 1. **Smart Duplicate Handling**
- Uses `property_id` as unique identifier
- Updates existing records only when status changes
- Skips records with no meaningful changes
- Never creates duplicates

### 2. **Status Change Tracking**
- Records every status transition in `status_history` table
- Maintains complete audit trail
- Tracks who/when/what changed
- Validates status progression workflow

### 3. **Data Validation**
- Validates required fields (Property ID)
- Checks status against known workflow
- Validates date formats
- Warns about non-standard pole numbers

### 4. **Batch Management**
- Each import gets unique batch ID
- Tracks import statistics
- Records validation errors
- Maintains import history

## Usage

### Import a New Excel File
```bash
# Import new Excel file
node Neon/scripts/import-excel-with-validation.js /path/to/file.xlsx

# Example
node Neon/scripts/import-excel-with-validation.js /home/ldp/Downloads/Lawley_15082025.xlsx
```

### View Status Changes
```bash
# Recent status changes
node Neon/scripts/view-status-history.js recent 50

# History for specific property
node Neon/scripts/view-status-history.js property 249111

# History for specific pole
node Neon/scripts/view-status-history.js pole LAW.P.B167

# Import batch history
node Neon/scripts/view-status-history.js batches

# Statistics and trends
node Neon/scripts/view-status-history.js stats
```

## Status Workflow

The system recognizes these status progressions:

1. **Planned** → Initial state
2. **Pole Permission: Declined** → Permission denied
3. **Pole Permission: Approved** → Pole can be planted
4. **Home Sign Ups: Declined** → Customer declined
5. **Home Sign Ups: Approved & Installation Scheduled** → Customer signed up
6. **Home Sign Ups: Approved & Installation Re-scheduled** → Rescheduled
7. **Home Sign Ups: Declined Changed to Approved** → Customer changed mind
8. **Home Installation: In Progress** → Installation started
9. **Home Installation: Declined** → Installation failed
10. **Home Installation: Installed** → Fully complete

## Database Tables

### 1. `status_changes` (Main Data)
- Primary table with current state of each property
- Unique constraint on `property_id`
- Contains all pole/property information

### 2. `status_history` (Audit Trail)
- Records every status change
- Links to import batch
- Maintains complete history
- Never deleted or modified

### 3. `import_batches` (Import Tracking)
- Each Excel import gets unique batch ID
- Tracks statistics and errors
- Useful for troubleshooting

## Import Process Flow

```
1. Create Import Batch
   ↓
2. Read Excel File
   ↓
3. Validate All Rows
   ↓
4. Process Each Row:
   - Check if property exists
   - Compare status changes
   - Update or insert record
   - Record status change in history
   ↓
5. Generate Summary Report
   ↓
6. Update Batch Statistics
```

## Safety Features

### No Data Loss
- Never deletes existing data
- Only updates when status actually changes
- Maintains complete history in `status_history`

### Validation Before Import
- All rows validated before any changes
- Shows validation issues before proceeding
- Continues import even with warnings

### Rollback Capability
```sql
-- View what was imported in a batch
SELECT * FROM status_history WHERE import_batch_id = 'BATCH_1234567890';

-- Rollback a batch (if needed)
-- This would require custom rollback script
```

## Example Import Output

```
📄 EXCEL IMPORT WITH VALIDATION & TRACKING
═══════════════════════════════════════════════════════════════
File: Lawley_15082025.xlsx
Batch ID: BATCH_1736845234_Lawley_15082025.xlsx

📊 Found 15651 rows to process

🔍 Validating data...
✅ All data validated successfully

📤 Processing rows...

📝 Updated: Property 249111 - Status: Pole Permission: Approved → Home Sign Ups: Approved & Installation Scheduled
✅ New: Property 249112 - Status: Pole Permission: Approved
⏭️ Skipped: Property 249113 - No changes detected

📊 IMPORT SUMMARY
═══════════════════════════════════════════════════════════════
Total Rows: 15651
✅ New Records: 1250
📝 Updated Records: 890
⏭️ Skipped (No Changes): 13511
❌ Errors: 0
⚠️ Validation Issues: 3

📋 Recent Status Changes:
   249111: Pole Permission: Approved → Home Sign Ups: Approved & Installation Scheduled
   249115: [New Record] → Pole Permission: Approved
```

## Benefits

### ✅ **Safe & Reliable**
- No duplicate entries
- No data loss
- Complete audit trail
- Validation before changes

### 📊 **Comprehensive Tracking**
- Every status change recorded
- Import batch tracking
- Historical reporting
- Performance metrics

### 🔍 **Data Quality**
- Validates all data before import
- Reports validation issues
- Handles data quality problems gracefully

### 🚀 **Production Ready**
- Handles large files efficiently
- Robust error handling
- Detailed logging and reporting
- Batch processing with resume capability

## Troubleshooting

### Common Issues

1. **File Not Found**
   ```
   Solution: Check file path and permissions
   ```

2. **Validation Errors**
   ```
   Solution: Review validation report, fix Excel file if needed
   ```

3. **Connection Issues**
   ```
   Solution: Check Neon database connection
   ```

### Getting Help

```bash
# View recent import batches
node Neon/scripts/view-status-history.js batches

# Check for errors in recent imports
node Neon/scripts/view-status-history.js stats

# View specific property history to understand changes
node Neon/scripts/view-status-history.js property <property-id>
```

## Recommended Workflow

### For New Excel Files:

1. **First: Compare with Existing Data**
   ```bash
   # Check what changes exist before importing
   node Neon/scripts/compare-excel-with-neon.js /path/to/new-file.xlsx
   ```

2. **If No Changes Detected:**
   - Log the result in `Neon/logs/import-processing-log.md`
   - No import needed - data is already current
   - Move to next file

3. **If Changes Detected:**
   ```bash
   # Import the changes
   node Neon/scripts/fast-excel-import.js /path/to/new-file.xlsx
   ```

4. **Review Import Results**
   - Check summary statistics
   - Review any validation warnings
   - Spot-check status changes

5. **Log Processing Results**
   - Update `Neon/logs/import-processing-log.md`
   - Document file name, date, and results
   - Note any issues or special findings

6. **Monitor Status Changes**
   ```bash
   node Neon/scripts/view-import-batches.js
   ```

### **Production Workflow Summary:**
1. Compare → 2. Import (if needed) → 3. Log results → 4. Move to next file

This system ensures you can safely import new Excel files without losing data, while maintaining complete visibility into all changes made to your pole and property data.