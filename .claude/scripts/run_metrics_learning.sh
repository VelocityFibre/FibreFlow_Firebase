#!/bin/bash
# Run Metrics Learning Analysis
# Can be triggered manually or via cron

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
LEARNING_LOG="$LOG_DIR/learning_runs.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log the run
echo "===========================================" >> "$LEARNING_LOG"
echo "Running metrics learning analysis at $(date)" >> "$LEARNING_LOG"
echo "===========================================" >> "$LEARNING_LOG"

# Run the analysis
cd "$SCRIPT_DIR/.." || exit 1
python3 scripts/process_metrics_to_learnings.py 2>&1 | tee -a "$LEARNING_LOG"

# Integrate learnings with context manager
echo "" >> "$LEARNING_LOG"
echo "Integrating learnings with context manager..." >> "$LEARNING_LOG"
python3 scripts/integrate_with_context.py 2>&1 | tee -a "$LEARNING_LOG"

# Show summary
echo "" >> "$LEARNING_LOG"
echo "Analysis and integration complete at $(date)" >> "$LEARNING_LOG"

# Optional: Send notification or email with results
# You can add notification logic here

# Show recent learnings count
if [ -f "$LOG_DIR/extracted_learnings.json" ]; then
    LEARNINGS_COUNT=$(python3 -c "import json; data=json.load(open('$LOG_DIR/extracted_learnings.json')); print(data['summary']['total'])")
    echo "Total learnings extracted: $LEARNINGS_COUNT" >> "$LEARNING_LOG"
fi

echo "" >> "$LEARNING_LOG"

# For cron usage, you can add this line to crontab:
# 0 */6 * * * /path/to/FibreFlow/.claude/scripts/run_metrics_learning.sh
# This would run every 6 hours