#!/bin/bash
# Optimized Daily Meeting Sync Script for FibreFlow
# Syncs only yesterday's meetings by default (more efficient)
# Falls back to 7 days on Mondays or if specified
# Last updated: 2025-08-11

# Set the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log file location
LOG_DIR="$PROJECT_ROOT/logs/meeting-sync"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync-$(date +%Y-%m-%d).log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start sync
log "========================================="
log "Starting daily meeting sync"
log "========================================="

# Change to project directory
cd "$PROJECT_ROOT" || {
    log "ERROR: Could not change to project directory"
    exit 1
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log "ERROR: Node.js is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install >> "$LOG_FILE" 2>&1
fi

# Determine sync period
# On Mondays, sync last 3 days to catch weekend meetings
# Otherwise, sync just yesterday's meetings
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
if [ "$DAY_OF_WEEK" -eq 1 ]; then
    SYNC_DAYS=3
    log "Monday detected - syncing last 3 days to catch weekend meetings"
else
    SYNC_DAYS=1
    log "Syncing yesterday's meetings only"
fi

# Allow override via command line argument
if [ -n "$1" ]; then
    SYNC_DAYS=$1
    log "Override: Syncing last $SYNC_DAYS days"
fi

# Run the JavaScript sync script
log "Running meeting sync for the last $SYNC_DAYS days..."
node scripts/sync-meetings-simple.cjs $SYNC_DAYS >> "$LOG_FILE" 2>&1

SYNC_EXIT_CODE=$?

if [ $SYNC_EXIT_CODE -eq 0 ]; then
    log "✅ Meeting sync completed successfully"
    
    # Extract summary from log
    SUMMARY=$(tail -20 "$LOG_FILE" | grep -E "(Total meetings processed|New meetings created|Existing meetings updated)" | sed 's/^.*- //')
    
    # Create success report
    REPORT_FILE="$LOG_DIR/report-$(date +%Y-%m-%d).txt"
    {
        echo "FibreFlow Meeting Sync Report - SUCCESS"
        echo "======================================="
        echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Sync Period: Last $SYNC_DAYS days"
        echo ""
        echo "Summary:"
        echo "$SUMMARY"
        echo ""
        echo "Full log: $LOG_FILE"
    } > "$REPORT_FILE"
    
    # Send success email (using mail command if available)
    if command -v mail &> /dev/null; then
        mail -s "✅ FibreFlow Meeting Sync - SUCCESS - $(date +%Y-%m-%d)" admin@velocityfibre.com < "$REPORT_FILE"
    fi
    
    # Also log to syslog if available
    if command -v logger &> /dev/null; then
        logger -t "fibreflow-sync" "Meeting sync completed successfully. $SUMMARY"
    fi
else
    log "❌ Meeting sync failed with exit code: $SYNC_EXIT_CODE"
    
    # Extract error from log
    ERROR_DETAILS=$(tail -50 "$LOG_FILE" | grep -E "(Error|error|Failed|failed|Exception)" | tail -10)
    
    # Create error report
    ERROR_REPORT_FILE="$LOG_DIR/error-report-$(date +%Y-%m-%d).txt"
    {
        echo "FibreFlow Meeting Sync Report - FAILED"
        echo "======================================="
        echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Exit Code: $SYNC_EXIT_CODE"
        echo "Sync Period: Last $SYNC_DAYS days"
        echo ""
        echo "Error Details:"
        echo "$ERROR_DETAILS"
        echo ""
        echo "Last 50 lines of log:"
        echo "--------------------"
        tail -50 "$LOG_FILE"
    } > "$ERROR_REPORT_FILE"
    
    # Send failure email with high priority
    if command -v mail &> /dev/null; then
        mail -s "❌ FibreFlow Meeting Sync - FAILED - $(date +%Y-%m-%d)" admin@velocityfibre.com < "$ERROR_REPORT_FILE"
    fi
    
    # Also log to syslog if available
    if command -v logger &> /dev/null; then
        logger -t "fibreflow-sync" -p user.err "Meeting sync FAILED with exit code $SYNC_EXIT_CODE"
    fi
fi

# Clean up old logs (keep last 30 days)
log "Cleaning up old logs..."
find "$LOG_DIR" -name "sync-*.log" -type f -mtime +30 -delete
find "$LOG_DIR" -name "report-*.txt" -type f -mtime +30 -delete
find "$LOG_DIR" -name "error-report-*.txt" -type f -mtime +30 -delete

log "Daily meeting sync script finished"
log "========================================="

exit $SYNC_EXIT_CODE