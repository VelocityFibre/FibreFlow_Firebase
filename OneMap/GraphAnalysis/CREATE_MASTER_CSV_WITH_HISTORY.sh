#!/bin/bash

# Master CSV Creator with FULL Status History
# This script creates a master CSV that keeps ALL status changes
# maintaining complete audit trail

echo "📊 OneMap Master CSV Creator - FULL HISTORY VERSION"
echo "=================================================="
echo ""
echo "This will:"
echo "1. Process all CSV files chronologically"
echo "2. Keep ALL records (no overwrites)"
echo "3. Track every status change with timestamps"
echo "4. Maintain complete audit trail for each property"
echo "5. Generate detailed reports"
echo ""
echo "Note: This creates a LARGER file but preserves ALL history"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Navigate to GraphAnalysis directory
cd "$(dirname "$0")"

# Run the full history CSV creation
node processors/create-master-csv-with-full-history.js ../downloads/Lawley\ Raw\ Stats

echo ""
echo "📁 Output locations:"
echo "   - Master CSV: data/master/master_csv_full_history_latest.csv"
echo "   - Daily reports: reports/daily-processing/"
echo "   - Master summary: data/master/master_summary_FULL_HISTORY_*.md"
echo ""
echo "✅ Full history master CSV creation complete!"