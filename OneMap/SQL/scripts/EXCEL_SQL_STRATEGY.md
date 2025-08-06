# OneMap Excel to SQLite Processing Strategy
*Updated: 2025/08/06*

## Overview
Process OneMap data directly from Excel files into SQLite for analytics, eliminating CSV conversion risks.

## Data Flow
```
OneMap Excel Export → SQLite Database → Analytics Queries → Reports
     (Native)           (Structured)       (Optimized)      (Excel/JSON)
```

## Key Advantages

### 1. Data Integrity
- **Dates remain dates** - No serial number conversions
- **Numbers stay precise** - No scientific notation issues
- **Text preserved** - Unicode, special characters intact
- **No manual steps** - Direct Excel to SQL

### 2. Excel-Specific Benefits
- Read multiple sheets if present
- Preserve cell formatting clues
- Handle merged cells properly
- Get formula results directly

### 3. Performance
- SQLite indexes for fast queries
- No in-memory processing limits
- Efficient deduplication
- Complex analytics in milliseconds

## Expected Excel Structure

Based on previous OneMap discussions, expecting columns like:
- Property ID
- Pole Number (e.g., LAW.P.B167)
- Drop Number (e.g., LAW.P.B167.02)
- Status (e.g., "Pole Permission: Approved")
- Date/Time of status change
- Agent/User who made change
- Address/Location
- Additional metadata fields

## SQLite Schema Design

```sql
-- Main status changes table
CREATE TABLE status_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id TEXT,
    pole_number TEXT,
    drop_number TEXT,
    status TEXT,
    status_date DATETIME,
    agent TEXT,
    address TEXT,
    location_lat REAL,
    location_lng REAL,
    zone TEXT,
    feeder TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    import_batch_id TEXT,
    source_row INTEGER,
    
    -- Indexes for performance
    CREATE INDEX idx_pole_number ON status_changes(pole_number);
    CREATE INDEX idx_drop_number ON status_changes(drop_number);
    CREATE INDEX idx_status_date ON status_changes(status_date);
    CREATE INDEX idx_status ON status_changes(status);
    CREATE INDEX idx_agent ON status_changes(agent);
);

-- Import tracking
CREATE TABLE import_batches (
    id TEXT PRIMARY KEY,
    filename TEXT,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_rows INTEGER,
    processed_rows INTEGER,
    error_rows INTEGER,
    status TEXT
);

-- Aggregated views for analytics
CREATE VIEW first_approvals AS
SELECT 
    pole_number,
    MIN(status_date) as first_approval_date,
    agent as first_approval_agent
FROM status_changes
WHERE status = 'Pole Permission: Approved'
GROUP BY pole_number;

CREATE VIEW pole_summary AS
SELECT 
    pole_number,
    COUNT(DISTINCT drop_number) as drop_count,
    COUNT(DISTINCT property_id) as property_count,
    MAX(status_date) as last_update,
    COUNT(*) as total_status_changes
FROM status_changes
GROUP BY pole_number;
```

## Processing Pipeline

### 1. Excel Import
```javascript
// Using xlsx library to read Excel directly
const XLSX = require('xlsx');
const workbook = XLSX.readFile('onemap_export.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,  // Get formatted values
    dateNF: 'yyyy-mm-dd hh:mm:ss'  // Preserve dates
});
```

### 2. Data Validation
- Check required columns exist
- Validate pole/drop number formats
- Ensure dates are parseable
- Flag duplicate entries

### 3. Batch Insert
- Use transactions for speed
- Insert 1000 rows at a time
- Track progress with spinner
- Log any errors for review

### 4. Analytics Queries
- First approval per pole
- Agent performance metrics
- Weekly/monthly summaries
- Drop capacity analysis
- Status change patterns

## Next Steps

1. **You provide Excel file** - I'll analyze actual structure
2. **I'll adjust schema** - Based on real columns
3. **Build import tool** - Handle your specific Excel format
4. **Create analytics** - Tailored to your needs

## Tools We'll Use

- **SQLite3** - Lightweight, fast, file-based database
- **xlsx** - Read Excel files natively
- **Commander.js** - CLI interface
- **Ora** - Progress spinners
- **Chalk** - Colored output

## Sample Commands

```bash
# Import Excel file
npm run import onemap_export.xlsx

# Run analytics
npm run analyze --report=first-approvals --month=2025-01

# Export results
npm run export --format=excel --output=results.xlsx
```