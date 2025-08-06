# OneMap SQL Analytics - Quick Start Guide
*Date: 2025/08/06*

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
cd OneMap/SQL/scripts
npm install
```

### 2. Import Your Excel File
```bash
# When you have the OneMap Excel export:
npm run import ../data/excel/your_onemap_file.xlsx
```

### 3. Check Import Success
```bash
npm run stats
```

### 4. Run Analytics
```bash
npm run analyze
# Follow the interactive menu
```

## 📊 Common Tasks

### View First Approvals
```bash
npm run analyze
# Select: "First Approvals by Pole"
# Export to Excel when prompted
```

### Generate Monthly Report
```bash
npm run analyze
# Select: "Generate Monthly Report"
# Enter: Year (2025)
# Enter: Month (8)
# Report saved as: OneMap_Report_2025_08.xlsx
```

### Check Agent Performance
```bash
npm run analyze
# Select: "Agent Performance Summary"
```

### Run Custom SQL Query
```bash
npm run analyze
# Select: "Custom SQL Query"
# Enter your SQL (see docs/QUERY_GUIDE.md for examples)
```

## 📁 Where Things Are

- **Your Excel files**: `OneMap/SQL/data/excel/`
- **Database**: `OneMap/SQL/database/onemap.db`
- **Reports**: `OneMap/SQL/reports/2025/08/`
- **Exports**: `OneMap/SQL/exports/`

## 🔧 Troubleshooting

### Excel Import Failed?
- Check file exists in correct location
- Ensure file is .xlsx (not .xls)
- Close file in Excel before importing

### No Data Showing?
- Run `npm run stats` to check record count
- Verify column names match expected format
- Check import logs for errors

### Need Help?
- Column mappings: See `scripts/src/excel-importer.js`
- SQL examples: See `docs/QUERY_GUIDE.md`
- Architecture: See `docs/ARCHITECTURE.md`

## 💡 Pro Tips

1. **Import Multiple Files**
   ```bash
   # Clear old data first
   node src/cli.js import file.xlsx --clear
   ```

2. **Export Everything**
   - After any analysis, choose export option
   - Excel format includes multiple sheets
   - CSV for simple data transfer

3. **Schedule Reports**
   ```bash
   # Add to crontab for automation
   0 9 * * 1 cd /path/to/OneMap/SQL/scripts && npm run monthly
   ```

4. **Backup Database**
   ```bash
   cp database/onemap.db database/backup_$(date +%Y%m%d).db
   ```

## 🎯 Next Steps

1. Import your OneMap Excel file
2. Run a few analytics queries
3. Generate your first monthly report
4. Explore custom SQL queries

Ready to analyze your OneMap data at lightning speed! 🚀