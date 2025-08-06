# OneMap SQL Analytics System
*Created: 2025/08/06*

## Overview
A SQLite-based analytics system for processing OneMap Excel exports, providing fast queries and eliminating CSV conversion risks.

## Directory Structure
```
OneMap/SQL/
├── README.md              # This file - main documentation
├── docs/                  # Documentation and plans
│   ├── MIGRATION_PLAN.md  # CSV to SQL migration strategy
│   ├── ARCHITECTURE.md    # System architecture
│   ├── QUERY_GUIDE.md     # Common SQL queries
│   └── STATUS_TRACKING_SYSTEM.md  # Status change tracking guide
├── scripts/               # Processing scripts
│   ├── package.json       # Node.js dependencies
│   ├── src/              # Source code
│   │   ├── cli.js        # Command-line interface
│   │   ├── database.js   # Database management
│   │   ├── excel-importer.js  # Excel import logic
│   │   └── analytics.js  # Analytics queries
│   └── examples/         # Example scripts
├── data/                 # Data files (gitignored)
│   ├── excel/           # Original Excel files
│   └── backups/         # Database backups
├── database/            # SQLite database files
│   └── onemap.db       # Main database (created on first import)
├── reports/             # Generated reports
│   ├── 2025/           # Year-based organization
│   │   └── 08/         # Month folders
└── exports/            # Exported query results
```

## Quick Start

### 1. Setup
```bash
cd OneMap/SQL/scripts
npm install
```

### 2. Import Excel Data
```bash
# Import with full status tracking (RECOMMENDED)
node import-with-tracking.js ../data/excel/filename.xlsx

# Basic import (without tracking)
node import-excel.js ../data/excel/filename.xlsx
```

### 3. Run Analytics & Reports
```bash
# Status change detection
node detect-status-changes-comprehensive.js

# Generate status revert report
node generate-status-revert-report.js

# Anomaly detection with Excel export
node detect-anomalies.js --export

# View import history
cat ../IMPORT_AUDIT_LOG.md
```

### 4. Export Results
All analytics can be exported to:
- Excel (.xlsx) - Multi-sheet reports
- CSV (.csv) - Simple data export
- JSON (.json) - For programmatic use

## Key Features

### Data Integrity
- ✅ Direct Excel import (no CSV conversion)
- ✅ Automatic date/number preservation
- ✅ Unicode support for special characters
- ✅ Duplicate detection and prevention
- ✅ Complete status change tracking

### Performance
- ⚡ 1000+ records/second import speed
- ⚡ Sub-100ms query response
- ⚡ Handles 100,000+ records easily
- ⚡ Indexed for optimal performance

### Analytics
- 📊 First approval tracking by pole
- 📊 Agent performance metrics
- 📊 Status change timeline
- 📊 Pole capacity monitoring (12-drop limit)
- 📊 Custom SQL queries
- 📊 **NEW**: Comprehensive status change tracking
- 📊 **NEW**: Anomaly detection (reverts, bypassed approvals)
- 📊 **NEW**: Dedicated status revert reporting

## Common Commands

```bash
# Import data
npm run import <excel-file>

# View statistics
npm run stats

# Run analytics (interactive)
npm run analyze

# Generate monthly report
node src/cli.js analyze
# Select: Generate Monthly Report
# Enter year and month

# Clear all data
node src/cli.js clear

# Export database schema
node src/cli.js schema
```

## Status Change Tracking

### Overview
The system tracks all status changes between daily imports, focusing on:
- **Normal Progressions**: Expected workflow advancement
- **Status Reverts**: Properties going backwards in workflow
- **Bypassed Approvals**: Skipping required authorization steps

### Key Scripts
- `import-with-tracking.js` - Import with full change tracking
- `generate-status-revert-report.js` - Dedicated revert analysis
- `detect-anomalies.js` - Comprehensive anomaly detection

### Reports Generated
- Status change summary with categorization
- Detailed status revert report (SQL-based, not Excel)
- Anomaly detection Excel with multiple analysis sheets

### Verification
All findings are independently verifiable via direct SQL queries against the database.

## Support
For issues or questions about the SQL analytics system, check:
1. `docs/STATUS_TRACKING_SYSTEM.md` - Status tracking guide
2. `docs/MIGRATION_PLAN.md` - Migration strategy
3. `docs/QUERY_GUIDE.md` - SQL query examples
4. `docs/ARCHITECTURE.md` - Technical details
5. `CLAUDE.md` - Critical development notes