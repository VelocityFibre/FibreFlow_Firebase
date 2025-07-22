#!/bin/bash

# Master CSV Creator with Change Tracking
# This script creates a master CSV file from all daily CSVs
# and tracks all changes with detailed reports

echo "📊 OneMap Master CSV Creator"
echo "==========================="
echo ""
echo "This will:"
echo "1. Process all CSV files chronologically"
echo "2. Create a master CSV with all unique records"
echo "3. Update existing records when Property ID matches"
echo "4. Track all changes in detailed reports"
echo "5. Generate a report for each day's processing"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Navigate to GraphAnalysis directory
cd "$(dirname "$0")"

# Run the master CSV creation
node processors/create-master-csv-with-changes.js

echo ""
echo "📁 Output locations:"
echo "   - Master CSV: data/master/master_csv_latest.csv"
echo "   - Daily reports: reports/daily-processing/"
echo "   - Change logs: data/change-logs/"
echo "   - Master summary: data/master/master_summary_*.md"
echo ""
echo "✅ Master CSV creation complete!"