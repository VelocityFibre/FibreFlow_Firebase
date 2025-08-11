#!/bin/bash

# View Import History and Reports
# Quick access to import logs and validation results

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DB_NAME="fibreflow_staging"
DB_USER="postgres"
DB_PORT=5433
REPORTS_DIR="reports"

echo -e "${BLUE}=== OneMap Import History Viewer ===${NC}"
echo ""

# Menu options
echo "Select an option:"
echo "1) View import history log"
echo "2) Show recent imports from database"
echo "3) View latest import report (HTML)"
echo "4) View latest validation results"
echo "5) Show import statistics summary"
echo "6) Check for data anomalies"
echo "7) Compare two imports"
echo "0) Exit"
echo ""

read -p "Enter your choice: " choice

case $choice in
    1)
        echo -e "${BLUE}📋 Import History Log:${NC}"
        if [ -f "$REPORTS_DIR/import-history.log" ]; then
            echo ""
            tail -20 "$REPORTS_DIR/import-history.log"
            echo ""
            echo -e "${YELLOW}Showing last 20 entries. Full log: $REPORTS_DIR/import-history.log${NC}"
        else
            echo -e "${RED}No import history log found yet.${NC}"
        fi
        ;;
        
    2)
        echo -e "${BLUE}📊 Recent Imports from Database:${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT 
                to_char(import_started, 'YYYY-MM-DD HH24:MI') as \"Import Time\",
                source_file as \"File Name\",
                total_rows as \"Rows\",
                new_entities as \"New\",
                updated_entities as \"Updated\",
                status_changes as \"Changes\",
                status as \"Status\",
                CASE 
                    WHEN import_completed IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (import_completed - import_started))::INT || 's'
                    ELSE 'N/A'
                END as \"Duration\"
            FROM onemap_import_batches 
            ORDER BY import_started DESC 
            LIMIT 10;
        "
        ;;
        
    3)
        echo -e "${BLUE}📄 Opening Latest Import Report...${NC}"
        LATEST_HTML=$(ls -t "$REPORTS_DIR"/import-report-*.html 2>/dev/null | head -1)
        if [ -n "$LATEST_HTML" ]; then
            echo "Report: $LATEST_HTML"
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "$LATEST_HTML"
            elif command -v open >/dev/null 2>&1; then
                open "$LATEST_HTML"
            else
                echo -e "${YELLOW}Please open the file manually: $LATEST_HTML${NC}"
            fi
        else
            echo -e "${RED}No HTML reports found yet.${NC}"
        fi
        ;;
        
    4)
        echo -e "${BLUE}✅ Latest Validation Results:${NC}"
        LATEST_VALIDATION=$(ls -t "$REPORTS_DIR"/validation-*.json 2>/dev/null | head -1)
        if [ -n "$LATEST_VALIDATION" ]; then
            echo ""
            jq -r '
                "Validation Summary:",
                "==================",
                "Total Records: \(.summary.totalRecords)",
                "Validated: \(.summary.validatedRecords)",
                "Passed: \(.summary.passedRecords)",
                "Failed: \(.summary.failedRecords)",
                "Missing in DB: \(.summary.missingInDb)",
                "Missing in Excel: \(.summary.missingInExcel)",
                "",
                "Anomalies: \(.anomalies | length)",
                "Issues: \(.issues | length)"
            ' "$LATEST_VALIDATION"
        else
            echo -e "${RED}No validation reports found yet.${NC}"
        fi
        ;;
        
    5)
        echo -e "${BLUE}📈 Import Statistics Summary:${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT 
                COUNT(*) as \"Total Imports\",
                SUM(total_rows) as \"Total Rows Processed\",
                SUM(new_entities) as \"Total New Records\",
                SUM(updated_entities) as \"Total Updates\",
                SUM(status_changes) as \"Total Status Changes\",
                ROUND(AVG(EXTRACT(EPOCH FROM (import_completed - import_started)))::NUMERIC, 1) as \"Avg Duration (sec)\"
            FROM onemap_import_batches 
            WHERE status = 'completed';
        "
        
        echo ""
        echo -e "${BLUE}Status Distribution in Current Data:${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT 
                status,
                COUNT(*) as count,
                ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 1) as \"percentage\"
            FROM onemap_lawley_raw
            WHERE status IS NOT NULL
            GROUP BY status
            ORDER BY count DESC
            LIMIT 10;
        "
        ;;
        
    6)
        echo -e "${BLUE}🚨 Checking for Data Anomalies...${NC}"
        
        echo -e "\n${YELLOW}Duplicate Property IDs:${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT property_id, COUNT(*) as duplicates
            FROM onemap_lawley_raw
            GROUP BY property_id
            HAVING COUNT(*) > 1
            ORDER BY duplicates DESC
            LIMIT 5;
        "
        
        echo -e "\n${YELLOW}Poles Over Capacity (>12 drops):${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT pole_number, COUNT(DISTINCT drop_number) as drop_count
            FROM onemap_lawley_raw
            WHERE pole_number IS NOT NULL AND drop_number IS NOT NULL
            GROUP BY pole_number
            HAVING COUNT(DISTINCT drop_number) > 12
            ORDER BY drop_count DESC;
        "
        
        echo -e "\n${YELLOW}Low Quality Records:${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT 
                COUNT(*) as count,
                ROUND(AVG(data_quality_score), 2) as avg_score
            FROM onemap_lawley_raw
            WHERE data_quality_score < 0.5;
        "
        ;;
        
    7)
        echo -e "${BLUE}📊 Compare Two Imports:${NC}"
        echo "Recent imports:"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
            SELECT 
                ROW_NUMBER() OVER (ORDER BY import_started DESC) || ') ' ||
                to_char(import_started, 'YYYY-MM-DD HH24:MI') || ' - ' ||
                source_file
            FROM onemap_import_batches 
            ORDER BY import_started DESC 
            LIMIT 10;
        "
        
        read -p "Select first import (1-10): " first
        read -p "Select second import (1-10): " second
        
        echo -e "\n${YELLOW}Comparison Results:${NC}"
        psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            WITH imports AS (
                SELECT 
                    id, source_file, import_started,
                    ROW_NUMBER() OVER (ORDER BY import_started DESC) as rn
                FROM onemap_import_batches
                LIMIT 10
            ),
            import1 AS (SELECT * FROM imports WHERE rn = $first),
            import2 AS (SELECT * FROM imports WHERE rn = $second)
            SELECT 
                'Import 1' as import,
                i1.source_file,
                to_char(i1.import_started, 'YYYY-MM-DD HH24:MI') as date,
                b1.total_rows as rows,
                b1.new_entities as new,
                b1.updated_entities as updated,
                b1.status_changes as changes
            FROM import1 i1
            JOIN onemap_import_batches b1 ON i1.id = b1.id
            UNION ALL
            SELECT 
                'Import 2' as import,
                i2.source_file,
                to_char(i2.import_started, 'YYYY-MM-DD HH24:MI') as date,
                b2.total_rows as rows,
                b2.new_entities as new,
                b2.updated_entities as updated,
                b2.status_changes as changes
            FROM import2 i2
            JOIN onemap_import_batches b2 ON i2.id = b2.id;
        "
        ;;
        
    0)
        echo "Goodbye!"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice. Please try again.${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}Press Enter to continue...${NC}"
read