# OneMap SQL Analytics Architecture
*Date: 2025/08/06*

## System Overview

The OneMap SQL Analytics system is a SQLite-based solution for processing and analyzing pole/drop installation data from Excel exports.

## Architecture Diagram

```
┌─────────────────────┐
│   OneMap System     │
│  (Excel Exports)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Excel Importer    │────▶│   SQLite Database   │
│  (Node.js/xlsx)     │     │   (onemap.db)       │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                            ┌──────────┴──────────┐
                            │                     │
                            ▼                     ▼
                   ┌─────────────────┐  ┌─────────────────┐
                   │ Analytics Engine │  │   CLI Interface  │
                   │  (SQL Queries)   │  │  (Commander.js)  │
                   └────────┬────────┘  └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Export Module   │
                   │ (Excel/CSV/JSON) │
                   └─────────────────┘
```

## Components

### 1. Excel Importer (`excel-importer.js`)
**Purpose**: Read Excel files and import data into SQLite

**Features**:
- Direct Excel reading (no CSV conversion)
- Automatic column mapping
- Data type preservation
- Duplicate detection
- Batch processing for performance
- Error handling and recovery

**Key Methods**:
```javascript
importExcelFile(filePath, options)
detectColumns(sampleRow)
processBatch(data, batchId, columnMapping)
updatePoleCapacity(poleNumber)
```

### 2. Database Layer (`database.js`)
**Purpose**: Manage SQLite database operations

**Schema**:
```sql
-- Main data table
status_changes (
  id, property_id, pole_number, drop_number,
  status, status_date, agent, address,
  location_lat, location_lng, zone, feeder,
  import_batch_id, source_row, raw_data
)

-- Tracking tables
import_batches (
  id, filename, import_date, total_rows,
  processed_rows, error_rows, status
)

pole_capacity (
  pole_number, total_drops, max_capacity
)
```

**Indexes**:
- pole_number (fast pole lookups)
- drop_number (drop queries)
- status_date (time-based analysis)
- status (status filtering)
- agent (performance metrics)

**Views**:
- first_approvals (first approval per pole)
- pole_summary (pole statistics)
- agent_performance (agent metrics)
- daily_activity (time-series data)

### 3. Analytics Engine (`analytics.js`)
**Purpose**: Execute analytical queries and generate reports

**Core Analytics**:
1. **First Approvals**: Track initial pole approvals
2. **Agent Performance**: Measure agent productivity
3. **Status Analysis**: Distribution of status values
4. **Daily Activity**: Time-series activity data
5. **Capacity Analysis**: Pole utilization (12-drop limit)
6. **Duplicate Detection**: Find redundant entries

**Export Formats**:
- Excel (.xlsx) - Multi-sheet reports
- CSV (.csv) - Simple tabular data
- JSON (.json) - Structured data

### 4. CLI Interface (`cli.js`)
**Purpose**: Command-line interface for all operations

**Commands**:
```bash
import <file>    # Import Excel file
analyze          # Run analytics (interactive)
stats            # Show database statistics
clear            # Clear all data
schema           # Export database schema
```

## Data Flow

### Import Process
1. **Read Excel** → xlsx library parses file
2. **Detect Columns** → Map to standard fields
3. **Validate Data** → Check required fields
4. **Batch Insert** → 1000 records at a time
5. **Update Indexes** → Maintain performance
6. **Track Import** → Log batch details

### Query Process
1. **User Selection** → Choose analysis type
2. **Build Query** → Construct SQL with parameters
3. **Execute Query** → SQLite processes
4. **Format Results** → Prepare for display
5. **Export Options** → Save in chosen format

## Performance Characteristics

### Import Performance
- **Speed**: ~1000 records/second
- **Memory**: Constant (streaming)
- **Batch Size**: 1000 records
- **Transaction**: All or nothing

### Query Performance
- **Simple Queries**: < 10ms
- **Aggregations**: < 100ms
- **Complex Joins**: < 500ms
- **Full Scan**: < 2 seconds (100k records)

### Storage Requirements
- **Database Size**: ~1KB per record
- **Indexes**: +20% overhead
- **50k Records**: ~60MB total
- **500k Records**: ~600MB total

## Error Handling

### Import Errors
- Missing required columns → Skip file
- Invalid data types → Log and continue
- Duplicate records → Skip duplicates
- Database errors → Rollback transaction

### Query Errors
- Invalid SQL → Show error message
- No results → Display empty message
- Export failures → Retry with different format

## Security Considerations

### Data Protection
- Local database file (not network exposed)
- No authentication required (local use)
- File permissions control access
- No sensitive data in logs

### Backup Strategy
- Database file can be copied
- Export all data to Excel
- Version control for scripts
- Original Excel files preserved

## Scalability

### Current Limits
- Tested with 100,000 records
- Can handle 1,000,000+ records
- Limited by disk space
- Single-user access

### Future Enhancements
1. **PostgreSQL Migration** - Multi-user support
2. **API Layer** - REST endpoints
3. **Web Dashboard** - Browser-based UI
4. **Real-time Import** - Watch folder
5. **Cloud Backup** - Automated sync

## Integration Points

### FibreFlow Integration (Future)
```javascript
// API endpoint example
GET /api/onemap/poles/first-approvals
POST /api/onemap/import
GET /api/onemap/reports/monthly/:year/:month
```

### Automation Opportunities
1. **Scheduled Imports** - Daily/weekly
2. **Email Reports** - Automated delivery
3. **Alert System** - Threshold monitoring
4. **Data Pipeline** - ETL to data warehouse

## Maintenance

### Regular Tasks
1. **Backup Database** - Weekly
2. **Archive Old Imports** - Monthly
3. **Vacuum Database** - Quarterly
4. **Update Indexes** - As needed

### Monitoring
- Import success rate
- Query performance
- Database size
- Error frequency

## Technology Stack

### Core Technologies
- **Node.js** - Runtime environment
- **SQLite3** - Database engine
- **Commander.js** - CLI framework
- **xlsx** - Excel file parsing
- **Inquirer** - Interactive prompts
- **Chalk** - Terminal styling
- **Ora** - Progress indicators

### Development Tools
- **ESLint** - Code quality
- **Jest** - Testing framework
- **Nodemon** - Development server

## Best Practices

### Database
1. Use transactions for bulk operations
2. Create indexes for frequent queries
3. Vacuum periodically
4. Backup before major changes

### Code
1. Async/await for all DB operations
2. Proper error handling
3. Input validation
4. Meaningful variable names

### Performance
1. Batch large operations
2. Use prepared statements
3. Limit result sets
4. Profile slow queries