#!/bin/bash

# Simple script to view Claude Code logs and analytics

echo "FibreFlow Claude Code Logs Viewer"
echo "================================="
echo ""
echo "Available options:"
echo "1. View Analytics Dashboard (last 24h)"
echo "2. View Tool Usage Report"
echo "3. View Agent Performance"
echo "4. View Data Integrity Report"
echo "5. View Raw Logs"
echo "6. Clear Old Logs"
echo ""

read -p "Select option (1-6): " choice

case $choice in
    1)
        echo "Loading analytics dashboard..."
        python3 .claude/utils/log_analyzer.py --report summary
        ;;
    2)
        echo "Loading tool usage report..."
        python3 .claude/utils/log_analyzer.py --report tools
        ;;
    3)
        echo "Loading agent performance report..."
        python3 .claude/utils/log_analyzer.py --report agents
        ;;
    4)
        echo "Loading data integrity report..."
        python3 .claude/utils/log_analyzer.py --report integrity
        ;;
    5)
        echo "Available log files:"
        ls -la .claude/logs/
        echo ""
        read -p "Enter log filename to view: " logfile
        if [ -f ".claude/logs/$logfile" ]; then
            less ".claude/logs/$logfile"
        else
            echo "Log file not found!"
        fi
        ;;
    6)
        echo "This will remove logs older than 7 days."
        read -p "Are you sure? (y/N): " confirm
        if [ "$confirm" = "y" ]; then
            find .claude/logs -name "*.json" -mtime +7 -delete
            echo "Old logs removed."
        fi
        ;;
    *)
        echo "Invalid option!"
        ;;
esac