#!/bin/bash

# Run Master CSV to Staging Validation
# This compares the aggregated master CSV against the staging database

echo "🔍 Data Validation System"
echo "========================"
echo ""
echo "This will compare the master CSV (source of truth) with the staging database"
echo "Master CSV: OneMap/GraphAnalysis/data/master/master_csv_latest.csv"
echo "Staging DB: vf-onemap-data"
echo ""

# Check if master CSV exists
MASTER_CSV="/home/ldp/VF/Apps/FibreFlow/OneMap/GraphAnalysis/data/master/master_csv_latest.csv"
if [ ! -f "$MASTER_CSV" ]; then
    echo "❌ Master CSV not found at: $MASTER_CSV"
    echo ""
    echo "Please run the CSV aggregation first:"
    echo "cd OneMap/GraphAnalysis && ./CREATE_MASTER_CSV.sh"
    exit 1
fi

# Show CSV info
echo "📄 Master CSV Info:"
echo "   File: $(basename "$MASTER_CSV")"
echo "   Size: $(du -h "$MASTER_CSV" | cut -f1)"
echo "   Lines: $(wc -l < "$MASTER_CSV")"
echo "   Modified: $(date -r "$MASTER_CSV" '+%Y-%m-%d %H:%M:%S')"
echo ""

# Create reports directory if it doesn't exist
mkdir -p reports

# Run validation
echo "🚀 Starting validation..."
echo ""
cd /home/ldp/VF/Apps/FibreFlow/sync
node validation/scripts/validate-master-csv-to-staging.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Validation completed successfully - No issues found!"
    echo "   Data in staging matches the master CSV"
    echo "   Safe to proceed with sync to production"
else
    echo ""
    echo "⚠️  Validation found issues!"
    echo "   Please review the report before syncing to production"
    echo "   Reports are saved in: sync/validation/reports/"
fi

# Show latest report
LATEST_REPORT=$(ls -t validation/reports/validation_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_REPORT" ]; then
    echo ""
    echo "📊 Latest Report Summary:"
    jq '.summary' "$LATEST_REPORT" 2>/dev/null || cat "$LATEST_REPORT" | grep -A 10 "summary"
fi