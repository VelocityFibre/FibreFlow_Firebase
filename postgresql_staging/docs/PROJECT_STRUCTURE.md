# PostgreSQL Staging - Complete Project Structure

*Created: 2025-01-30*  
*Location: `/home/ldp/VF/Apps/FibreFlow/postgresql_staging/`*

## 📁 Directory Structure

```
postgresql_staging/
│
├── 📄 README.md                    # Main project documentation
├── 📄 CLAUDE.md                    # AI context for this module
├── 📄 package.json                 # Node.js dependencies
├── 📄 package-lock.json            # Locked dependencies
│
├── 📂 config/                      # Configuration files
│   ├── database.json               # Database connection settings
│   └── lawley-schema.sql           # PostgreSQL schema (159 columns)
│
├── 📂 scripts/                     # All executable scripts
│   │
│   ├── 🔧 Installation & Setup
│   │   ├── install-postgres-working.sh     # PostgreSQL installer (v10.23)
│   │   ├── setup-postgres-local.sh         # Database setup & schema
│   │   └── test-connection.js              # Connection tester
│   │
│   ├── 📊 Data Import
│   │   ├── import-lawley-excel.js          # Main import script with history tracking
│   │   ├── import-latest-lawley.sh         # Quick import of latest file
│   │   ├── import-all-lawley.sh            # Batch import multiple files
│   │   └── analyze-excel-structure.js      # Excel file analyzer
│   │
│   ├── 📈 Reporting & Validation
│   │   ├── generate-import-report.js       # Report generator (HTML/TXT/JSON)
│   │   ├── validate-import.js              # Cross-reference validator
│   │   └── view-import-history.sh          # Interactive history viewer
│   │
│   └── 🔄 Sync & Validation
│       ├── postgres-to-supabase-sync.sh    # Supabase synchronization
│       └── cross-validate-databases.js     # SQLite/DuckDB comparison
│
├── 📂 docs/                        # Documentation
│   ├── DATA_REQUIREMENTS.md        # Status history tracking requirements
│   ├── LAWLEY_PROJECT_NOTES.md     # Implementation details
│   ├── IMPORT_REPORTING_GUIDE.md   # Reporting system guide
│   └── PROJECT_STRUCTURE.md        # This file
│
├── 📂 reports/                     # Generated reports (auto-created)
│   ├── import-history.log          # Cumulative import log
│   ├── import-report-*.html        # HTML reports per batch
│   ├── import-report-*.txt         # Text reports per batch
│   ├── import-report-*.json        # JSON reports per batch
│   └── validation-*.json           # Validation results
│
└── 📂 node_modules/                # NPM packages (pg, xlsx, uuid)
```

## 🔑 Key Files Overview

### Configuration Files

| File | Purpose |
|------|---------|
| `config/database.json` | PostgreSQL connection settings (port 5433) |
| `config/lawley-schema.sql` | Complete 159-column schema with status history tables |

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `import-lawley-excel.js` | Main import with change detection | `node scripts/import-lawley-excel.js file.xlsx` |
| `generate-import-report.js` | Creates comprehensive reports | Auto-runs after import |
| `validate-import.js` | Cross-validates with Excel | `node scripts/validate-import.js file.xlsx` |
| `view-import-history.sh` | Interactive history browser | `./scripts/view-import-history.sh` |

### Quick Scripts

| Script | Purpose | One-liner |
|--------|---------|-----------|
| `import-latest-lawley.sh` | Import newest file | Finds latest Excel, imports it |
| `setup-postgres-local.sh` | Initial setup | Creates DB, applies schema, installs deps |
| `test-connection.js` | Test DB connection | Quick health check |

## 📊 Database Tables

All tables are in the `fibreflow_staging` PostgreSQL database:

### Main Tables
- `onemap_lawley_raw` - Raw import data (159 columns)
- `onemap_status_history` - Complete change history
- `onemap_import_batches` - Import tracking

### Views
- `current_pole_statuses` - Latest status per pole
- `status_change_summary` - Daily change analysis

## 📝 Reports Location

All reports are generated in the `reports/` subdirectory:

```
reports/
├── import-history.log              # One-line-per-import summary
├── import-report-{batch-id}.html   # Beautiful HTML report
├── import-report-{batch-id}.txt    # Plain text version
├── import-report-{batch-id}.json   # Structured data
└── validation-{timestamp}.json     # Detailed validation results
```

## 🚀 Quick Start Commands

```bash
# 1. Initial Setup (one time)
cd /home/ldp/VF/Apps/FibreFlow/postgresql_staging
./scripts/setup-postgres-local.sh

# 2. Import Latest File
./scripts/import-latest-lawley.sh

# 3. View History
./scripts/view-import-history.sh

# 4. Manual Import
node scripts/import-lawley-excel.js ~/Downloads/specific_file.xlsx

# 5. Validate Import
node scripts/validate-import.js --full
```

## 📈 Data Flow

```
Excel Files (~/Downloads/)
    ↓
PostgreSQL Staging (postgresql_staging/)
    ├── Import & Change Detection
    ├── Report Generation
    ├── Validation
    └── History Tracking
    ↓
Reports (reports/)
    ↓
Supabase Cloud (future sync)
```

## 🔒 Key Features

1. **Status History Tracking** - Every change preserved forever
2. **Automatic Reporting** - HTML/TXT/JSON after each import
3. **Data Validation** - Cross-reference with source Excel
4. **Import Log** - Simple cumulative history file
5. **Interactive Viewer** - Browse history and stats
6. **Batch Processing** - Handle 13,656+ rows efficiently
7. **Quality Scoring** - Automatic data quality assessment

## 📍 Important Paths

- **Working Directory**: `/home/ldp/VF/Apps/FibreFlow/postgresql_staging/`
- **Excel Files**: `~/Downloads/*Lawley*.xlsx`
- **PostgreSQL Data**: `~/postgresql_data/`
- **Reports Output**: `./reports/`
- **Database**: `localhost:5433/fibreflow_staging`

## ✅ Everything is Self-Contained

All components are within the `postgresql_staging` directory:
- ✅ Scripts in `scripts/`
- ✅ Config in `config/`
- ✅ Documentation in `docs/`
- ✅ Reports in `reports/`
- ✅ Dependencies in `node_modules/`

No files are scattered outside this directory structure!