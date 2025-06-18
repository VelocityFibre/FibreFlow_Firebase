# FibreFlow Utility Scripts

This directory contains utility scripts for data processing, maintenance, and development tasks.

## 📋 Scripts Overview

### Data Processing Scripts
- **`clean-boq-csv.js`** - Cleans BOQ CSV files for import
- **`clean-boq-csv-proper.js`** - Enhanced BOQ CSV cleaning
- **`convert-excel-to-csv.js`** - Converts Excel files to CSV format
- **`prepare-boq-for-import.js`** - Prepares BOQ data for Firestore import

### Database Maintenance
- **`fix-stock-items-index.js`** - Fixes stock items indexing issues
- **`fix-lint-errors.js`** - Automated lint error fixes

### Development Tools
- **`analyze-bundle.js`** - Analyzes Angular build bundle sizes
- **`test-sentry.js`** - Tests Sentry error reporting integration

### Deployment
- **`deploy-with-build.sh`** - Alternative deployment script with build verification

## 🚀 Usage

### Node.js Scripts
```bash
# Run from project root
node scripts/script-name.js

# Example: Clean BOQ CSV
node scripts/clean-boq-csv.js path/to/file.csv
```

### Shell Scripts
```bash
# Make executable if needed
chmod +x scripts/deploy-with-build.sh

# Run from project root
./scripts/deploy-with-build.sh
```

## ⚠️ Important Notes

1. **Run from Project Root**: All scripts should be executed from the main project directory
2. **Backup Data**: Always backup data before running cleanup scripts
3. **Test Environment**: Test scripts in development before production use
4. **Dependencies**: Ensure Node.js and required packages are installed

## 📁 Related Files

- Main deployment script: `../DEPLOY_NOW.sh`
- Documentation: `../docs/deployment/`
- Data files: Should be placed in appropriate `/data/` directory

## 🔧 Maintenance

Scripts in this directory should be:
- Well-documented with inline comments
- Include error handling
- Have clear usage instructions
- Be kept up-to-date with project dependencies