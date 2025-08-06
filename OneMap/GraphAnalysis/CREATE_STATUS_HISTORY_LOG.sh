#!/bin/bash

# Status History Log Generator
# Creates a separate CSV with ONLY status changes
# Memory efficient and complements the main master CSV

echo "📊 OneMap Status History Log Generator"
echo "====================================="
echo ""
echo "This will:"
echo "1. Process all CSV files chronologically"
echo "2. Extract ONLY status changes"
echo "3. Create a compact history log"
echo "4. Track: Property ID, Date, Old Status → New Status"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Navigate to GraphAnalysis directory
cd "$(dirname "$0")"

# Run the status history log creation
node processors/create-status-history-log.js ../downloads/Lawley\ Raw\ Stats

echo ""
echo "📁 Output locations:"
echo "   - History log: data/master/status_history_log_latest.csv"
echo "   - Main CSV: data/master/master_csv_latest.csv (run CREATE_MASTER_CSV.sh)"
echo ""
echo "✅ Status history log complete!"
echo ""
echo "💡 TIP: Use both files together:"
echo "   - master_csv_latest.csv = Current state of all properties"
echo "   - status_history_log_latest.csv = All status changes over time"