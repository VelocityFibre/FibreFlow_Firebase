#!/bin/bash
# Quick status file access script

STATUS_DIR="$(dirname "$0")"
TODAY=$(date +%Y-%m-%d)
STATUS_FILE="$STATUS_DIR/DEVELOPMENT_STATUS_$TODAY.md"

case "$1" in
    "edit"|"e")
        # Edit today's status file
        ${EDITOR:-nano} "$STATUS_FILE"
        ;;
    "view"|"v")
        # View today's status file
        if [ -f "$STATUS_FILE" ]; then
            cat "$STATUS_FILE"
        else
            echo "No status file for today. Create one with: $0 edit"
        fi
        ;;
    "latest"|"l")
        # View the latest status file
        LATEST=$(ls -1 "$STATUS_DIR"/DEVELOPMENT_STATUS_*.md 2>/dev/null | tail -1)
        if [ -n "$LATEST" ]; then
            cat "$LATEST"
        else
            echo "No status files found"
        fi
        ;;
    "list")
        # List all status files
        ls -la "$STATUS_DIR"/DEVELOPMENT_STATUS_*.md 2>/dev/null || echo "No status files found"
        ;;
    *)
        echo "FibreFlow Status Tracker"
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  edit, e     Edit today's status file"
        echo "  view, v     View today's status file"
        echo "  latest, l   View the latest status file"
        echo "  list        List all status files"
        echo ""
        echo "Current status file: $STATUS_FILE"
        ;;
esac