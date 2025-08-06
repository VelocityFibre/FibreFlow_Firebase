# Sync Validation System

## Purpose
Validate data accuracy between CSV source files and staging database before syncing to production.

## Directory Structure
```
validation/
├── scripts/              # Validation scripts
│   ├── validate-csv-to-staging.js
│   ├── compare-records.js
│   ├── business-rule-validator.js
│   └── generate-safe-list.js
├── reports/             # Validation reports
│   └── YYYY-MM-DD/     # Daily validation reports
├── config/             # Validation configuration
│   ├── field-mappings.json
│   ├── business-rules.json
│   └── validation-settings.json
├── data/               # Temporary data storage
│   ├── discrepancies/
│   ├── safe-to-sync/
│   └── quarantine/
├── rules/              # Business rule definitions
│   ├── pole-rules.js
│   ├── drop-rules.js
│   └── status-rules.js
├── lib/                # Shared validation utilities
│   ├── csv-parser.js
│   ├── validators.js
│   └── reporters.js
├── csv-archive/        # Source CSV files for validation
│   └── YYYY-MM/       # Organized by month
└── temp/              # Temporary processing files
```

## Validation Workflow

1. **Load CSV Source Files** → Parse and normalize data
2. **Query Staging Database** → Get current state
3. **Compare Records** → Field-by-field comparison
4. **Apply Business Rules** → Validate data integrity
5. **Generate Reports** → Discrepancies and safe list

## Quick Start

```bash
# Run full validation
node validation/scripts/validate-csv-to-staging.js

# Check specific CSV file
node validation/scripts/validate-csv-to-staging.js --csv path/to/file.csv

# Generate safe-to-sync list only
node validation/scripts/generate-safe-list.js
```