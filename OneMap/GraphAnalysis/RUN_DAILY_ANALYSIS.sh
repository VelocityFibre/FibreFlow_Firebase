#!/bin/bash

# OneMap Daily CSV Analysis Runner
# This script processes all daily CSV files and generates comprehensive reports

echo "🚀 OneMap Daily CSV Analysis"
echo "============================"
echo ""
echo "This will analyze all CSV files in the downloads directory,"
echo "track changes between days, and generate comprehensive reports."
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Navigate to GraphAnalysis directory
cd "$(dirname "$0")"

# Run the analysis
node process-all-daily-csvs.js

echo ""
echo "📁 To view your reports:"
echo "   1. Check reports/REPORT_INDEX.md for all reports"
echo "   2. Latest report in reports/complete/[today's date]/"
echo ""
echo "✅ Analysis complete!"