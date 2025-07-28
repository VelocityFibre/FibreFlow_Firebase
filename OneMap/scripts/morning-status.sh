#!/bin/bash
# OneMap Morning Status Report - Instant Context for Claude
# Created: 2025-01-30

echo "=== 🚀 OneMap Morning Status Report ==="
echo "Generated: $(date)"
echo ""

# Show last 5 processed files from the log
echo "📅 Recently Processed:"
grep -E "^\| [A-Z].*\.csv \|" /home/ldp/VF/Apps/FibreFlow/OneMap/CSV_PROCESSING_LOG.md | tail -5 | while IFS='|' read -r _ date file _ records _ _; do
    echo "  - $(echo $date | xargs): $(echo $file | xargs)"
done
echo ""

# Find next unprocessed file
echo "🎯 Next to Process:"
cd /home/ldp/VF/Apps/FibreFlow/OneMap
PROCESSED_FILES=$(grep -E "^\| [A-Z].*\.csv \|" CSV_PROCESSING_LOG.md | awk -F'|' '{print $3}' | sed 's/^ *//;s/ *$//')
NEXT_FILE=""
# Create array of all CSV files sorted by date in filename
ALL_CSV_FILES=()
for csv in downloads/*.csv "downloads/Lawley Raw Stats"/*.csv; do
    if [ -f "$csv" ]; then
        basename_csv=$(basename "$csv")
        # Skip test files
        if [[ ! "$basename_csv" =~ ^test ]] && [[ "$basename_csv" != "june3.csv" ]] && [[ "$basename_csv" != "june5.csv" ]]; then
            # Extract date from filename (DDMMYYYY format)
            if [[ "$basename_csv" =~ ([0-9]{2})([0-9]{2})([0-9]{4})\.csv ]]; then
                date_str="${BASH_REMATCH[3]}${BASH_REMATCH[2]}${BASH_REMATCH[1]}"
                ALL_CSV_FILES+=("$date_str|$csv")
            else
                # For files without standard date format
                ALL_CSV_FILES+=("00000000|$csv")
            fi
        fi
    fi
done

# Sort by date and find first unprocessed
IFS=$'\n' SORTED_FILES=($(sort <<<"${ALL_CSV_FILES[*]}"))
unset IFS

for file_entry in "${SORTED_FILES[@]}"; do
    csv=$(echo "$file_entry" | cut -d'|' -f2)
    basename_csv=$(basename "$csv")
    if ! echo "$PROCESSED_FILES" | grep -q "^${basename_csv}$"; then
        NEXT_FILE="$csv"
        break
    fi
done

if [ -n "$NEXT_FILE" ]; then
    echo "  📄 File: $(basename "$NEXT_FILE")"
    echo "  📁 Path: $NEXT_FILE"
    echo "  ⚡ Quick Process: cd OneMap && node scripts/bulk-import-onemap.js \"$NEXT_FILE\""
else
    echo "  ✅ All CSV files processed!"
fi
echo ""

# Show quick stats
echo "📊 Quick Stats:"
TOTAL_PROCESSED=$(grep -c "^\| [A-Z].*\.csv \|" CSV_PROCESSING_LOG.md 2>/dev/null || echo 0)
echo "  Total Files Processed: $TOTAL_PROCESSED"
LAST_DATE=$(grep -E "^\| [A-Z].*\.csv \|" CSV_PROCESSING_LOG.md | tail -1 | awk -F'|' '{print $2}' | xargs)
echo "  Last Process Date: $LAST_DATE"
echo ""

# Show instant commands
echo "⚡ Instant Commands:"
echo "  1. Process next CSV:     cd OneMap && node scripts/bulk-import-onemap.js \"$NEXT_FILE\""
echo "  2. Generate report:      cd OneMap && node scripts/generate-firebase-report.js"
echo "  3. Check for changes:    cd OneMap && node scripts/detect-changes-firebase.js"
echo ""

# Check for known issues
echo "⚠️  Status Notes:"
if grep -q "June 22.*data quality issues" CSV_PROCESSING_LOG.md 2>/dev/null; then
    echo "  - June 22 had 46% corrupted records"
fi
if [ -n "$NEXT_FILE" ] && [[ "$NEXT_FILE" =~ July ]]; then
    echo "  - Gap detected: Missing late June/early July files"
fi
echo ""

echo "💡 To process next CSV: cd scripts/firebase-import && node bulk-import-with-history.js \"[filename]\""
echo "=== End Morning Status ==="