# OneMap SQLite Processor

A powerful SQLite-based tool for processing OneMap Excel exports directly, eliminating CSV conversion risks and providing fast analytics.

## Features

- **Direct Excel Import** - No CSV conversion needed
- **Automatic Column Detection** - Maps common column variations
- **Duplicate Detection** - Prevents redundant data
- **Fast Analytics** - SQL-powered queries in milliseconds
- **Multiple Export Formats** - Excel, CSV, JSON
- **Pole Capacity Tracking** - Monitor drop limits
- **Agent Performance Metrics** - Track productivity
- **Time-based Analysis** - Daily, weekly, monthly reports

## Installation

```bash
cd OneMap/sqlite-prototype
npm install
```

## Usage

### 1. Import Excel File

```bash
# Import your OneMap Excel export
npm run import path/to/onemap_export.xlsx

# Import specific sheet
node src/cli.js import file.xlsx --sheet "Sheet2"

# Clear existing data before import
node src/cli.js import file.xlsx --clear
```

### 2. View Statistics

```bash
# Show database statistics
node src/cli.js stats
```

### 3. Run Analytics

```bash
# Interactive analytics menu
npm run analyze
```

Available analyses:
- First Approvals by Pole
- Agent Performance Summary
- Status Distribution
- Daily Activity Timeline
- Pole Capacity Analysis
- Duplicate Detection
- Monthly Reports
- Custom SQL Queries

### 4. Export Results

After any analysis, you can export results to:
- Excel (.xlsx)
- CSV (.csv)
- JSON (.json)

## Example Workflow

```bash
# 1. Import OneMap Excel file
npm run import ~/Downloads/onemap_august_2025.xlsx

# 2. Check import statistics
node src/cli.js stats

# 3. Run analytics
npm run analyze
# Select "First Approvals by Pole"
# Export results to Excel

# 4. Generate monthly report
npm run analyze
# Select "Generate Monthly Report"
# Enter year: 2025
# Enter month: 8
```

## Database Schema

### status_changes
- Stores all status change records
- Indexed on pole_number, drop_number, status_date
- Tracks agent, location, and metadata

### pole_capacity
- Monitors drops per pole
- Enforces 12-drop maximum
- Updates automatically on import

### import_batches
- Tracks import history
- Records errors and duplicates
- Maintains audit trail

## Performance

- Import: ~1000 records/second
- Queries: <100ms for most analytics
- Handles 100,000+ records easily

## Column Mapping

The importer automatically detects common column variations:
- "Property ID" → property_id
- "Pole Number" → pole_number
- "Drop Number" → drop_number
- "Status" → status
- "Date Changed" → status_date
- And many more...

## Custom Queries

You can run custom SQL queries:

```sql
-- Example: Find poles with most drops
SELECT pole_number, COUNT(DISTINCT drop_number) as drops
FROM status_changes
GROUP BY pole_number
ORDER BY drops DESC
LIMIT 10;
```

## Troubleshooting

### Excel file not reading?
- Ensure file is not open in Excel
- Check file permissions
- Try saving as .xlsx (not .xls)

### Date issues?
- Dates are automatically parsed
- Check Excel date format settings
- Use ISO format (YYYY-MM-DD) if possible

### Performance slow?
- Run `node src/cli.js stats` to check record count
- Consider clearing old data with `--clear` option
- SQLite handles millions of records efficiently