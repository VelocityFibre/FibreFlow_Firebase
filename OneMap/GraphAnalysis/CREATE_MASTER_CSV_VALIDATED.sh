#!/bin/bash

# Master CSV Creator with Validation Options
# All three options for handling CSV corruption

echo "📊 OneMap Master CSV Creator with Validation"
echo "==========================================="
echo ""
echo "This script provides three options for handling CSV corruption:"
echo ""
echo "1. Better CSV Parsing - Handles quoted fields and multi-line text"
echo "2. Field Validation - Skips records with corrupted data"
echo "3. Clean Corrupted Data - Remove records from specific dates"
echo ""
echo "Usage Options:"
echo "  ./CREATE_MASTER_CSV_VALIDATED.sh                    # Run with validation (recommended)"
echo "  ./CREATE_MASTER_CSV_VALIDATED.sh --no-validation    # Skip validation (process all)"
echo "  ./CREATE_MASTER_CSV_VALIDATED.sh --clean-date 2025-06-02  # Remove June 2 records"
echo ""
echo "Press Enter to continue with validation enabled..."
read

# Navigate to GraphAnalysis directory
cd "$(dirname "$0")"

# Run the validated master CSV creation
node processors/create-master-csv-with-validation.js "$@"

echo ""
echo "📁 Output locations:"
echo "   - Master CSV: data/master/master_csv_latest_validated.csv"
echo "   - Validation reports: data/validation-logs/"
echo "   - Daily reports: reports/daily-processing/"
echo "   - Change logs: data/change-logs/"
echo ""
echo "✅ Master CSV creation complete!"
echo ""
echo "💡 Tips:"
echo "   - Check validation reports for skipped records"
echo "   - Use --clean-date option to remove corrupted data"
echo "   - Compare with original master to see differences"